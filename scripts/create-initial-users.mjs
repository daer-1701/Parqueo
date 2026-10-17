/**
 * Crea un admin y un operador en Supabase.
 *
 * En .env.local (no las subas al repositorio):
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SETUP_ADMIN_EMAIL, SETUP_ADMIN_PASSWORD
 *   SETUP_WORKER_EMAIL, SETUP_WORKER_PASSWORD
 *
 * Luego: npm run setup:users
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ No se encontró .env.local');
    process.exit(1);
  }
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`❌ Falta ${name} en .env.local`);
    process.exit(1);
  }
  return value;
}

const INITIAL_USERS = [
  {
    email: requiredEnv('SETUP_ADMIN_EMAIL'),
    password: requiredEnv('SETUP_ADMIN_PASSWORD'),
    full_name: process.env.SETUP_ADMIN_NAME?.trim() || 'Administrador',
    role: 'admin',
  },
  {
    email: requiredEnv('SETUP_WORKER_EMAIL'),
    password: requiredEnv('SETUP_WORKER_PASSWORD'),
    full_name: process.env.SETUP_WORKER_NAME?.trim() || 'Operador Parqueo',
    role: 'worker',
  },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY
)?.trim();

if (!url || url.includes('placeholder')) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local');
  process.exit(1);
}

if (!serviceKey) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local\n');
  console.error('   Obtén la clave en: Supabase → Settings → API → service_role');
  console.error('   Agrégala así en .env.local:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-clave-secreta...\n');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createOrUpdateUser({ email, password, full_name, role }) {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);

  if (found) {
    console.log(`⚠️  ${email} ya existe — actualizando perfil y contraseña...`);
    await supabase.auth.admin.updateUserById(found.id, {
      password,
      user_metadata: { full_name, role },
    });
    await supabase.from('profiles').upsert({ id: found.id, full_name, role });
    return found.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) {
    const msg = error.message || JSON.stringify(error);
    if (msg.includes('Database error') || msg === '{}') {
      throw new Error(
        `${email}: Error en la base de datos. Ejecuta supabase/fix-profile-trigger.sql en el SQL Editor de Supabase y vuelve a intentar.`
      );
    }
    throw new Error(`${email}: ${msg}`);
  }

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name,
      role,
    });
  }

  return data.user?.id;
}

console.log('🚗 Creando usuarios iniciales...\n');

for (const user of INITIAL_USERS) {
  try {
    await createOrUpdateUser(user);
    console.log(`✅ ${user.role.toUpperCase().padEnd(6)} → ${user.email}`);
  } catch (err) {
    console.error(`❌ Error con ${user.email}:`, err.message);
  }
}

console.log('\nListo. Esas contraseñas solo están en tu .env.local.');
