import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { app, BrowserWindow, dialog, Menu, protocol, session } from 'electron';
import { APP_ORIGIN, developmentUrl, productionEntryUrl, rendererRoot, resolveRendererRequest } from './paths.js';
import { configureSessionSecurity, configureWindowSecurity } from './security.js';

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

const devUrl = developmentUrl(process.env);
const smokeMode = process.env.POWDER_IDLE_SMOKE_TEST === '1';
const smokeTimeoutMs = 20_000;
let mainWindow: BrowserWindow | null = null;
let startupFailed = false;
let criticalRendererError: string | null = null;

if (devUrl) app.setPath('userData', path.join(app.getPath('appData'), 'Powder Idle Development'));

function mimeType(file: string): string {
  const extension = path.extname(file).toLowerCase();
  return ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' } as Record<string, string>)[extension] ?? 'application/octet-stream';
}

async function registerApplicationProtocol(): Promise<void> {
  const root = rendererRoot(app.getAppPath());
  await protocol.handle('app', async (request) => {
    const file = resolveRendererRequest(root, request.url);
    if (!file) return new Response('Not found', { status: 404 });
    try { return new Response(await readFile(file), { headers: { 'Content-Type': mimeType(file) } }); }
    catch { return new Response('Not found', { status: 404 }); }
  });
}

function showStartupFailure(message: string): void {
  startupFailed = true;
  console.error(`[Powder Idle] ${message}`);
  if (!smokeMode) dialog.showErrorBox('Powder Idle could not start', `${message}\n\nReinstall the application or run the build again.`);
  if (smokeMode) { app.exit(1); return; }
  void mainWindow?.loadURL(`data:text/html,${encodeURIComponent('<body style="background:#151319;color:#e6dfea;font-family:sans-serif;padding:2rem"><h1>Powder Idle could not start</h1><p>Reinstall the application or run the build again.</p></body>')}`);
}

async function runSmokeTest(window: BrowserWindow): Promise<void> {
  const timer = setTimeout(() => showStartupFailure('Smoke test timed out while waiting for game initialization.'), smokeTimeoutMs);
  try {
    const result = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      const check = () => {
        const api = window.__powderIdleDebug;
        if (api?.isInitialized()) {
          const canvas = document.querySelector('canvas');
          const state = api.snapshot();
          resolve({ canvas: !!canvas && canvas.width > 0 && canvas.height > 0, state });
        } else if (Date.now() > deadline) reject(new Error('Renderer initialization timeout'));
        else setTimeout(check, 50);
      }; check();
    })`, true) as { canvas: boolean; state: { fallbackUsed: boolean } };
    if (!result.canvas || result.state.fallbackUsed || criticalRendererError) throw new Error(criticalRendererError ?? 'Renderer canvas or packaged data validation failed');
    console.log('[Powder Idle] Smoke test passed.');
    clearTimeout(timer);
    app.exit(0);
  } catch (error) { clearTimeout(timer); showStartupFailure(`Smoke test failed: ${String(error)}`); }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200, height: 900, minWidth: 760, minHeight: 560, show: false,
    backgroundColor: '#151319', icon: path.join(app.getAppPath(), 'build/icons/icon-256.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, devTools: devUrl !== null }
  });
  configureWindowSecurity(mainWindow, devUrl);
  if (smokeMode) mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 3) criticalRendererError = `Critical renderer console error: ${message}`;
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => showStartupFailure(`Renderer stopped unexpectedly (${details.reason}).`));
  mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedUrl, isMainFrame) => {
    if (isMainFrame && code !== -3) showStartupFailure(`Failed to load ${validatedUrl}: ${description} (${code}).`);
  });
  mainWindow.once('ready-to-show', () => { if (!startupFailed && !smokeMode) mainWindow?.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });
  await mainWindow.loadURL(devUrl ?? productionEntryUrl());
  if (devUrl && !smokeMode) mainWindow.webContents.openDevTools({ mode: 'detach' });
  if (smokeMode) await runSmokeTest(mainWindow);
}

process.on('uncaughtException', (error) => showStartupFailure(`Main-process error: ${error.message}`));
process.on('unhandledRejection', (error) => showStartupFailure(`Unhandled main-process error: ${String(error)}`));

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    if (!devUrl) await registerApplicationProtocol();
    configureSessionSecurity(session.defaultSession, devUrl);
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    await createWindow();
  }).catch((error) => showStartupFailure(`Startup failed: ${String(error)}`));
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
