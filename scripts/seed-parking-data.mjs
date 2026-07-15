/**
 * Llena la base con datos de demostración completos.
 * Tablas: pricing_config, parking_entries, monthly_parking, worker_deposits
 * NO toca usuarios / profiles.
 *
 * Placas formato boliviano: 4578RBS (4 dígitos + 3 letras)
 * Solo autos y motos.
 *
 * Uso:
 *   npm run seed:data
 */

import { createClient } from '@supabase/supabase-js';
import { addDays, addMonths, endOfWeek, startOfWeek, subDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TZ = 'America/La_Paz';
const SEED_NOTE = 'seed-demo-v2';

const TOTAL_HOURLY = 650;
const ACTIVE_HOURLY = 12;
const CANCELLED_HOURLY = 8;
const TOTAL_MONTHLY = 55;
const ACTIVE_MONTHLY = 18;
const DEPOSIT_WEEKS = 10;

const CUSTOMER_NAMES = [
  'Carlos Mendoza', 'María López', 'Juan Pérez', 'Ana Torres', 'Luis Vargas',
  'Rosa Quispe', 'Pedro Mamani', 'Elena Flores', 'Miguel Rojas', 'Sofía Cruz',
  'Diego Aguilar', 'Carmen Vega', 'Fernando Soto', 'Patricia Núñez', 'Ricardo Paz',
  'Gabriela Ríos', 'Héctor Salazar', 'Lucía Morales', 'Oscar Campos', 'Valeria Ortiz',
  'Jorge Herrera', 'Daniela Peña', 'Andrés Guzmán', 'Claudia Reyes', 'Roberto Silva',
  'Natalia Fuentes', 'Eduardo Castro', 'Mónica Delgado', 'Sergio Romero', 'Laura Jiménez',
];

const VEHICLE_TYPES = ['car', 'car', 'car', 'car', 'motorcycle', 'motorcycle'];
const DURATION_MINUTES = [
  5, 8, 12, 18, 22, 28, 35, 42, 48, 55, 62, 68, 75, 82, 90, 95, 105, 115, 125,
  135, 150, 165, 180, 200, 220, 240, 270, 300, 360, 420, 480,
];

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

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Placa boliviana: 4578RBS */
function generatePlate(index) {
  const digits = String(1000 + ((index * 137 + 421) % 9000));
  const alpha = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const a = alpha[index % alpha.length];
  const b = alpha[(index * 3 + 5) % alpha.length];
  const c = alpha[(index * 7 + 11) % alpha.length];
  return `${digits}${a}${b}${c}`;
}

function calculateAmount(minutes, pricing) {
  const { first_hour_rate, extra_hour_rate, grace_minutes } = pricing;
  if (minutes <= 0) return 0;
  if (minutes <= 60) return Number(first_hour_rate);
  const billableExtraMinutes = minutes - 60 - grace_minutes;
  if (billableExtraMinutes <= 0) return Number(first_hour_rate);
  const extraHours = Math.ceil(billableExtraMinutes / 60);
  return Number(first_hour_rate) + extraHours * Number(extra_hour_rate);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function boliviaDate(daysAgo, hour, minute) {
  const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
  const zoned = fromZonedTime(`${today}T${pad2(hour)}:${pad2(minute)}:00`, TZ);
  return addDays(zoned, -daysAgo);
}

function countPeriodMonths(periodStart, periodEnd) {
  const start = new Date(`${periodStart}T12:00:00`);
  const end = addDays(new Date(`${periodEnd}T12:00:00`), 1);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months);
}

function subscriptionPeriod(startDate, months) {
  const start = fromZonedTime(`${startDate}T12:00:00`, TZ);
  const end = subDays(addMonths(start, months), 1);
  return {
    period_start: formatInTimeZone(start, TZ, 'yyyy-MM-dd'),
    period_end: formatInTimeZone(end, TZ, 'yyyy-MM-dd'),
  };
}

function getWeekBounds(date) {
  const zoned = toZonedTime(date, TZ);
  const weekStartLocal = startOfWeek(zoned, { weekStartsOn: 1 });
  const weekEndLocal = endOfWeek(zoned, { weekStartsOn: 1 });
  const start = fromZonedTime(weekStartLocal, TZ);
  const end = fromZonedTime(weekEndLocal, TZ);
  return {
    weekStart: formatInTimeZone(start, TZ, 'yyyy-MM-dd'),
    weekEnd: formatInTimeZone(end, TZ, 'yyyy-MM-dd'),
  };
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

async function insertBatches(table, rows, batchSize = 80) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Buscando operadores...');
  const { data: workers, error: workerError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'worker');

  if (workerError || !workers?.length) {
    console.error('❌ No hay operadores. Ejecuta primero: npm run setup:users');
    process.exit(1);
  }

  console.log(`   ${workers.length} operador(es) encontrado(s)`);

  console.log('💰 Actualizando tarifas (solo auto y moto)...');
  await supabase.from('pricing_config').upsert(
    [
      {
        vehicle_type: 'car',
        first_hour_rate: 7.0,
        extra_hour_rate: 1.0,
        grace_minutes: 15,
        monthly_rate: 350.0,
        updated_at: new Date().toISOString(),
      },
      {
        vehicle_type: 'motorcycle',
        first_hour_rate: 5.0,
        extra_hour_rate: 1.0,
        grace_minutes: 10,
        monthly_rate: 150.0,
        updated_at: new Date().toISOString(),
      },
      {
        vehicle_type: 'truck',
        first_hour_rate: 7.0,
        extra_hour_rate: 1.0,
        grace_minutes: 15,
        monthly_rate: 450.0,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'vehicle_type' }
  );

  const { data: pricingRows } = await supabase.from('pricing_config').select('*');
  const pricingByType = Object.fromEntries(
    (pricingRows ?? []).map((p) => [p.vehicle_type, p])
  );

  console.log('🧹 Limpiando datos de prueba anteriores...');
  await supabase.from('worker_deposits').delete().like('notes', `${SEED_NOTE}%`);
  await supabase.from('monthly_parking').delete().eq('notes', SEED_NOTE);
  await supabase.from('parking_entries').delete().eq('notes', SEED_NOTE);

  const platePool = Array.from({ length: 280 }, (_, i) => generatePlate(i + 1));
  const monthlyPlates = platePool.slice(0, TOTAL_MONTHLY);
  const activeMonthlyPlates = new Set(monthlyPlates.slice(0, ACTIVE_MONTHLY));

  // ── Parqueo mensual ──────────────────────────────────────────
  console.log(`📅 Generando ${TOTAL_MONTHLY} planes mensuales...`);
  const monthlyRows = [];
  const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');

  for (let i = 0; i < TOTAL_MONTHLY; i++) {
    const vehicleType = i % 3 === 0 ? 'motorcycle' : 'car';
    const durationMonths = randomItem([1, 1, 2, 3, 6, 12]);
    let status = 'active';
    let daysAgoStart = randomBetween(0, 20);

    if (i >= ACTIVE_MONTHLY) {
      status = i % 4 === 0 ? 'cancelled' : 'expired';
      daysAgoStart = randomBetween(30, 120);
    }

    const startDate = formatInTimeZone(
      addDays(fromZonedTime(`${today}T12:00:00`, TZ), -daysAgoStart),
      TZ,
      'yyyy-MM-dd'
    );
    const { period_start, period_end } = subscriptionPeriod(startDate, durationMonths);
    const monthlyAmount =
      vehicleType === 'motorcycle'
        ? randomBetween(80, 180)
        : randomBetween(220, 550);

    const isPaid = status !== 'cancelled' || i % 2 === 0;
    const paidAt = isPaid
      ? fromZonedTime(
          `${period_start}T${pad2(randomBetween(8, 18))}:${pad2(randomBetween(0, 59))}:00`,
          TZ
        ).toISOString()
      : null;

    monthlyRows.push({
      plate: monthlyPlates[i],
      vehicle_type: vehicleType,
      monthly_amount: monthlyAmount,
      period_start,
      period_end,
      status,
      customer_name: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
      notes: SEED_NOTE,
      worker_id: randomItem(workers).id,
      paid_at: paidAt,
      payment_method: paidAt ? 'cash' : null,
    });
  }

  await insertBatches('monthly_parking', monthlyRows);

  // ── Parqueo por horas ────────────────────────────────────────
  console.log(`🚗 Generando ${TOTAL_HOURLY} entradas por horas...`);
  const hourlyRows = [];
  const now = new Date();

  for (let i = 0; i < TOTAL_HOURLY; i++) {
    const isActive = i < ACTIVE_HOURLY;
    const isCancelled = !isActive && i < ACTIVE_HOURLY + CANCELLED_HOURLY;
    const vehicleType = randomItem(VEHICLE_TYPES);
    const pricing = pricingByType[vehicleType] ?? pricingByType.car;
    const worker = randomItem(workers);
    const plate = randomItem(platePool);

    let daysAgo;
    if (isActive) {
      daysAgo = 0;
    } else if (i < 120) {
      daysAgo = randomBetween(0, 6);
    } else if (i < 350) {
      daysAgo = randomBetween(7, 30);
    } else {
      daysAgo = randomBetween(31, 89);
    }

    const hour = isActive
      ? Math.max(7, now.getHours() - randomBetween(0, 3))
      : randomBetween(7, 21);
    const minute = randomBetween(0, 59);
    const entryAt = boliviaDate(daysAgo, hour, minute);

    let exitAt = null;
    let amount = null;
    let status = 'active';
    let paymentMethod = null;
    let exitWorker = null;

    if (!isActive) {
      if (isCancelled) {
        status = 'cancelled';
        exitAt = new Date(entryAt.getTime() + randomBetween(5, 20) * 60 * 1000);
        amount = null;
      } else {
        status = 'completed';
        const durationMin = randomItem(DURATION_MINUTES);
        exitAt = new Date(entryAt.getTime() + durationMin * 60 * 1000);
        const hasMonthly = activeMonthlyPlates.has(plate);
        amount = hasMonthly ? 0 : calculateAmount(durationMin, pricing);
        paymentMethod = amount === 0 ? null : 'cash';
        exitWorker = worker.id;
      }
    }

    hourlyRows.push({
      plate,
      vehicle_type: vehicleType,
      status,
      entry_at: entryAt.toISOString(),
      exit_at: exitAt?.toISOString() ?? null,
      amount,
      payment_method: paymentMethod,
      notes: SEED_NOTE,
      worker_entry_id: worker.id,
      worker_exit_id: exitWorker,
    });
  }

  await insertBatches('parking_entries', hourlyRows);

  // ── Depósitos semanales ──────────────────────────────────────
  console.log(`🏦 Generando depósitos de las últimas ${DEPOSIT_WEEKS} semanas...`);
  const depositRows = [];

  for (let w = 1; w <= DEPOSIT_WEEKS; w++) {
    const weekRef = addDays(now, -w * 7);
    const { weekStart, weekEnd } = getWeekBounds(weekRef);
    const weekStartIso = fromZonedTime(`${weekStart}T00:00:00`, TZ).toISOString();
    const weekEndIso = fromZonedTime(`${weekEnd}T23:59:59`, TZ).toISOString();

    for (const worker of workers) {
      const { data: hourly } = await supabase
        .from('parking_entries')
        .select('amount')
        .eq('status', 'completed')
        .eq('worker_exit_id', worker.id)
        .eq('notes', SEED_NOTE)
        .gt('amount', 0)
        .gte('exit_at', weekStartIso)
        .lte('exit_at', weekEndIso);

      const { data: monthly } = await supabase
        .from('monthly_parking')
        .select('monthly_amount, period_start, period_end, paid_at')
        .eq('worker_id', worker.id)
        .eq('notes', SEED_NOTE)
        .not('paid_at', 'is', null)
        .gte('paid_at', weekStartIso)
        .lte('paid_at', weekEndIso);

      const hourlyTotal = (hourly ?? []).reduce((s, r) => s + Number(r.amount), 0);
      let monthlyTotal = 0;
      for (const m of monthly ?? []) {
        monthlyTotal +=
          Number(m.monthly_amount) * countPeriodMonths(m.period_start, m.period_end);
      }

      const expected = Math.round((hourlyTotal + monthlyTotal) * 100) / 100;
      if (expected <= 0) continue;

      const variance = randomBetween(-5, 5) / 100;
      const deposited = Math.max(0, Math.round(expected * (1 + variance) * 100) / 100);

      const confirmDay = addDays(fromZonedTime(`${weekEnd}T12:00:00`, TZ), randomBetween(0, 2));
      confirmDay.setUTCHours(randomBetween(13, 23), randomBetween(0, 59), 0, 0);

      depositRows.push({
        worker_id: worker.id,
        week_start: weekStart,
        week_end: weekEnd,
        expected_amount: expected,
        deposited_amount: deposited,
        hourly_total: Math.round(hourlyTotal * 100) / 100,
        monthly_total: Math.round(monthlyTotal * 100) / 100,
        hourly_count: hourly?.length ?? 0,
        monthly_count: monthly?.length ?? 0,
        notes: `${SEED_NOTE} - depósito semana ${weekStart}`,
        confirmed_at: confirmDay.toISOString(),
      });
    }
  }

  if (depositRows.length > 0) {
    await insertBatches('worker_deposits', depositRows, 50);
  } else {
    console.log('   (sin depósitos — ¿existe la tabla worker_deposits?)');
  }

  // ── Resumen ──────────────────────────────────────────────────
  const completed = hourlyRows.filter((e) => e.status === 'completed').length;
  const active = hourlyRows.filter((e) => e.status === 'active').length;
  const cancelled = hourlyRows.filter((e) => e.status === 'cancelled').length;
  const revenue = hourlyRows.reduce((s, e) => s + (e.amount ?? 0), 0);
  const monthlyRevenue = monthlyRows
    .filter((m) => m.paid_at)
    .reduce(
      (s, m) =>
        s + m.monthly_amount * countPeriodMonths(m.period_start, m.period_end),
      0
    );

  console.log('\n✅ Base de datos llena con datos de demostración\n');
  console.log('   Tarifas:        auto Bs 7 + Bs 1/hr | moto Bs 5 + Bs 1/hr');
  console.log(`   Por horas:      ${hourlyRows.length} (${active} activas, ${completed} completadas, ${cancelled} canceladas)`);
  console.log(`   Mensual:        ${monthlyRows.length} (${ACTIVE_MONTHLY} activos)`);
  console.log(`   Depósitos:      ${depositRows.length}`);
  console.log(`   Ingresos horas: Bs ${revenue.toFixed(2)}`);
  console.log(`   Ingresos mensual: Bs ${monthlyRevenue.toFixed(2)}`);
  console.log(`   Placas ejemplo: ${platePool.slice(0, 5).join(', ')}...`);
  console.log('\n💡 Para regenerar: npm run seed:data');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
