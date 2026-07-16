import { formatBoliviaDate, formatBoliviaTime } from '@/lib/datetime';
import { LABEL_PAGE_HEIGHT_MM, LABEL_PAGE_WIDTH_MM } from '@/lib/label-template';
import type { VehicleType } from '@/types/database';
import { VEHICLE_LABELS } from '@/types/database';

const PRINT_SERVER_URL =
  process.env.NEXT_PUBLIC_PRINT_SERVER_URL?.trim() || 'http://127.0.0.1:3847';

/** Solo si true: abre diálogo de Chrome cuando falla el servicio local */
const CHROME_FALLBACK = process.env.NEXT_PUBLIC_PRINT_CHROME_FALLBACK === 'true';

const PRINT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_PRINT_TIMEOUT_MS ?? 20000);

export {
  LABEL_PAGE_HEIGHT_MM,
  LABEL_PAGE_WIDTH_MM,
} from '@/lib/label-template';

export interface EntryLabelData {
  plate: string;
  entryAt: string;
  vehicleType?: VehicleType;
}

export type PrintResult = 'direct' | 'dialog' | 'failed';

export const PRINT_SERVER_HINT =
  'En el PC de la impresora ejecuta start-print-server.bat (o npm run print:server) y déjalo abierto.';

function vehicleLabelFor(type?: VehicleType): string {
  if (!type) return '';
  const map: Record<VehicleType, string> = {
    car: 'AUTOMOVIL',
    motorcycle: 'MOTOCICLETA',
    truck: 'CAMIONETA',
  };
  return map[type] ?? VEHICLE_LABELS[type] ?? '';
}

async function tryDirectPrint(data: EntryLabelData): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), PRINT_TIMEOUT_MS);

    const res = await fetch(`${PRINT_SERVER_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate: data.plate,
        entryAt: data.entryAt,
        vehicleType: data.vehicleType,
      }),
      signal: controller.signal,
    });

    window.clearTimeout(timer);
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return Boolean(json.ok);
  } catch {
    return false;
  }
}

async function printWithDialog(data: EntryLabelData): Promise<boolean> {
  const { buildLabelDocument, escapeLabelHtml } = await import('@/lib/label-template');
  const html = buildLabelDocument({
    plate: escapeLabelHtml(data.plate),
    date: formatBoliviaDate(data.entryAt),
    time: formatBoliviaTime(data.entryAt),
    vehicleLabel: escapeLabelHtml(vehicleLabelFor(data.vehicleType)),
  });

  if (typeof window === 'undefined') return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  return new Promise((resolve) => {
    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch {
        resolve(false);
      } finally {
        window.setTimeout(() => iframe.remove(), 1500);
      }
    }, 350);
  });
}

/** Impresión automática vía servicio local en el PC de la impresora. */
export async function printEntryLabel(data: EntryLabelData): Promise<PrintResult> {
  const direct = await tryDirectPrint(data);
  if (direct) return 'direct';

  if (CHROME_FALLBACK) {
    const dialog = await printWithDialog(data);
    return dialog ? 'dialog' : 'failed';
  }

  return 'failed';
}

export function getPrintDialogHint(): string {
  return PRINT_SERVER_HINT;
}
