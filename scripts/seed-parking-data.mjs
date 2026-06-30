/**
 * Inserta ~70 entradas de prueba en parking_entries.
 *
 * Uso:
 *   npm run seed:data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_NOTE = 'seed-demo';
const TOTAL_ENTRIES = 70;
const ACTIVE_COUNT = 5;

const VEHICLE_TYPES = ['car', 'car', 'car', 'motorcycle', 'motorcycle', 'truck'];
const PAYMENT_METHODS = ['cash', 'cash', 'cash', 'card', 'card', 'transfer'];
const DURATION_MINUTES = [8, 12, 25, 35, 48, 55, 62, 68, 75, 82, 95, 110, 125, 140, 165, 190, 220, 260, 300];

const PLATE_PREFIXES = [
  '1234ABC', '5678DEF', '9012GHI', '3456JKL', '7890MNO',
  '2345PQR', '6789STU', '1357VWX', '2468YZA', '3691BCD',
  '4826EFG', '5937HIJ', '6048KLM', '7159NOP', '8260QRS',
  '3784RBG', '4521LPT', '8890SCZ', '1122AAX', '3344BBY',
  '5566CCZ', '7788DDA', '9900EEB', '1212FFC', '3434GGD',
  '5656HHE', '7878IIF', '9090JJG', '1313KKH', '3535LLI',
  '5757MMJ', '7979NNA', '9191OOB', '1414PPA', '3636QQB',
  '5858RRC', '8080SSD', '0202TTE', '2424UUF', '4646VVG',
  '6868WWH', '9091XXI', '1213YYJ', '3435ZZK', '5658AAL',
  '7880BBM', '9102CCN', '1324DDO', '3546EEP', '5768FFQ',
  '7990GGR', '9112HHS', '1334IIT', '3556JJS', '5778KKT',
  '8000LLU', '9222MMV', '1444NNW', '3666OOX', '5888PPY',
  '8110QQZ', '9332RRA', '1554SSB', '3776TTC', '5998UUD',
  '8220VVE', '9442WWF', '1664XXG', '3886YYH', '5008ZZI',
];

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

function calculateAmount(minutes, pricing) {
  const { first_hour_rate, extra_hour_rate, grace_minutes } = pricing;

  if (minutes <= 0) return 0;
  if (minutes <= 60) return first_hour_rate;

  const billableExtraMinutes = minutes - 60 - grace_minutes;
  if (billableExtraMinutes <= 0) return first_hour_rate;

  const extraHours = Math.ceil(billableExtraMinutes / 60);
  return first_hour_rate + extraHours * extra_hour_rate;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function randomHourOffset() {
  const hour = 7 + Math.floor(Math.random() * 14);
  const minute = Math.floor(Math.random() * 60);
  return { hour, minute };
}

function setBoliviaTime(date, hour, minute) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
)?.trim();

if (!url || !serviceKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: workers, error: workerError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'worker')
    .limit(1);

  if (workerError || !workers?.length) {
    console.error('❌ No hay operador (worker). Ejecuta primero: npm run setup:users');
    process.exit(1);
  }

  const workerId = workers[0].id;

  const { data: pricingRows, error: pricingError } = await supabase
    .from('pricing_config')
    .select('*');

  if (pricingError || !pricingRows?.length) {
    console.error('❌ No hay tarifas en pricing_config. Ejecuta supabase/schema.sql');
    process.exit(1);
  }

  const pricingByType = Object.fromEntries(
    pricingRows.map((p) => [p.vehicle_type, p])
  );

  console.log('🧹 Eliminando datos de prueba anteriores...');
  await supabase.from('parking_entries').delete().eq('notes', SEED_NOTE);

  const now = new Date();
  const entries = [];

  for (let i = 0; i < TOTAL_ENTRIES; i++) {
    const isActive = i < ACTIVE_COUNT;
    const vehicleType = randomItem(VEHICLE_TYPES);
    const pricing = pricingByType[vehicleType] ?? pricingByType.car;
    const durationMin = randomItem(DURATION_MINUTES);

    let daysAgo;
    if (isActive) {
      daysAgo = 0;
    } else if (i < 25) {
      daysAgo = 0;
    } else if (i < 45) {
      daysAgo = Math.floor(Math.random() * 7);
    } else {
      daysAgo = 7 + Math.floor(Math.random() * 23);
    }

    const { hour, minute } = isActive
      ? { hour: now.getHours(), minute: Math.max(0, now.getMinutes() - (10 + i * 8)) }
      : randomHourOffset();

    const entryAt = setBoliviaTime(addDays(now, daysAgo), hour, minute);
    const exitAt = isActive ? null : addMinutes(entryAt, durationMin);
    const amount = isActive ? null : calculateAmount(durationMin, pricing);

    entries.push({
      plate: PLATE_PREFIXES[i % PLATE_PREFIXES.length],
      vehicle_type: vehicleType,
      status: isActive ? 'active' : 'completed',
      entry_at: entryAt.toISOString(),
      exit_at: exitAt?.toISOString() ?? null,
      amount,
      payment_method: isActive ? null : randomItem(PAYMENT_METHODS),
      notes: SEED_NOTE,
      worker_entry_id: workerId,
      worker_exit_id: isActive ? null : workerId,
    });
  }

  console.log(`📦 Insertando ${entries.length} entradas de prueba...`);

  const batchSize = 25;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const { error } = await supabase.from('parking_entries').insert(batch);
    if (error) {
      console.error('❌ Error al insertar:', error.message);
      process.exit(1);
    }
  }

  const completed = entries.filter((e) => e.status === 'completed').length;
  const active = entries.filter((e) => e.status === 'active').length;
  const totalRevenue = entries.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  console.log('\n✅ Datos de prueba creados');
  console.log(`   Completadas: ${completed}`);
  console.log(`   Activas:     ${active}`);
  console.log(`   Ingresos:    Bs. ${totalRevenue.toFixed(2)}`);
  console.log('\n💡 Para borrarlos: npm run seed:data (los reemplaza automáticamente)');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
