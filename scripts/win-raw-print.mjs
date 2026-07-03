/**
 * Envía bytes RAW a una impresora de Windows (ESC/POS) sin módulos nativos.
 * Usa la API WinSpool vía PowerShell.
 */

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRINT_RAW_PS1 = join(__dirname, 'print-raw.ps1');

/**
 * @param {string} printerName
 * @param {Buffer} data
 */
export function sendRawToPrinter(printerName, data) {
  const tmpFile = join(tmpdir(), `parqueo-print-${randomBytes(8).toString('hex')}.bin`);
  writeFileSync(tmpFile, data);

  return new Promise((resolve, reject) => {
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PRINT_RAW_PS1, '-PrinterName', printerName, '-FilePath', tmpFile],
      { windowsHide: true }
    );

    let stderr = '';
    ps.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ps.on('close', (code) => {
      try {
        unlinkSync(tmpFile);
      } catch {
        /* ignore */
      }

      if (code === 0) {
        resolve(true);
        return;
      }

      reject(new Error(stderr.trim() || `PowerShell salió con código ${code}`));
    });

    ps.on('error', (err) => {
      try {
        unlinkSync(tmpFile);
      } catch {
        /* ignore */
      }
      reject(err);
    });
  });
}
