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
  /** Cabe en 30 mm aunque Chrome use márgenes "Predeterminado" (~2 mm c/lado) */
  const cw = pw - 4;
  const ch = ph - 5;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${plate}</title><style>
@page{size:${pw}mm ${ph}mm;margin:0}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{width:${pw}mm;height:${ph}mm;overflow:hidden}
body{
  width:${pw}mm;height:${ph}mm;max-height:${ph}mm;
  overflow:hidden;display:flex;align-items:center;justify-content:center;
  font-family:Arial,Helvetica,sans-serif;background:#fff;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
  page-break-before:avoid;page-break-after:avoid;break-before:avoid;break-after:avoid
}
.sheet{
  width:${cw}mm;height:${ch}mm;max-height:${ch}mm;overflow:hidden;
  border:0.25mm solid #222;border-radius:0.8mm;
  padding:1mm 1.5mm;display:flex;flex-direction:column;
  align-items:center;justify-content:space-between;text-align:center;color:#111;
  page-break-inside:avoid;break-inside:avoid
}
.head{line-height:1.1}
.kicker{font-size:4pt;text-transform:uppercase;letter-spacing:0.4px;color:#666}
.title{font-size:6.5pt;font-weight:700;letter-spacing:0.5px}
.plate{
  font-size:11pt;font-weight:800;letter-spacing:0.6px;line-height:1;
  width:100%;border-top:0.2mm solid #000;border-bottom:0.2mm solid #000;
  padding:1mm 0
}
.foot{font-size:5.5pt;line-height:1.2}
.foot b{font-size:7pt;display:block;margin-top:0.2mm}
@media print{
  html,body{width:${pw}mm!important;height:${ph}mm!important;max-height:${ph}mm!important;overflow:hidden!important}
  .sheet{page-break-inside:avoid!important;break-inside:avoid!important}
}
</style></head><body><div class="sheet"><div class="head"><div class="kicker">Entrada</div><div class="title">PARQUEO</div></div><div class="plate">${plate}</div><div class="foot">${date}<b>${time}</b></div></div></body></html>`;
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

  iframe.onload = () => {
    if (done) return;
    done = true;
    window.setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } finally {
        window.setTimeout(cleanup, 2500);
      }
    }, 350);
  };

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
  return `Márgenes: NINGUNO · Copias: 1 · Papel ${LABEL_PAGE_WIDTH_MM}×${LABEL_PAGE_HEIGHT_MM} mm`;
}
