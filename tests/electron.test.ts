import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { BrowserWindow, Session } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { developmentUrl, productionEntryUrl, rendererRoot, resolveRendererRequest } from '../electron/paths';
import { configureSessionSecurity, configureWindowSecurity, isAllowedNavigation } from '../electron/security';

const root = path.resolve(import.meta.dirname, '..');

describe('Electron production paths', () => {
  it('resolves the packaged renderer and rejects traversal or foreign origins', () => {
    const dist = rendererRoot(root);
    expect(resolveRendererRequest(dist, productionEntryUrl())).toBe(path.join(dist, 'index.html'));
    expect(resolveRendererRequest(dist, 'app://powder-idle/assets/game.js')).toBe(path.join(dist, 'assets/game.js'));
    expect(resolveRendererRequest(dist, 'app://powder-idle/%2e%2e/package.json')).toBeNull();
    expect(resolveRendererRequest(dist, 'https://example.com/index.html')).toBeNull();
  });

  it('uses a development URL only when explicitly configured on loopback', () => {
    expect(developmentUrl({})).toBeNull();
    expect(developmentUrl({ POWDER_IDLE_DEV_URL: 'https://example.com' })).toBeNull();
    expect(developmentUrl({ POWDER_IDLE_DEV_URL: 'http://127.0.0.1:5173' })).toBe('http://127.0.0.1:5173/');
  });
});

describe('Electron security policy', () => {
  it('allows only application navigation in production', () => {
    expect(isAllowedNavigation('app://powder-idle/index.html', null)).toBe(true);
    expect(isAllowedNavigation('https://example.com', null)).toBe(false);
    expect(isAllowedNavigation('file:///tmp/index.html', null)).toBe(false);
  });

  it('denies popup creation and prevents outside navigation', () => {
    let openHandler: (() => { action: string }) | undefined;
    let navigateHandler: ((event: { preventDefault(): void }, target: string) => void) | undefined;
    const preventDefault = vi.fn();
    const fakeWindow = { webContents: {
      setWindowOpenHandler: vi.fn((handler) => { openHandler = handler; }),
      on: vi.fn((event, handler) => { if (event === 'will-navigate') navigateHandler = handler; })
    }} as unknown as BrowserWindow;
    configureWindowSecurity(fakeWindow, null);
    expect(openHandler?.()).toEqual({ action: 'deny' });
    navigateHandler?.({ preventDefault }, 'https://example.com');
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('denies permission requests and checks by default', () => {
    const permissionCallback = vi.fn();
    let checkHandler: (() => boolean) | undefined;
    const fakeSession = {
      setPermissionRequestHandler: vi.fn((handler) => handler({}, 'camera', permissionCallback)),
      setPermissionCheckHandler: vi.fn((handler) => { checkHandler = handler; }),
      webRequest: { onBeforeRequest: vi.fn(), onHeadersReceived: vi.fn() }
    } as unknown as Session;
    configureSessionSecurity(fakeSession, 'http://127.0.0.1:5173');
    expect(permissionCallback).toHaveBeenCalledWith(false);
    expect(checkHandler?.()).toBe(false);
  });
});

describe('packaged renderer contract', () => {
  it('has no remote runtime dependencies and bundles p5 locally', async () => {
    const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('cdnjs');
    const files = await readdir(path.join(root, 'dist/assets'));
    const scripts = await Promise.all(files.filter((file) => file.endsWith('.js')).map((file) => readFile(path.join(root, 'dist/assets', file), 'utf8')));
    expect(scripts.some((script) => script.includes('2.3.1') && script.includes('p5.js'))).toBe(true);
  });

  it.each(['powders.json', 'machines.json', 'upgrades.json', 'progression.json', 'stages.json'])('packages data/%s', async (file) => {
    expect((await stat(path.join(root, 'dist/data', file))).size).toBeGreaterThan(0);
  });

  it('packages the local Cinzel font', async () => {
    const files = await readdir(path.join(root, 'dist/assets'));
    expect(files.some((file) => file.startsWith('Cinzel-') && file.endsWith('.ttf'))).toBe(true);
  });

  it('references existing platform icon files in builder configuration', async () => {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as { build: { win: { icon: string }; mac: { icon: string }; linux: { icon: string } } };
    for (const icon of [pkg.build.win.icon, pkg.build.mac.icon, pkg.build.linux.icon]) expect((await stat(path.join(root, icon))).size).toBeGreaterThan(0);
  });
});
