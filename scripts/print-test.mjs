/**
 * Prueba de impresión directa (sin abrir la app).
 * Uso: npm run print:test
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildLabelEscPos } from './build-label-escpos.mjs';
import { buildLabelTsplAuto } from './build-label-tspl.mjs';
import { sendToComPort } from './com-print.mjs';
import { sendRawToPrinter } from './win-raw-print.mjs';
import { sendGdiToPrinter } from './win-gdi-print.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  if (!existsSync(envPath)) return;
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

const comPort = process.env.PRINT_COM_PORT?.trim();
const baudRate = Number(process.env.PRINT_BAUD_RATE ?? 9600);
const printerName = process.env.PRINTER_NAME?.trim();
const mode = (process.env.PRINT_MODE ?? 'gdi').trim().toLowerCase();
const via = (process.env.PRINT_VIA ?? (printerName ? 'windows' : 'com')).trim().toLowerCase();

if (mode !== 'gdi' && via === 'com' && !comPort) {
  console.error('Falta PRINT_COM_PORT en .env.local');
  process.exit(1);
}
if ((mode === 'gdi' || via === 'windows') && !printerName) {
  console.error('Falta PRINTER_NAME en .env.local');
  process.exit(1);
}

const now = new Date();
const date = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(now);
const time = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(now);

const vehicle = process.env.PRINT_TEST_VEHICLE?.trim() || 'Motocicleta';

if (mode === 'gdi') {
  console.log(`Imprimiendo GDI en: ${printerName} (${vehicle})`);
  await sendGdiToPrinter(printerName, {
    plate: 'PRUEBA01',
    date,
    time,
    vehicle,
  });
} else {
  const buffer =
    mode === 'escpos'
      ? buildLabelEscPos({ plate: 'PRUEBA01', date, time, vehicleLabel: vehicle })
      : buildLabelTsplAuto({ plate: 'PRUEBA01', date, time, vehicleLabel: vehicle });

  if (via === 'com') {
    console.log(`Imprimiendo por ${comPort} @ ${baudRate} (${mode.toUpperCase()})`);
    await sendToComPort(comPort, baudRate, buffer);
  } else {
    console.log(`Imprimiendo en: ${printerName} (${mode.toUpperCase()})`);
    await sendRawToPrinter(printerName, buffer);
  }
}

console.log('Etiqueta enviada. Revisa la impresora.');
