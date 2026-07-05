/**
 * Detecta automáticamente el COM de Tomate T-IM5002 (Bluetooth).
 * @returns {string | null} Ej: COM8
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function detectTomateComPort() {
  try {
    const script = join(__dirname, 'detect-tomate-com.ps1');
    const port = execSync(
      `"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${script}"`,
      { encoding: 'utf-8', windowsHide: true }
    ).trim();
    return port || null;
  } catch {
    return null;
  }
}
