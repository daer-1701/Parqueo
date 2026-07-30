/**
 * Limpia TODOS los datos operativos para entrega al cliente.
 * Conserva: usuarios (auth.users + profiles) y tarifas (pricing_config).
 *
 * Uso:
 *   npm run data:clean
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
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
)?.trim();

if (!url || !serviceKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

/** Borra todas las filas (Supabase exige filtro; neq id vacío borra todo). */
async function deleteAll(table) {
  const before = await countRows(table);
  if (before === 0) return 0;

  const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`${table}: ${error.message}`);
  return before;
}

async function main() {
  console.log('🧹 Limpiando datos operativos (se conservan usuarios y tarifas)...\n');

  const usersBefore = await countRows('profiles');
  const pricingBefore = await countRows('pricing_config');

  const deposits = await deleteAll('worker_deposits');
  const entries = await deleteAll('parking_entries');
  const monthly = await deleteAll('monthly_parking');

  const { error: unlockError } = await supabase
    .from('profiles')
    .update({
      is_locked: false,
      failed_login_attempts: 0,
      locked_at: null,
    })
    .or('is_locked.eq.true,failed_login_attempts.gt.0,locked_at.not.is.null');

  if (unlockError && !unlockError.message.includes('column')) {
    console.warn('⚠️  No se pudieron resetear bloqueos de perfil:', unlockError.message);
  }

  const usersAfter = await countRows('profiles');
  const pricingAfter = await countRows('pricing_config');

  console.log(`   worker_deposits:   ${deposits} eliminados`);
  console.log(`   parking_entries:   ${entries} eliminadas`);
  console.log(`   monthly_parking:   ${monthly} eliminados`);
  console.log(`   profiles:          ${usersAfter} (antes ${usersBefore}) — intactos`);
  console.log(`   pricing_config:    ${pricingAfter} (antes ${pricingBefore}) — intactas`);
  console.log('\n✅ Base lista para entrega al cliente.');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
