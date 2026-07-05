/**
 * TSPL — tamaño según driver LABEL (40×30 mm por defecto).
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
    'TEXT 30,18,"0",0,1,1,"ENTRADA PARQUEO"',
    `TEXT 30,55,"0",0,2,2,"${plate}"`,
    `TEXT 30,110,"0",0,1,1,"${date} ${time}"`,
    'PRINT 1',
  ].join('\r\n');

  return Buffer.from(`${tspl}\r\n`, 'ascii');
}
