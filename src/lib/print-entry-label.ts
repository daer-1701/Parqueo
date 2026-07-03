import { formatBoliviaDate, formatBoliviaTime } from '@/lib/datetime';

/** Etiqueta térmica Tomate T-IM50002: 3 cm × 4 cm */
const LABEL_WIDTH_MM = 30;
const LABEL_HEIGHT_MM = 40;

const PRINT_SERVER_URL =
  process.env.NEXT_PUBLIC_PRINT_SERVER_URL?.trim() || 'http://127.0.0.1:3847';

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
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiqueta ${plate}</title>
  <style>
    @page {
      size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
      margin: 0;
    }
    html, body {
      width: ${LABEL_WIDTH_MM}mm;
      height: ${LABEL_HEIGHT_MM}mm;
      overflow: hidden;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      padding: 2mm 1.5mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
    }
    .title {
      font-size: 7pt;
      font-weight: bold;
      letter-spacing: 0.3px;
      width: 100%;
    }
    .divider {
      border-top: 1px dashed #000;
      width: 100%;
      margin: 1mm 0;
    }
    .plate {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 0.8px;
      line-height: 1.05;
      word-break: break-all;
      width: 100%;
      padding: 0.5mm 0;
    }
    .meta {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.8mm;
    }
    .date {
      font-size: 7.5pt;
      line-height: 1.1;
    }
    .time {
      font-size: 10pt;
      font-weight: bold;
      line-height: 1.1;
    }
    @media print {
      html, body {
        width: ${LABEL_WIDTH_MM}mm;
        height: ${LABEL_HEIGHT_MM}mm;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="title">ENTRADA — PARQUEO</div>
  <div class="divider"></div>
  <div class="plate">${plate}</div>
  <div class="divider"></div>
  <div class="meta">
    <div class="date">${date}</div>
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

/**
 * Imprime etiqueta 3×4 cm. Intenta impresión directa vía servicio local;
 * si no está activo, usa el diálogo del navegador como respaldo.
 */
export async function printEntryLabel(data: EntryLabelData): Promise<PrintResult> {
  const direct = await printDirect(data);
  if (direct) return 'direct';

  const dialog = printWithDialog(data);
  return dialog ? 'dialog' : 'failed';
}

export function getPrintServerHint(): string {
  return 'Inicia el servicio de impresión: npm run print:server';
}
