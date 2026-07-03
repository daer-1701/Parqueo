/**
 * Genera buffer ESC/POS para etiqueta de entrada (3×4 cm aprox.).
 * Sin corte — impresoras de etiquetas suelen no tener cutter.
 */

const ESC = 0x1b;
const GS = 0x1d;

function textLine(str) {
  return Buffer.from(`${str}\r\n`, 'ascii');
}

/**
 * @param {{ plate: string, date: string, time: string }} data
 * @returns {Buffer}
 */
export function buildLabelEscPos({ plate, date, time }) {
  const chunks = [];

  // Reiniciar impresora
  chunks.push(Buffer.from([ESC, 0x40]));

  // Centrar
  chunks.push(Buffer.from([ESC, 0x61, 0x01]));

  // Título
  chunks.push(Buffer.from([ESC, 0x45, 0x01]));
  chunks.push(textLine('ENTRADA - PARQUEO'));
  chunks.push(Buffer.from([ESC, 0x45, 0x00]));

  // Placa grande (doble alto + ancho)
  chunks.push(Buffer.from([GS, 0x21, 0x11]));
  chunks.push(Buffer.from([ESC, 0x45, 0x01]));
  chunks.push(textLine(plate));
  chunks.push(Buffer.from([ESC, 0x45, 0x00]));
  chunks.push(Buffer.from([GS, 0x21, 0x00]));

  // Fecha y hora
  chunks.push(textLine(date));
  chunks.push(Buffer.from([ESC, 0x45, 0x01]));
  chunks.push(textLine(time));
  chunks.push(Buffer.from([ESC, 0x45, 0x00]));

  // Avanzar etiqueta (sin corte)
  chunks.push(Buffer.from([ESC, 0x64, 0x06]));
  chunks.push(textLine(''));

  return Buffer.concat(chunks);
}
