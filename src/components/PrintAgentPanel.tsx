'use client';

import {
  CheckCircle2,
  Download,
  Loader2,
  Power,
  Printer,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const PRINT_SERVER_URL =
  process.env.NEXT_PUBLIC_PRINT_SERVER_URL?.trim() || 'http://127.0.0.1:3847';

type AgentStatus = 'checking' | 'online' | 'offline';

async function sleep(ms: number) {
  await new Promise((r) => window.setTimeout(r, ms));
}

export function PrintAgentPanel() {
  const [status, setStatus] = useState<AgentStatus>('checking');
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState('');

  const checkHealth = useCallback(async (): Promise<boolean> => {
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
        return false;
      }
      const json = (await res.json()) as { ok?: boolean; printer?: string };
      if (json.ok) {
        setStatus('online');
        setPrinterName(json.printer ?? 'LABEL');
        return true;
      }
      setStatus('offline');
      setPrinterName(null);
      return false;
    } catch {
      setStatus('offline');
      setPrinterName(null);
      return false;
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = window.setInterval(() => {
      void checkHealth();
    }, 8000);
    return () => window.clearInterval(id);
  }, [checkHealth]);

  async function handleActivate() {
    setActivating(true);
    setMessage('');
    setOpen(true);

    const already = await checkHealth();
    if (already) {
      setMessage('La impresora ya está activa en este PC.');
      setActivating(false);
      return;
    }

    // Abre el agente instalado (protocolo Windows). El navegador pedirá permiso la 1ª vez.
    window.location.href = 'parqueosys://start';

    setMessage('Abriendo el agente de impresión…');
    let ok = false;
    for (let i = 0; i < 10; i++) {
      await sleep(700);
      ok = await checkHealth();
      if (ok) break;
    }

    if (ok) {
      setMessage('Impresora activa. Ya puedes registrar vehículos.');
    } else {
      setMessage(
        'No se detectó el agente. Si es la primera vez en este PC, descarga e instala (una sola vez) y vuelve a pulsar Activar.'
      );
    }
    setActivating(false);
  }

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
      setMessage('No respondió el agente. Pulsa Activar impresora o instálalo una vez.');
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
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            void checkHealth();
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

        <button
          type="button"
          onClick={handleActivate}
          disabled={activating}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 touch-manipulation"
        >
          {activating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Power className="w-4 h-4" />
          )}
          Activar impresora
        </button>
      </div>

      {open && (
        <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              Impresión automática
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Una sola instalación por PC. Después, “Activar impresora” abre el
              agente solo (y también arranca al encender Windows).
            </p>
          </div>

          {status === 'online' ? (
            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm text-green-800">
              Agente activo. Las etiquetas saldrán solas al registrar.
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-amber-900 space-y-2">
              <p className="font-medium">Primera vez en este PC (solo una vez)</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Descarga el instalador <strong>.bat</strong> y el{' '}
                  <strong>.ps1</strong> (misma carpeta).
                </li>
                <li>Ejecuta el .bat y acepta si Windows pregunta.</li>
                <li>
                  Vuelve aquí y pulsa <strong>Activar impresora</strong>.
                </li>
              </ol>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <a
              href="/print-agent/Instalar-ParqueoSys-Impresora.bat"
              download
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 touch-manipulation"
            >
              <Download className="w-4 h-4" />
              Descargar instalador (.bat)
            </a>
            <a
              href="/print-agent/Instalar-ParqueoSys-Impresora.ps1"
              download
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-slate-800 text-sm font-medium border border-slate-300 hover:bg-slate-50 touch-manipulation"
            >
              <Download className="w-4 h-4" />
              Descargar instalador (.ps1)
            </a>
            <button
              type="button"
              onClick={() => void checkHealth()}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-slate-800 text-sm font-medium border border-slate-300 hover:bg-slate-50 touch-manipulation"
            >
              <RefreshCw className="w-4 h-4" />
              Comprobar
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
            La impresora en Windows debe llamarse <strong>LABEL</strong>. Si
            Windows bloquea un .ps1: clic derecho → Propiedades → Desbloquear.
          </p>
        </div>
      )}
    </div>
  );
}
