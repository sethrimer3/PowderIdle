import path from 'node:path';

export const APP_ORIGIN = 'app://powder-idle';

export function rendererRoot(appPath: string): string {
  return path.resolve(appPath, 'dist');
}

export function productionEntryUrl(): string {
  return `${APP_ORIGIN}/index.html`;
}

export function resolveRendererRequest(root: string, requestUrl: string): string | null {
  if (/%2e/i.test(requestUrl) || /\\/.test(requestUrl)) return null;
  let url: URL;
  try { url = new URL(requestUrl); } catch { return null; }
  if (url.protocol !== 'app:' || url.hostname !== 'powder-idle') return null;
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes('\0')) return null;
  const segments = pathname.replaceAll('\\', '/').split('/');
  if (segments.some((segment) => segment === '..')) return null;
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, relative);
  return candidate === resolvedRoot || candidate.startsWith(`${resolvedRoot}${path.sep}`) ? candidate : null;
}

export function developmentUrl(environment: NodeJS.ProcessEnv): string | null {
  const value = environment.POWDER_IDLE_DEV_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
