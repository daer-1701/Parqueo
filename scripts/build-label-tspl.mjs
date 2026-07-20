/**
 * TSPL Tomate T-IM5002 — etiqueta 40×30 mm (sin bordes).
 */

const GAP_MM = Number(process.env.LABEL_GAP_MM ?? 2);
const OFFSET_Y_MM = Number(process.env.LABEL_OFFSET_Y_MM ?? 0);
const Y_SHIFT = Number(process.env.LABEL_Y_SHIFT_DOTS ?? 0);
const USE_HOME = process.env.LABEL_TSPL_HOME === 'true';
const DEBUG_BOX = process.env.LABEL_TSPL_DEBUG === 'true';

const PAGE_W_MM = Number(process.env.LABEL_TSPL_WIDTH_MM ?? 40);
const PAGE_H_MM = Number(process.env.LABEL_TSPL_HEIGHT_MM ?? 30);
const DPI = 8;

function y(pos) {
  return pos + Y_SHIFT;
}

function centerX(text, pageW, charW) {
  const w = text.length * charW;
  return Math.max(8, Math.floor((pageW - w) / 2));
}

export function buildLabelTspl({ plate, date, time, vehicleLabel = '' }) {
  const pageW = PAGE_W_MM * DPI;
  const pageH = PAGE_H_MM * DPI;

  const lines = [
    `SIZE ${PAGE_W_MM} mm,${PAGE_H_MM} mm`,
    `GAP ${GAP_MM} mm,0`,
    'SET GAP ON',
    'DIRECTION 0',
    'REFERENCE 0,0',
    `OFFSET ${OFFSET_Y_MM} mm`,
    'SET TEAR ON',
    'DENSITY 12',
    'SPEED 4',
    'CLS',
  ];

  if (USE_HOME) lines.push('HOME');
  if (DEBUG_BOX) lines.push(`BOX 6,6,${pageW - 6},${pageH - 6},2`);

  // Contenido centrado: tipo chico, placa grande
  const midShift = 28;
  lines.push(
    `TEXT ${centerX('PARQUEO', pageW, 10)},${y(14 + midShift)},"2",0,1,1,"PARQUEO"`
  );

  if (vehicleLabel) {
    lines.push(
      `TEXT ${centerX(vehicleLabel, pageW, 10)},${y(42 + midShift)},"2",0,1,1,"${vehicleLabel}"`
    );
  }

  lines.push(
    `TEXT ${centerX(plate, pageW, 14)},${y(78 + midShift)},"2",0,2,2,"${plate}"`,
    `TEXT ${centerX(date, pageW, 8)},${y(128 + midShift)},"2",0,1,1,"${date}"`,
    `TEXT ${centerX(time, pageW, 10)},${y(152 + midShift)},"2",0,1,1,"${time}"`,
    'PRINT 1,1'
  );

  return Buffer.from(`${lines.join('\r\n')}\r\n`, 'ascii');
}

export function buildLabelTsplAuto(params) {
  return buildLabelTspl(params);
}
