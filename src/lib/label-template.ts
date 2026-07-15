/**
 * Etiqueta 40×30 mm — fallback Chrome (sin bordes).
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
  vehicleLabel?: string;
}

export function escapeLabelHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildLabelDocument({
  plate,
  date,
  time,
  vehicleLabel = '',
}: LabelContent): string {
  const pw = LABEL_PAGE_WIDTH_MM;
  const ph = PAGE_H_MM;
  const vehicleBlock = vehicleLabel
    ? `<div class="v">${vehicleLabel}</div>`
    : '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${plate}</title><style>
@page{size:${pw}mm ${ph}mm;margin:0}
html,body{width:${pw}mm;height:${ph}mm;margin:0;padding:0;overflow:hidden}
body{
  font-family:Arial,Helvetica,sans-serif;text-align:center;color:#000;background:#fff;
  padding:0 1mm;
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
  page-break-before:avoid;page-break-after:avoid
}
.t{font-size:6.5pt;font-weight:800;letter-spacing:0.6px;margin:0 0 0.6mm}
.p{font-size:11pt;font-weight:800;letter-spacing:0.6px;line-height:1;margin:0 0 0.5mm}
.v{font-size:9pt;font-weight:800;letter-spacing:0.3px;line-height:1.05;margin:0 0 0.6mm;text-transform:uppercase}
.m{font-size:5.5pt;letter-spacing:0.2px;color:#222;margin:0.15mm 0}
</style></head><body>
<div class="t">PARQUEO</div>
<div class="p">${plate}</div>
${vehicleBlock}
<div class="m">${date}</div>
<div class="m">${time}</div>
</body></html>`;
}
