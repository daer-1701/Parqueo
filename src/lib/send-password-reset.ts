import { getPasswordResetRedirectUrl, getSiteUrl } from '@/lib/auth-urls';
import { sendMail } from '@/lib/mail';
import { createAdminClient } from '@/lib/supabase/admin';

function buildResetEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0">
        <tr><td>
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase">ParqueoSys</p>
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">Restablecer contraseña</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#334155">
            Recibimos una solicitud para cambiar tu contraseña. Pulsa el botón para crear una nueva.
          </p>
          <p style="margin:0 0 24px;text-align:center">
            <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:700">
              Crear nueva contraseña
            </a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#64748b">
            El enlace caduca en aproximadamente 1 hora. Si no pediste este cambio, ignora este correo.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all">
            Si el botón no funciona, copia este enlace:<br>${resetUrl}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildResetEmailText(resetUrl: string): string {
  return [
    'ParqueoSys — Restablecer contraseña',
    '',
    'Recibimos una solicitud para cambiar tu contraseña.',
    'Abre este enlace para crear una nueva (válido ~1 hora):',
    resetUrl,
    '',
    'Si no pediste este cambio, ignora este correo.',
  ].join('\n');
}

/**
 * Genera enlace de recuperación en Supabase y lo envía por SMTP
 * (Gmail / contraseña de aplicación).
 */
export async function sendPasswordResetEmail(
  email: string,
  request?: Request
): Promise<void> {
  const admin = createAdminClient();
  const redirectTo = getPasswordResetRedirectUrl(request);
  const siteUrl = getSiteUrl(request);

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error) {
    throw new Error(error.message);
  }

  const hashedToken = data.properties?.hashed_token;
  const actionLink = data.properties?.action_link;

  let resetUrl: string;
  if (hashedToken) {
    const next = encodeURIComponent('/auth/reset-password');
    resetUrl = `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${next}`;
  } else if (actionLink) {
    resetUrl = actionLink;
  } else {
    throw new Error('Supabase no devolvió enlace de recuperación');
  }

  await sendMail({
    to: email,
    subject: 'Restablecer contraseña — ParqueoSys',
    html: buildResetEmailHtml(resetUrl),
    text: buildResetEmailText(resetUrl),
  });
}
