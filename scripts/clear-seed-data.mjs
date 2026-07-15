/**
 * Elimina todos los datos de demostración (seed).
 * NO toca usuarios / profiles.
 *
 * Uso:
 *   npm run seed:clear
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_MARKERS = ['seed-demo-v2', 'seed-demo'];

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

async function deleteByNotes(table, notes) {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('notes', notes);

  const { error } = await supabase.from(table).delete().eq('notes', notes);
  if (error && !error.message.includes('does not exist')) {
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function deleteDepositsLike(prefix) {
  const { data, error: selectError } = await supabase
    .from('worker_deposits')
    .select('id')
    .like('notes', `${prefix}%`);

  if (selectError) {
    if (selectError.message.includes('does not exist')) return 0;
    throw new Error(`worker_deposits: ${selectError.message}`);
  }

  if (!data?.length) return 0;

  const { error } = await supabase
    .from('worker_deposits')
    .delete()
    .like('notes', `${prefix}%`);

  if (error) throw new Error(`worker_deposits: ${error.message}`);
  return data.length;
}

async function main() {
  console.log('🧹 Eliminando datos de demostración...\n');

  let hourly = 0;
  let monthly = 0;
  let deposits = 0;

  for (const marker of SEED_MARKERS) {
    hourly += await deleteByNotes('parking_entries', marker);
    monthly += await deleteByNotes('monthly_parking', marker);
    deposits += await deleteDepositsLike(marker);
  }

  console.log(`   parking_entries:   ${hourly} eliminadas`);
  console.log(`   monthly_parking:   ${monthly} eliminados`);
  console.log(`   worker_deposits:   ${deposits} eliminados`);
  console.log('\n✅ Datos de prueba borrados. Usuarios y tarifas no se modificaron.');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
