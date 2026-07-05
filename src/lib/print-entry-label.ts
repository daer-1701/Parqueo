import { formatBoliviaDate, formatBoliviaTime } from '@/lib/datetime';

/**
 * Tamaño de página en Chrome/driver LABEL (ancho × alto).
 * Etiqueta física 3×4 cm; el driver Fujun suele registrar 40×30 mm.
 */
export const LABEL_PAGE_WIDTH_MM = Number(
  process.env.NEXT_PUBLIC_LABEL_PAGE_WIDTH_MM ?? 40
);
export const LABEL_PAGE_HEIGHT_MM = Number(
  process.env.NEXT_PUBLIC_LABEL_PAGE_HEIGHT_MM ?? 30
);

const PRINT_SERVER_URL =
  process.env.NEXT_PUBLIC_PRINT_SERVER_URL?.trim() || 'http://127.0.0.1:3847';

const PRINT_DIRECT = process.env.NEXT_PUBLIC_PRINT_DIRECT === 'true';

export interface EntryLabelData {
  plate: string;
  entryAt: string;
}

export type PrintResult = 'direct' | 'dialog' | 'failed';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLabelHtml(plate: string, date: string, time: string): string {
  const w = LABEL_PAGE_WIDTH_MM;
  const h = LABEL_PAGE_HEIGHT_MM;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${plate}</title>
  <style>
    @page {
      size: ${w}mm ${h}mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${w}mm;
      height: ${h}mm;
      max-width: ${w}mm;
      max-height: ${h}mm;
      overflow: hidden;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      width: ${w - 2}mm;
      height: ${h - 2}mm;
      border: 0.25mm solid #222;
      border-radius: 1mm;
      padding: 1.2mm 2mm;
      display: grid;
      grid-template-rows: auto 1fr auto;
      align-items: center;
      text-align: center;
    }
    .head .kicker {
      font-size: 4pt;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #666;
    }
    .head .title {
      font-size: 6pt;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .plate {
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 1px;
      line-height: 1;
      border-top: 0.2mm solid #000;
      border-bottom: 0.2mm solid #000;
      padding: 1.2mm 0;
      width: 100%;
    }
    .foot {
      font-size: 5.5pt;
      line-height: 1.2;
      color: #333;
    }
    .foot strong {
      font-size: 7pt;
      color: #000;
      margin-left: 1.5mm;
    }
    @media print {
      html, body {
        width: ${w}mm !important;
        height: ${h}mm !important;
        max-height: ${h}mm !important;
        overflow: hidden !important;
        page-break-before: avoid;
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="head">
      <div class="kicker">Entrada</div>
      <div class="title">PARQUEO</div>
    </div>
    <div class="plate">${plate}</div>
    <div class="foot">${date}<strong>${time}</strong></div>
  </div>
</body>
</html>`;
}

async function printDirect(data: EntryLabelData): Promise<boolean> {
  try {
    const res = await fetch(`${PRINT_SERVER_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return Boolean(json.ok);
  } catch {
    return false;
  }
}

function printWithDialog(data: EntryLabelData): boolean {
  if (typeof window === 'undefined') return false;

  const date = formatBoliviaDate(data.entryAt);
  const time = formatBoliviaTime(data.entryAt);
  const html = buildLabelHtml(escapeHtml(data.plate), date, time);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Imprimir etiqueta');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = iframe.contentDocument ?? frameWindow?.document;

  if (!frameWindow || !frameDoc) {
    iframe.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  let printed = false;
  const cleanup = () => {
    iframe.remove();
  };

  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch {
        cleanup();
        return;
      }
      setTimeout(cleanup, 2000);
    }, 300);
  };

  iframe.onload = triggerPrint;

  return true;
}

export async function printEntryLabel(data: EntryLabelData): Promise<PrintResult> {
  if (PRINT_DIRECT) {
    const direct = await printDirect(data);
    if (direct) return 'direct';
  }

  const dialog = printWithDialog(data);
  return dialog ? 'dialog' : 'failed';
}

export function getPrintDialogHint(): string {
  return `Papel ${LABEL_PAGE_WIDTH_MM}×${LABEL_PAGE_HEIGHT_MM} mm · Márgenes: Ninguno · Copias: 1`;
}
