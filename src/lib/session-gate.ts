/** Marca de sesión activa en esta pestaña del navegador (no sobrevive al cerrar el navegador). */
export const APP_SESSION_KEY = 'parqueo-tab-session';

export function markAppSessionActive() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(APP_SESSION_KEY, '1');
}

export function clearAppSessionMark() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(APP_SESSION_KEY);
}

export function hasAppSessionMark(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(APP_SESSION_KEY) === '1';
}
