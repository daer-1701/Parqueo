import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/database';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await verifyAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const admin = createAdminClient();

    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        admin.auth.admin.listUsers({ perPage: 100 }),
        admin.from('profiles').select('*').order('created_at', { ascending: false }),
      ]);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const users = authData.users.map((u) => {
      const profile = profiles?.find((p) => p.id === u.id);
      return {
        id: u.id,
        email: u.email ?? '',
        full_name: profile?.full_name ?? u.user_metadata?.full_name ?? u.email ?? '',
        role: (profile?.role ?? u.user_metadata?.role ?? 'worker') as UserRole,
        created_at: profile?.created_at ?? u.created_at,
        last_sign_in: u.last_sign_in_at,
        is_locked: profile?.is_locked ?? false,
        failed_login_attempts: profile?.failed_login_attempts ?? 0,
        locked_at: profile?.locked_at ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface CreateUserBody {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export async function POST(request: Request) {
  const auth = await verifyAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: CreateUserBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { email, password, full_name, role } = body;

  if (!email?.trim() || !password || !full_name?.trim()) {
    return NextResponse.json(
      { error: 'Email, contraseña y nombre son obligatorios' },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres' },
      { status: 400 }
    );
  }

  if (role !== 'admin' && role !== 'worker') {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), role },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Asegurar que el perfil tenga el rol correcto (por si el trigger falló)
    if (data.user) {
      await admin
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: full_name.trim(),
          role,
        });
    }

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        full_name: full_name.trim(),
        role,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
