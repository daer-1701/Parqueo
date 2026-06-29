export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
}

export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    ''
  );
}

export function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim() ??
    ''
  );
}

export function assertSupabaseEnv() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error(
      'Faltan variables de Supabase en .env.local. Necesitas:\n' +
        '  NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
        '  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...\n' +
        '  (o NEXT_PUBLIC_SUPABASE_ANON_KEY=...)\n\n' +
        'Obtén las claves en: Supabase → Settings → API'
    );
  }

  return { url, key };
}
