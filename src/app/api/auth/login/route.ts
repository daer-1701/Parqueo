import { getDashboardPath } from '@/lib/auth';
import { MAX_LOGIN_ATTEMPTS } from '@/lib/support';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'credentials', message: 'Correo y contraseña son obligatorios' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: userLookup } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authUser = userLookup.users.find((u) => u.email?.toLowerCase() === email);

  let profile: { is_locked: boolean; failed_login_attempts: number } | null = null;

  if (authUser) {
    const { data } = await admin
      .from('profiles')
      .select('is_locked, failed_login_attempts')
      .eq('id', authUser.id)
      .single();
    profile = data;
  }

  if (profile?.is_locked) {
    return NextResponse.json(
      {
        error: 'blocked',
        message:
          'Cuenta bloqueada por intentos fallidos. Solo el administrador puede desbloquearla o enviar recuperación por correo.',
      },
      { status: 423 }
    );
  }

  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !data.user) {
    if (authUser) {
      const attempts = (profile?.failed_login_attempts ?? 0) + 1;
      const locked = attempts >= MAX_LOGIN_ATTEMPTS;

      await admin
        .from('profiles')
        .update({
          failed_login_attempts: attempts,
          is_locked: locked,
          locked_at: locked ? new Date().toISOString() : null,
        })
        .eq('id', authUser.id);

      if (locked) {
        return NextResponse.json(
          {
            error: 'blocked',
            message:
              'Cuenta bloqueada tras 3 intentos fallidos. Contacta al administrador.',
          },
          { status: 423 }
        );
      }

      const attemptsLeft = MAX_LOGIN_ATTEMPTS - attempts;
      return NextResponse.json(
        {
          error: 'credentials',
          attemptsLeft,
          message: `Credenciales incorrectas. Te quedan ${attemptsLeft} intento(s).`,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'credentials', message: 'Credenciales incorrectas' },
      { status: 401 }
    );
  }

  await admin
    .from('profiles')
    .update({
      failed_login_attempts: 0,
      is_locked: false,
      locked_at: null,
    })
    .eq('id', data.user.id);

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const destination = getDashboardPath(userProfile?.role);
  if (destination === '/login') {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: 'credentials',
        message: 'Tu cuenta no tiene un rol asignado. Contacta al administrador.',
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, role: userProfile?.role, destination });
}
