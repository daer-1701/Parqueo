/**
 * Etiqueta TSPL para impresoras de etiquetas (30×40 mm, 203 dpi).
 */

/**
 * @param {{ plate: string, date: string, time: string }} data
 * @returns {Buffer}
 */
export function buildLabelTspl({ plate, date, time }) {
  const tspl = [
    'SIZE 30 mm,40 mm',
    'GAP 2 mm,0',
    'DIRECTION 1',
    'DENSITY 15',
    'SPEED 2',
    'CLS',
    'TEXT 10,15,"0",0,1,1,"ENTRADA - PARQUEO"',
    `TEXT 10,55,"0",0,2,2,"${plate}"`,
    `TEXT 10,130,"0",0,1,1,"${date}"`,
    `TEXT 10,165,"0",0,1,1,"${time}"`,
    'PRINT 1',
  ].join('\r\n');

  return Buffer.from(`${tspl}\r\n`, 'ascii');
}
