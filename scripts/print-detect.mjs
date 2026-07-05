/**
 * Detecta el puerto COM de la impresora Tomate T-IM5002 (Bluetooth).
 * Uso: npm run print:detect
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

function runPs1(scriptName) {
  const script = join(__dirname, scriptName);
  const raw = execSync(
    `"${PS}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${script}"`,
    { encoding: 'utf-8', windowsHide: true }
  ).trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

const comPorts = runPs1('list-com-ports.ps1');
const printers = runPs1('list-printers.ps1');

console.log('=== Puertos COM (Bluetooth) ===\n');
for (const port of comPorts) {
  const isTomate =
    port.PNPDeviceID?.includes('5A4A010767FB') ||
    port.PNPDeviceID?.includes('000205AC') ||
    port.Name?.includes('T-IM');
  const mark = isTomate ? '  ← T-IM5002 (Tomate)' : '';
  console.log(`  ${port.DeviceID}: ${port.Name}${mark}`);
}

console.log('\n=== Impresoras Windows ===\n');
for (const p of printers) {
  const isLabel =
    /label|tomate|t-im|fujun|zj|资江/i.test(p.Name) ||
    /label|fujun|zj/i.test(p.DriverName ?? '');
  const mark = isLabel ? '  ← impresora de etiquetas' : '';
  console.log(`  ${p.Name}`);
  console.log(`    Driver: ${p.DriverName} | Puerto: ${p.PortName}${mark}\n`);
}

const tomateCom = comPorts.find(
  (p) =>
    p.PNPDeviceID?.includes('5A4A010767FB') ||
    p.PNPDeviceID?.includes('000205AC')
);

const labelPrinter = printers.find(
  (p) =>
    /label|tomate|t-im|fujun|zj/i.test(p.Name) ||
    /label|fujun|zj/i.test(p.DriverName ?? '')
);

console.log('=== Recomendación para .env.local ===\n');
if (tomateCom) {
  console.log(`PRINT_COM_PORT=${tomateCom.DeviceID}`);
  console.log('PRINT_BAUD_RATE=9600');
  console.log('PRINT_MODE=tspl');
}
if (labelPrinter) {
  console.log(`PRINTER_NAME=${labelPrinter.Name}`);
}
if (!tomateCom && !labelPrinter) {
  console.log('No se detectó la impresora. Pasos:');
  console.log('  1. Instala driver oficial: https://www.cnfujun.com/d/39');
  console.log('  2. Conecta por USB o empareja Bluetooth');
  console.log('  3. Vuelve a ejecutar: npm run print:detect');
}
