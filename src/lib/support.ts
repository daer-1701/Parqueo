export const SUPPORT_WHATSAPP_NUMBER = '59167458815';

export const SUPPORT_WHATSAPP_DISPLAY = '+591 67458815';

export function getSupportWhatsAppUrl(message?: string): string {
  const text =
    message ??
    'Hola, necesito ayuda con ParqueoSys (acceso, contraseña o soporte técnico).';
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function getPasswordRecoveryWhatsAppUrl(email?: string): string {
  const correo = email?.trim() ? ` Mi correo es: ${email.trim()}.` : '';
  return getSupportWhatsAppUrl(
    `Hola, necesito recuperar mi contraseña de ParqueoSys.${correo} Gracias.`
  );
}

export const MAX_LOGIN_ATTEMPTS = 3;
