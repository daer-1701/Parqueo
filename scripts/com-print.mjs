/**
 * Envía datos a impresora por puerto COM (Bluetooth/USB serial).
 */

import { SerialPort } from 'serialport';

/**
 * @param {string} comPort  Ej: COM8
 * @param {number} baudRate Ej: 9600
 * @param {Buffer} data
 */
export function sendToComPort(comPort, baudRate, data) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: comPort,
      baudRate,
      autoOpen: false,
    });

    port.open((openErr) => {
      if (openErr) {
        reject(new Error(`No se pudo abrir ${comPort}: ${openErr.message}`));
        return;
      }

      port.write(data, (writeErr) => {
        if (writeErr) {
          port.close();
          reject(new Error(`Error al escribir en ${comPort}: ${writeErr.message}`));
          return;
        }

        port.drain((drainErr) => {
          port.close();
          if (drainErr) {
            reject(new Error(`Error al enviar a ${comPort}: ${drainErr.message}`));
            return;
          }
          resolve(true);
        });
      });
    });
  });
}
