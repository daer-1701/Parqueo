import { isSmtpConfigured } from '@/lib/mail';
import { checkRateLimit, clientIpFromRequest } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/send-password-reset';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const SUCCESS_MESSAGE =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos. Revisa también la carpeta de spam.';

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const ipLimit = checkRateLimit(`forgot:ip:${ip}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Espera ${ipLimit.retryAfterSec}s.` },
      {
        status: 429,
        headers: { 'Retry-After': String(ipLimit.retryAfterSec) },
      }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ingresa un correo válido' }, { status: 400 });
  }

  const emailLimit = checkRateLimit(`forgot:email:${email}`, 3, 15 * 60 * 1000);
  if (!emailLimit.ok) {
    // Respuesta genérica: no filtrar existencia
    return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
  }

  if (!isSmtpConfigured()) {
    console.error('[forgot-password] SMTP no configurado (SMTP_USER / SMTP_PASS)');
    return NextResponse.json(
      {
        error:
          'El envío de correo no está configurado. Contacta al administrador.',
      },
      { status: 503 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const authUser = listData.users.find((u) => u.email?.toLowerCase() === email);

    if (authUser?.email) {
      await sendPasswordResetEmail(authUser.email);
    }

    return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
  }
}
