import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/database';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateUserBody {
  full_name?: string;
  role?: UserRole;
  password?: string;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await verifyAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  let body: UpdateUserBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { full_name, role, password } = body;

  if (id === auth.user.id && role && role !== 'admin') {
    return NextResponse.json(
      { error: 'No puedes quitarte el rol de administrador' },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();

    const authUpdates: { user_metadata?: Record<string, string>; password?: string } = {};
    if (full_name?.trim()) authUpdates.user_metadata = { full_name: full_name.trim() };
    if (role) authUpdates.user_metadata = { ...authUpdates.user_metadata, role };
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }
      authUpdates.password = password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error } = await admin.auth.admin.updateUserById(id, authUpdates);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const profileUpdates: { full_name?: string; role?: UserRole } = {};
    if (full_name?.trim()) profileUpdates.full_name = full_name.trim();
    if (role) profileUpdates.role = role;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await admin.from('profiles').update(profileUpdates).eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await verifyAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta' },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
