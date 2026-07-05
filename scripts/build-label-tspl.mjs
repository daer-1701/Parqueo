/**
 * Etiqueta TSPL 3×4 cm (30×40 mm @ 203 dpi).
 */

/** @param {{ plate: string, date: string, time: string }} data */
export function buildLabelTspl({ plate, date, time }) {
  const tspl = [
    'SIZE 30 mm,40 mm',
    'GAP 2 mm,0',
    'DIRECTION 1',
    'DENSITY 15',
    'SPEED 2',
    'CLS',
    'TEXT 8,12,"0",0,1,1,"ENTRADA-PARQUEO"',
    `TEXT 8,48,"0",0,2,2,"${plate}"`,
    `TEXT 8,115,"0",0,1,1,"${date}"`,
    `TEXT 8,145,"0",0,1,1,"${time}"`,
    'PRINT 1',
  ].join('\r\n');

  return Buffer.from(`${tspl}\r\n`, 'ascii');
}
