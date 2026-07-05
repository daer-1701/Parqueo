/**
 * Etiqueta 40×30 mm — fallback Chrome (misma estética que TSPL).
 */

export const LABEL_PAGE_WIDTH_MM = Number(
  process.env.NEXT_PUBLIC_LABEL_PAGE_WIDTH_MM ?? 40
);
export const LABEL_PAGE_HEIGHT_MM = Number(
  process.env.NEXT_PUBLIC_LABEL_PAGE_HEIGHT_MM ?? 30
);

const PAGE_H_MM = LABEL_PAGE_HEIGHT_MM - 1;

export interface LabelContent {
  plate: string;
  date: string;
  time: string;
}

export function escapeLabelHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildLabelDocument({ plate, date, time }: LabelContent): string {
  const pw = LABEL_PAGE_WIDTH_MM;
  const ph = PAGE_H_MM;
  const meta = `${date}  ${time}`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${plate}</title><style>
@page{size:${pw}mm ${ph}mm;margin:0}
html,body{width:${pw}mm;height:${ph}mm;margin:0;padding:0;overflow:hidden}
body{
  font-family:Arial,Helvetica,sans-serif;text-align:center;color:#000;background:#fff;
  border:0.35mm double #111;padding:1mm 1.2mm;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
  page-break-before:avoid;page-break-after:avoid
}
.k{font-size:4pt;text-transform:uppercase;letter-spacing:0.6px;color:#555}
.t{font-size:7pt;font-weight:800;letter-spacing:0.8px;margin:0.3mm 0 0.6mm}
.rule{border:none;border-top:0.2mm solid #000;margin:0.4mm 1mm}
.p{font-size:11pt;font-weight:800;letter-spacing:0.8px;line-height:1;padding:0.8mm 0;margin:0}
.m{font-size:5.5pt;letter-spacing:0.2px;color:#222;margin-top:0.5mm}
</style></head><body>
<div class="k">Entrada</div>
<div class="t">PARQUEO</div>
<hr class="rule">
<div class="p">${plate}</div>
<hr class="rule">
<div class="m">${meta}</div>
</body></html>`;
}
