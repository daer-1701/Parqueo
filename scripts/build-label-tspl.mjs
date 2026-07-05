/**
 * TSPL — 40×30 mm (driver LABEL), una sola etiqueta.
 */

const PAGE_W = Number(process.env.LABEL_PAGE_WIDTH_MM ?? 40);
const PAGE_H = Number(process.env.LABEL_PAGE_HEIGHT_MM ?? 30);

export function buildLabelTspl({ plate, date, time }) {
  const tspl = [
    `SIZE ${PAGE_W} mm,${PAGE_H} mm`,
    'GAP 2 mm,0',
    'DIRECTION 1',
    'DENSITY 12',
    'CLS',
    'TEXT 8,8,"0",0,1,1,"PARQUEO"',
    'TEXT 8,22,"0",0,1,1,"Entrada"',
    `TEXT 8,50,"0",0,2,2,"${plate}"`,
    `TEXT 8,95,"0",0,1,1,"${date}"`,
    `TEXT 8,115,"0",0,1,1,"${time}"`,
    'PRINT 1,1',
  ].join('\r\n');

  return Buffer.from(`${tspl}\r\n`, 'ascii');
}
