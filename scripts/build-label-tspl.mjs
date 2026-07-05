/**
 * Etiqueta TSPL 3×4 cm (30 mm ancho × 40 mm alto).
 */

export function buildLabelTspl({ plate, date, time }) {
  const tspl = [
    'SIZE 30 mm,40 mm',
    'GAP 2 mm,0',
    'DIRECTION 1',
    'DENSITY 12',
    'SPEED 2',
    'CLS',
    'TEXT 20,20,"0",0,1,1,"PARQUEO"',
    `TEXT 20,55,"0",0,2,2,"${plate}"`,
    `TEXT 20,120,"0",0,1,1,"${date} ${time}"`,
    'PRINT 1',
  ].join('\r\n');

  return Buffer.from(`${tspl}\r\n`, 'ascii');
}
