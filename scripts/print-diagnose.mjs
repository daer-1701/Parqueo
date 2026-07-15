/**
 * Diagnóstico de impresión TSPL — imprime 3 patrones simples.
 * Uso: node scripts/print-diagnose.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sendRawToPrinter } from './win-raw-print.mjs';
import { sendToComPort } from './com-print.mjs';

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

function job(lines) {
  return Buffer.from(lines.join('\r\n') + '\r\n', 'ascii');
}

const printerName = process.env.PRINTER_NAME?.trim() || 'LABEL';
const comPort = process.env.PRINT_COM_PORT?.trim();
const baud = Number(process.env.PRINT_BAUD_RATE ?? 9600);
const via = (process.env.PRINT_VIA ?? 'windows').trim().toLowerCase();

async function send(buf) {
  if (via === 'com' && comPort) {
    await sendToComPort(comPort, baud, buf);
  } else {
    await sendRawToPrinter(printerName, buf);
  }
}

const tests = [
  {
    name: '1) Solo HOLA (minimo)',
    lines: [
      'SIZE 40 mm,30 mm',
      'GAP 2 mm,0',
      'CLS',
      'TEXT 40,40,"3",0,1,1,"HOLA"',
      'PRINT 1',
    ],
  },
  {
    name: '2) Contenido completo sin SET GAP',
    lines: [
      'SIZE 40 mm,30 mm',
      'GAP 2 mm,0',
      'DIRECTION 0',
      'REFERENCE 0,0',
      'DENSITY 15',
      'SPEED 3',
      'CLS',
      'TEXT 30,20,"3",0,1,1,"PARQUEO"',
      'TEXT 30,60,"3",0,1,1,"PRUEBA01"',
      'TEXT 30,110,"3",0,1,1,"14/07/2026"',
      'PRINT 1',
    ],
  },
  {
    name: '3) Caja + texto (ver si dibuja)',
    lines: [
      'SIZE 40 mm,30 mm',
      'GAP 2 mm,0',
      'CLS',
      'BOX 10,10,310,210,5',
      'BAR 20,100,280,8',
      'TEXT 90,50,"3",0,1,1,"CAJA"',
      'PRINT 1',
    ],
  },
];

console.log(`Via: ${via} → ${via === 'com' ? comPort : printerName}\n`);

for (const t of tests) {
  console.log(`Imprimiendo: ${t.name}`);
  await send(job(t.lines));
  await new Promise((r) => setTimeout(r, 3000));
}

console.log('\nListo. Dime cuál(es) tienen texto y cuáles salen en blanco.');
