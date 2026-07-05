import { formatBoliviaDate, formatBoliviaTime } from '@/lib/datetime';

/** Driver LABEL en Chrome: 40 mm × 30 mm (etiqueta física 3×4 cm) */
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
  const pw = LABEL_PAGE_WIDTH_MM;
  const ph = LABEL_PAGE_HEIGHT_MM;
  /** Área útil de la etiqueta física (3×4 cm), rotada para caber en 40×30 del driver */
  const lw = 28;
  const lh = ph - 2;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${plate}</title>
  <style>
    @page {
      size: ${pw}mm ${ph}mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html {
      width: ${pw}mm;
      height: ${ph}mm;
    }
    body {
      width: ${pw}mm;
      height: ${ph}mm;
      max-height: ${ph}mm;
      overflow: hidden;
      position: relative;
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      position: absolute;
      left: 50%;
      top: 50%;
      width: ${lw}mm;
      height: ${lh}mm;
      transform: translate(-50%, -50%) rotate(90deg);
      border: 0.25mm solid #222;
      border-radius: 1mm;
      padding: 1.5mm 1.2mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      color: #111;
    }
    .kicker {
      font-size: 4pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
    }
    .title {
      font-size: 6pt;
      font-weight: bold;
      letter-spacing: 0.4px;
    }
    .plate {
      font-size: 12pt;
      font-weight: 800;
      letter-spacing: 0.8px;
      line-height: 1;
      width: 100%;
      border-top: 0.2mm solid #000;
      border-bottom: 0.2mm solid #000;
      padding: 1.5mm 0;
    }
    .meta {
      font-size: 5.5pt;
      line-height: 1.3;
    }
    .meta b {
      display: block;
      font-size: 7.5pt;
      margin-top: 0.3mm;
    }
    @media print {
      html, body {
        width: ${pw}mm !important;
        height: ${ph}mm !important;
        max-height: ${ph}mm !important;
        overflow: hidden !important;
      }
      body { page-break-after: avoid; page-break-before: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div>
      <div class="kicker">Entrada</div>
      <div class="title">PARQUEO</div>
    </div>
    <div class="plate">${plate}</div>
    <div class="meta">${date}<b>${time}</b></div>
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

  let done = false;
  const cleanup = () => iframe.remove();

  const runPrint = () => {
    if (done) return;
    done = true;
    window.setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } finally {
        window.setTimeout(cleanup, 2500);
      }
    }, 400);
  };

  iframe.onload = runPrint;

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
  return `Papel ${LABEL_PAGE_WIDTH_MM}×${LABEL_PAGE_HEIGHT_MM} mm · Copias: 1 · Márgenes: Ninguno`;
}
