/**
 * ESC/POS compacto para etiqueta 3×4 cm (sin bordes).
 */

const ESC = 0x1b;
const GS = 0x1d;

function line(str) {
  return Buffer.from(`${str}\n`, 'ascii');
}

export function buildLabelEscPos({ plate, date, time, vehicleLabel = '' }) {
  const parts = [
    Buffer.from([ESC, 0x40]),
    Buffer.from([ESC, 0x61, 0x01]),
    Buffer.from([ESC, 0x45, 0x01]),
    line('PARQUEO'),
    Buffer.from([ESC, 0x45, 0x00]),
    Buffer.from([GS, 0x21, 0x11]),
    Buffer.from([ESC, 0x45, 0x01]),
    line(plate),
    Buffer.from([ESC, 0x45, 0x00]),
  ];

  if (vehicleLabel) {
    parts.push(Buffer.from([GS, 0x21, 0x11]));
    parts.push(Buffer.from([ESC, 0x45, 0x01]));
    parts.push(line(vehicleLabel.toUpperCase()));
    parts.push(Buffer.from([ESC, 0x45, 0x00]));
  }

  parts.push(Buffer.from([GS, 0x21, 0x00]));
  parts.push(line(date));
  parts.push(line(time));
  parts.push(Buffer.from([ESC, 0x64, 0x02]));

  return Buffer.concat(parts);
}
