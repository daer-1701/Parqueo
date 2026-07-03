/**
 * Servicio local de impresión directa (sin diálogo del navegador).
 * Tomate T-IM5002 / LABEL-Printer (3×4 cm).
 *
 * Uso:
 *   npm run print:server
 *
 * Variables en .env.local:
 *   PRINT_COM_PORT=COM8          (recomendado para Tomate Bluetooth)
 *   PRINT_BAUD_RATE=9600
 *   PRINT_MODE=tspl              tspl | escpos
 *   PRINTER_NAME=POS-58          (solo si no usas COM)
 */

import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildLabelEscPos } from './build-label-escpos.mjs';
import { buildLabelTspl } from './build-label-tspl.mjs';
import { sendToComPort } from './com-print.mjs';
import { sendRawToPrinter } from './win-raw-print.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PRINT_SERVER_PORT ?? 3847);
const APP_ORIGIN = process.env.PRINT_APP_ORIGIN ?? 'http://localhost:3000';

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  if (!existsSync(envPath)) return;
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

const PRINTER_NAME = process.env.PRINTER_NAME?.trim();
const PRINT_COM_PORT = process.env.PRINT_COM_PORT?.trim();
const PRINT_BAUD_RATE = Number(process.env.PRINT_BAUD_RATE ?? 9600);
const PRINT_MODE = (process.env.PRINT_MODE ?? 'tspl').trim().toLowerCase();

function formatBoliviaDate(iso) {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatBoliviaTime(iso) {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function buildPrintBuffer({ plate, date, time }) {
  if (PRINT_MODE === 'escpos') {
    return buildLabelEscPos({ plate, date, time });
  }
  return buildLabelTspl({ plate, date, time });
}

async function printLabel({ plate, entryAt }) {
  const date = formatBoliviaDate(entryAt);
  const time = formatBoliviaTime(entryAt);
  const buffer = buildPrintBuffer({ plate, date, time });

  if (PRINT_COM_PORT) {
    await sendToComPort(PRINT_COM_PORT, PRINT_BAUD_RATE, buffer);
    return;
  }

  if (!PRINTER_NAME) {
    throw new Error(
      'Configura PRINT_COM_PORT=COM8 (Tomate Bluetooth) o PRINTER_NAME en .env.local'
    );
  }

  await sendRawToPrinter(PRINTER_NAME, buffer);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10_000) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      comPort: PRINT_COM_PORT ?? null,
      baudRate: PRINT_COM_PORT ? PRINT_BAUD_RATE : null,
      mode: PRINT_MODE,
      printer: PRINTER_NAME ?? null,
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    try {
      const body = await readJsonBody(req);
      if (!body.plate?.trim() || !body.entryAt) {
        sendJson(res, 400, { ok: false, error: 'plate y entryAt son obligatorios' });
        return;
      }

      await printLabel({
        plate: String(body.plate).trim().toUpperCase(),
        entryAt: body.entryAt,
      });

      sendJson(res, 200, { ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir';
      console.error('❌', message);
      sendJson(res, 500, { ok: false, error: message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'No encontrado' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🖨️  Servicio de impresión en http://127.0.0.1:${PORT}`);
  if (PRINT_COM_PORT) {
    console.log(`   Puerto COM: ${PRINT_COM_PORT} @ ${PRINT_BAUD_RATE} (${PRINT_MODE.toUpperCase()})`);
  } else if (PRINTER_NAME) {
    console.log(`   Impresora Windows: ${PRINTER_NAME} (${PRINT_MODE.toUpperCase()})`);
  } else {
    console.log('   ⚠️  Agrega en .env.local:');
    console.log('      PRINT_COM_PORT=COM8');
    console.log('      PRINT_BAUD_RATE=9600');
    console.log('      PRINT_MODE=tspl');
  }
  console.log('   Deja esta ventana abierta mientras usas el panel de operador.\n');
});
