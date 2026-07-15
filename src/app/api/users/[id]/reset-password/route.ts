import { isSmtpConfigured } from '@/lib/mail';
import { sendPasswordResetEmail } from '@/lib/send-password-reset';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await verifyAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        error:
          'Configura SMTP_USER y SMTP_PASS (contraseña de aplicación) en .env.local',
      },
      { status: 503 }
    );
  }

  try {
    const admin = createAdminClient();

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(id);
    if (userError || !authUser.user?.email) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    await sendPasswordResetEmail(authUser.user.email, request);

    await admin
      .from('profiles')
      .update({
        is_locked: false,
        failed_login_attempts: 0,
        locked_at: null,
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: `Correo de recuperación enviado a ${authUser.user.email}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
