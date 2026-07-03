/**
 * Prueba múltiples formatos en COM8 para encontrar el que imprime texto visible.
 * Uso: npm run print:scan
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
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

const comPort = process.env.PRINT_COM_PORT?.trim() ?? 'COM8';
const baudRate = Number(process.env.PRINT_BAUD_RATE ?? 9600);

const ESC = 0x1b;
const GS = 0x1d;

function escposSimple() {
  const chunks = [
    Buffer.from([ESC, 0x40]), // init
    Buffer.from([ESC, 0x21, 0x30]), // double height+width
    Buffer.from('4578FGV\r\n', 'ascii'),
    Buffer.from([ESC, 0x21, 0x00]),
    Buffer.from('02/07/2026 19:10\r\n', 'ascii'),
    Buffer.from('\r\n\r\n\r\n', 'ascii'),
    Buffer.from([ESC, 0x64, 0x04]), // feed 4 lines
  ];
  return Buffer.concat(chunks);
}

function escposDense() {
  const chunks = [
    Buffer.from([ESC, 0x40]),
    Buffer.from([GS, 0x28, 0x4b, 0x02, 0x00, 0x32]), // density high (some models)
    Buffer.from([ESC, 0x61, 0x01]), // center
    Buffer.from([ESC, 0x45, 0x01]), // bold
    Buffer.from('ENTRADA\r\n', 'ascii'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from([GS, 0x21, 0x11]),
    Buffer.from('4578FGV\r\n', 'ascii'),
    Buffer.from([GS, 0x21, 0x00]),
    Buffer.from('02/07/2026\r\n19:10\r\n\r\n', 'ascii'),
    Buffer.from([ESC, 0x64, 0x06]),
  ];
  return Buffer.concat(chunks);
}

function tsplVariant(name, body) {
  return Buffer.from(`${body}\r\n`, 'ascii');
}

const tests = [
  {
    name: '1-Texto plano ASCII',
    data: Buffer.from('*** PRUEBA PLANA ***\r\n4578FGV\r\n02/07/2026\r\n\r\n\r\n\r\n', 'ascii'),
  },
  {
    name: '2-ESC/POS simple',
    data: escposSimple(),
  },
  {
    name: '3-ESC/POS denso',
    data: escposDense(),
  },
  {
    name: '4-TSPL font 0',
    data: tsplVariant('tspl0', [
      'SIZE 30 mm,40 mm',
      'GAP 2 mm,0',
      'DIRECTION 1',
      'DENSITY 12',
      'SPEED 2',
      'CLS',
      'TEXT 10,10,"0",0,1,1,"4578FGV"',
      'TEXT 10,60,"0",0,1,1,"02/07/2026"',
      'TEXT 10,100,"0",0,1,1,"19:10"',
      'PRINT 1',
    ].join('\r\n')),
  },
  {
    name: '5-TSPL font 1 grande',
    data: tsplVariant('tspl1', [
      'SIZE 30 mm,40 mm',
      'GAP 2 mm,0',
      'DIRECTION 1',
      'DENSITY 15',
      'CLS',
      'TEXT 5,20,"1",0,2,2,"4578FGV"',
      'TEXT 5,100,"1",0,1,1,"02/07/2026"',
      'PRINT 1',
    ].join('\r\n')),
  },
  {
    name: '6-CPCL',
    data: Buffer.from([
      '! 0 200 200 320 1',
      'PAGE-WIDTH 240',
      'TEXT 4 0 20 30 4578FGV',
      'TEXT 4 0 20 100 02/07/2026',
      'TEXT 4 0 20 140 19:10',
      'FORM',
      'PRINT',
    ].join('\r\n') + '\r\n', 'ascii'),
  },
  {
    name: '7-TSPL sin SIZE (auto)',
    data: tsplVariant('tspl-auto', [
      'CLS',
      'TEXT 10,10,"0",0,2,2,"4578FGV"',
      'TEXT 10,80,"0",0,1,1,"02/07/2026 19:10"',
      'PRINT 1',
    ].join('\r\n')),
  },
];

console.log(`Escaneando ${comPort} @ ${baudRate} — ${tests.length} formatos`);
console.log('La impresora avanzará varias etiquetas. Anota cuál imprime TEXTO visible.\n');

for (const test of tests) {
  console.log(`→ Enviando: ${test.name} (${test.data.length} bytes)`);
  try {
    await sendToComPort(comPort, baudRate, test.data);
    console.log(`  ✓ Enviado. ¿Ves texto en la etiqueta?\n`);
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}\n`);
  }
}

console.log('Listo. Dime el número del test que imprimió texto (ej: "4" o "2").');
