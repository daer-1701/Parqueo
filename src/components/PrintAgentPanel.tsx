'use client';

import {
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const PRINT_SERVER_URL =
  process.env.NEXT_PUBLIC_PRINT_SERVER_URL?.trim() || 'http://127.0.0.1:3847';

type AgentStatus = 'checking' | 'online' | 'offline';

export function PrintAgentPanel() {
  const [status, setStatus] = useState<AgentStatus>('checking');
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  const checkHealth = useCallback(async () => {
    setStatus((prev) => (prev === 'online' ? 'online' : 'checking'));
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${PRINT_SERVER_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) {
        setStatus('offline');
        setPrinterName(null);
        return;
      }
      const json = (await res.json()) as { ok?: boolean; printer?: string };
      if (json.ok) {
        setStatus('online');
        setPrinterName(json.printer ?? 'LABEL');
      } else {
        setStatus('offline');
        setPrinterName(null);
      }
    } catch {
      setStatus('offline');
      setPrinterName(null);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = window.setInterval(checkHealth, 8000);
    return () => window.clearInterval(id);
  }, [checkHealth]);

  async function handleTestPrint() {
    setTesting(true);
    setMessage('');
    try {
      const res = await fetch(`${PRINT_SERVER_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate: 'PRUEBA01',
          entryAt: new Date().toISOString(),
          vehicleType: 'car',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'No se pudo imprimir');
      }
      setMessage('Etiqueta de prueba enviada. Revisa la impresora.');
      setStatus('online');
    } catch {
      setStatus('offline');
      setMessage(
        'No respondió el agente. Descarga e inicia ParqueoSys-Impresion.bat en este PC.'
      );
    } finally {
      setTesting(false);
    }
  }

  const statusLabel =
    status === 'online'
      ? 'Impresora lista'
      : status === 'checking'
        ? 'Comprobando…'
        : 'Impresora inactiva';

  const statusClass =
    status === 'online'
      ? 'bg-green-50 text-green-800 border-green-200'
      : status === 'checking'
        ? 'bg-slate-50 text-slate-600 border-slate-200'
        : 'bg-amber-50 text-amber-900 border-amber-200';

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          checkHealth();
        }}
        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors touch-manipulation ${statusClass}`}
      >
        <Printer className="w-4 h-4 shrink-0" />
        {status === 'checking' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'online' ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-amber-600" />
        )}
        <span>{statusLabel}</span>
        {status === 'online' && printerName ? (
          <span className="text-xs opacity-80">({printerName})</span>
        ) : null}
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              Activar impresora en este PC
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              La web en internet no puede usar el USB sola. En este equipo debe
              estar corriendo el agente de impresión (un solo clic).
            </p>
          </div>

          {status === 'online' ? (
            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm text-green-800">
              Agente activo. Las etiquetas saldrán automáticamente al registrar.
            </div>
          ) : (
            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
              <li>Descarga los 2 archivos del agente (abajo).</li>
              <li>
                Deja ambos en la misma carpeta y abre{' '}
                <strong>ParqueoSys-Impresion.bat</strong>.
              </li>
              <li>Deja esa ventana abierta y vuelve aquí.</li>
              <li>Pulsa “Comprobar de nuevo”.</li>
            </ol>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <a
              href="/print-agent/ParqueoSys-Impresion.bat"
              download
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 touch-manipulation"
            >
              <Download className="w-4 h-4" />
              Descargar .bat
            </a>
            <a
              href="/print-agent/ParqueoSys-Impresion.ps1"
              download
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-slate-800 text-sm font-medium border border-slate-300 hover:bg-slate-50 touch-manipulation"
            >
              <Download className="w-4 h-4" />
              Descargar .ps1
            </a>
            <button
              type="button"
              onClick={checkHealth}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-slate-800 text-sm font-medium border border-slate-300 hover:bg-slate-50 touch-manipulation"
            >
              <RefreshCw className="w-4 h-4" />
              Comprobar de nuevo
            </button>
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={testing || status !== 'online'}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-40 touch-manipulation"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Probar impresión
            </button>
          </div>

          {message && (
            <p className="text-sm text-slate-600 border-t border-slate-100 pt-3">
              {message}
            </p>
          )}

          <p className="text-xs text-slate-400">
            Si Windows bloquea el .ps1: clic derecho → Propiedades → Desbloquear.
            La impresora en Windows debe llamarse <strong>LABEL</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
