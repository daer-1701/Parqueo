import { formatBoliviaDate, formatBoliviaTime } from '@/lib/datetime';

/** Etiqueta: 3 cm ancho × 4 cm alto (30 × 40 mm) */
export const LABEL_WIDTH_MM = 30;
export const LABEL_HEIGHT_MM = 40;

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
  const w = LABEL_WIDTH_MM;
  const h = LABEL_HEIGHT_MM;

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
      width: 26mm;
      height: 34mm;
      border: 0.25mm solid #222;
      border-radius: 1.2mm;
      padding: 2mm 1.5mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
    }
    .head {
      width: 100%;
    }
    .kicker {
      font-size: 4.5pt;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #555;
      line-height: 1.2;
    }
    .title {
      font-size: 6.5pt;
      font-weight: bold;
      letter-spacing: 0.6px;
      line-height: 1.2;
      margin-top: 0.3mm;
    }
    .plate-wrap {
      width: 100%;
      border-top: 0.2mm solid #000;
      border-bottom: 0.2mm solid #000;
      padding: 1.8mm 0;
    }
    .plate {
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.8px;
      line-height: 1;
      word-break: break-all;
    }
    .foot {
      width: 100%;
      line-height: 1.25;
    }
    .date {
      font-size: 5.5pt;
      color: #333;
    }
    .time {
      font-size: 8pt;
      font-weight: bold;
      margin-top: 0.4mm;
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
      .label {
        page-break-inside: avoid;
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
    <div class="plate-wrap">
      <div class="plate">${plate}</div>
    </div>
    <div class="foot">
      <div class="date">${date}</div>
      <div class="time">${time}</div>
    </div>
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
  return 'Papel 30×40 mm · Márgenes: Ninguno · Copias: 1 · Sin encabezados.';
}
