/**
 * Prueba impresión por puerto COM (Bluetooth/USB serial).
 * Uso: node scripts/print-com-test.mjs COM8
 */

import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';
import { buildLabelEscPos } from './build-label-escpos.mjs';

const comPort = process.argv[2] ?? 'COM8';
const baudRates = [115200, 9600, 19200, 38400];

const PS_TEMPLATE = `
param([string]$Port, [int]$Baud, [string]$FilePath)
Add-Type -AssemblyName System.IO.Ports
$port = New-Object System.IO.Ports.SerialPort $Port, $Baud, None, 8, One
$port.ReadTimeout = 2000
$port.WriteTimeout = 5000
try {
  $port.Open()
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $port.Write($bytes, 0, $bytes.Length)
  Start-Sleep -Milliseconds 500
  $port.Close()
  Write-Output "OK $Port @ $Baud ($($bytes.Length) bytes)"
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
`;

function sendToCom(port, baud, buffer) {
  const tmpFile = join(tmpdir(), `parqueo-com-${randomBytes(6).toString('hex')}.bin`);
  writeFileSync(tmpFile, buffer);

  return new Promise((resolve, reject) => {
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_TEMPLATE, '-Port', port, '-Baud', String(baud), '-FilePath', tmpFile],
      { windowsHide: true }
    );
    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', (c) => { stdout += c; });
    ps.stderr.on('data', (c) => { stderr += c; });
    ps.on('close', (code) => {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim() || `code ${code}`));
    });
  });
}

const now = new Date();
const date = new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
const time = new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);

const payloads = [
  { name: 'ESC/POS etiqueta', data: buildLabelEscPos({ plate: 'PRUEBA01', date, time }) },
  { name: 'Texto plano', data: Buffer.from('*** PRUEBA COM ***\r\n4578FGV\r\n02/07/2026\r\n\r\n\r\n', 'ascii') },
];

console.log(`Probando puerto ${comPort}...\n`);

for (const payload of payloads) {
  for (const baud of baudRates) {
    try {
      const result = await sendToCom(comPort, baud, payload.data);
      console.log(`✓ ${payload.name} | ${result}`);
    } catch (err) {
      console.log(`✗ ${payload.name} @ ${baud}: ${err.message}`);
    }
  }
}

console.log('\nSi alguna línea marcó ✓, revisa si la impresora imprimió.');
