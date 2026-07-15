import { formatBoliviaDate, formatBoliviaTime } from '@/lib/datetime';
import { LABEL_PAGE_HEIGHT_MM, LABEL_PAGE_WIDTH_MM } from '@/lib/label-template';
import type { VehicleType } from '@/types/database';
import { VEHICLE_LABELS } from '@/types/database';

const PRINT_SERVER_URL =
  process.env.NEXT_PUBLIC_PRINT_SERVER_URL?.trim() || 'http://127.0.0.1:3847';

/** Solo si true: abre Chrome cuando falla la impresión directa */
const CHROME_FALLBACK = process.env.NEXT_PUBLIC_PRINT_CHROME_FALLBACK === 'true';

/** Solo Chrome, sin servicio local */
const CHROME_ONLY = process.env.NEXT_PUBLIC_PRINT_CHROME_ONLY === 'true';

/** La impresora tarda varios segundos por COM8; 900 ms abortaba y abría Chrome de más */
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

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWin = window.open(url, '_blank', 'width=220,height=160');

  if (!printWin) {
    URL.revokeObjectURL(url);
    return false;
  }

  return new Promise((resolve) => {
    let done = false;
    printWin.onload = () => {
      if (done) return;
      done = true;
      window.setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
          resolve(true);
        } catch {
          resolve(false);
        } finally {
          window.setTimeout(() => {
            printWin.close();
            URL.revokeObjectURL(url);
          }, 1200);
        }
      }, 400);
    };
  });
}

export async function printEntryLabel(data: EntryLabelData): Promise<PrintResult> {
  if (!CHROME_ONLY) {
    const direct = await tryDirectPrint(data);
    if (direct) return 'direct';
  }

  if (CHROME_ONLY || CHROME_FALLBACK) {
    const dialog = await printWithDialog(data);
    return dialog ? 'dialog' : 'failed';
  }

  return 'failed';
}

export function getPrintDialogHint(): string {
  return 'Impresión automática vía npm run dev:all (sin Chrome)';
}
