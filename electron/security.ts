import type { BrowserWindow, Session } from 'electron';
import { APP_ORIGIN } from './paths.js';

export function isAllowedNavigation(target: string, developmentOrigin: string | null): boolean {
  try {
    const url = new URL(target);
    if (url.protocol === 'app:' && url.hostname === new URL(APP_ORIGIN).hostname) return true;
    return developmentOrigin !== null && url.origin === new URL(developmentOrigin).origin;
  } catch { return false; }
}

export function configureWindowSecurity(window: BrowserWindow, developmentOrigin: string | null): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => {
    if (!isAllowedNavigation(target, developmentOrigin)) event.preventDefault();
  });
}

export function configureSessionSecurity(session: Session, developmentOrigin: string | null): void {
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.setPermissionCheckHandler(() => false);
  if (developmentOrigin) return;
  session.webRequest.onBeforeRequest((details, callback) => {
    const allowed = details.url.startsWith(`${APP_ORIGIN}/`) || details.url.startsWith('data:');
    callback({ cancel: !allowed });
  });
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"
      ]
    }});
  });
}
