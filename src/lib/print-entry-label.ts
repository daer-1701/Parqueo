import { formatBoliviaDate, formatBoliviaTime } from '@/lib/datetime';

/** Etiqueta: 3 cm ancho × 4 cm alto (30 × 40 mm, vertical) */
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
      size: ${w}mm ${h}mm portrait;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html {
      width: ${w}mm;
      height: ${h}mm;
    }
    body {
      width: ${w}mm;
      height: ${h}mm;
      overflow: hidden;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
    }
    .label {
      width: ${w}mm;
      height: ${h}mm;
      padding: 2mm 1.5mm 1.5mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      text-align: center;
    }
    .brand {
      font-size: 5.5pt;
      font-weight: bold;
      line-height: 1.1;
      width: 100%;
      overflow: hidden;
      white-space: nowrap;
    }
    .rule {
      width: 85%;
      border: none;
      border-top: 1px solid #000;
      margin: 1.2mm 0;
    }
    .plate {
      font-size: 10pt;
      font-weight: bold;
      line-height: 1;
      letter-spacing: 0;
      width: 100%;
      overflow: hidden;
      word-break: break-all;
      padding: 0.5mm 0;
    }
    .when {
      font-size: 6pt;
      line-height: 1.2;
      width: 100%;
      overflow: hidden;
      white-space: nowrap;
    }
    .time {
      font-size: 8pt;
      font-weight: bold;
      line-height: 1.1;
      margin-top: 0.5mm;
    }
    @media print {
      html, body {
        width: ${w}mm !important;
        height: ${h}mm !important;
        max-height: ${h}mm !important;
        overflow: hidden !important;
      }
      .label {
        page-break-after: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="brand">PARQUEO</div>
    <hr class="rule">
    <div class="plate">${plate}</div>
    <hr class="rule">
    <div class="when">${date}</div>
    <div class="time">${time}</div>
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

  const cleanup = () => {
    iframe.remove();
  };

  const triggerPrint = () => {
    setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch {
        cleanup();
        return;
      }
      setTimeout(cleanup, 1500);
    }, 250);
  };

  if (frameDoc.readyState === 'complete') {
    triggerPrint();
  } else {
    iframe.onload = triggerPrint;
  }

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
  return 'Papel: 30×40 mm (vertical). Márgenes: Ninguno. Sin encabezados.';
}
