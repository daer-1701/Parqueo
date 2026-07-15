/**
 * Impresión GDI vía driver Windows (LABEL).
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRINT_GDI_PS1 = join(__dirname, 'print-gdi.ps1');

/**
 * @param {string} printerName
 * @param {{ plate: string, date: string, time: string, vehicle?: string }} data
 */
export function sendGdiToPrinter(printerName, { plate, date, time, vehicle = '' }) {
  return new Promise((resolve, reject) => {
    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      PRINT_GDI_PS1,
      '-PrinterName',
      printerName,
      '-Plate',
      plate,
      '-Date',
      date,
      '-Time',
      time,
    ];
    if (vehicle) {
      args.push('-Vehicle', vehicle);
    }

    const ps = spawn('powershell.exe', args, { windowsHide: true });

    let stderr = '';
    ps.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ps.on('close', (code) => {
      if (code === 0) {
        resolve(true);
        return;
      }
      reject(new Error(stderr.trim() || `PowerShell GDI salió con código ${code}`));
    });

    ps.on('error', reject);
  });
}
