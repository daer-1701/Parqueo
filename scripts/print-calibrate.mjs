/**
 * Calibración: imprime borde + texto para ver si cae en una sola etiqueta.
 * Uso: npm run print:calibrate
 *
 * Ajusta en .env.local:
 *   LABEL_Y_SHIFT_DOTS=20   (bajar contenido; negativo = subir)
 *   LABEL_TSPL_VARIANT=40x30 | 30x40
 *   LABEL_GAP_MM=2
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildLabelTsplAuto } from './build-label-tspl.mjs';
import { sendToComPort } from './com-print.mjs';
import { sendRawToPrinter } from './win-raw-print.mjs';

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

process.env.LABEL_TSPL_DEBUG = 'true';

const comPort = process.env.PRINT_COM_PORT?.trim();
const baudRate = Number(process.env.PRINT_BAUD_RATE ?? 9600);
const printerName = process.env.PRINTER_NAME?.trim();
const via = (process.env.PRINT_VIA ?? 'com').trim().toLowerCase();
const yShift = process.env.LABEL_Y_SHIFT_DOTS ?? '0';
const size = `${process.env.LABEL_TSPL_WIDTH_MM ?? 40}x${process.env.LABEL_TSPL_HEIGHT_MM ?? 30}`;

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

const buffer = buildLabelTsplAuto({ plate: 'CALIB01', date, time });

console.log(`Calibración TSPL (${size} mm, Y_SHIFT=${yShift}, DEBUG=borde)`);

if (via === 'com' && comPort) {
  console.log(`Puerto: ${comPort} @ ${baudRate}`);
  await sendToComPort(comPort, baudRate, buffer);
} else if (printerName) {
  console.log(`Impresora: ${printerName}`);
  await sendRawToPrinter(printerName, buffer);
} else {
  console.error('Configura PRINT_COM_PORT o PRINTER_NAME en .env.local');
  process.exit(1);
}

console.log('Etiqueta de calibración enviada.');
console.log('Si el borde no coincide, ajusta LABEL_Y_SHIFT_DOTS o LABEL_TSPL_HEIGHT_MM.');
