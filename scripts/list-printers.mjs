/**
 * Muestra los nombres de impresoras instaladas en Windows.
 * Copia el nombre exacto a PRINTER_NAME en .env.local
 *
 * Uso: npm run print:list
 */

import { execSync } from 'child_process';

try {
  const output = execSync(
    'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
    { encoding: 'utf-8' }
  );

  const printers = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (printers.length === 0) {
    console.log('No se encontraron impresoras.');
    process.exit(1);
  }

  console.log('Impresoras instaladas:\n');
  for (const name of printers) {
    console.log(`  • ${name}`);
  }
  console.log('\nAgrega en .env.local:');
  console.log('  PRINTER_NAME=Nombre exacto de arriba');
} catch {
  console.error('No se pudo listar impresoras (solo Windows).');
  process.exit(1);
}
