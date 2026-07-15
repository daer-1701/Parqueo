/**
 * Crea impresora LABEL-RAW (Generic / Text Only) en el mismo puerto USB001.
 * Evita que el driver LABEL (GDI) trague el TSPL y saque etiquetas en blanco.
 *
 * Uso (PowerShell como Administrador si hace falta):
 *   npm run print:setup-usb
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ps1 = join(__dirname, 'setup-label-raw.ps1');

const child = spawn(
  'powershell.exe',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1],
  { stdio: 'inherit', windowsHide: true }
);

child.on('exit', (code) => process.exit(code ?? 1));
