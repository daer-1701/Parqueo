import { SerialPort } from 'serialport';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buf = Buffer.from(
  [
    'SIZE 40 mm,30 mm',
    'GAP 2 mm,0',
    'CLS',
    'TEXT 40,40,"3",0,1,1,"HOLA"',
    'PRINT 1',
    '',
  ].join('\r\n'),
  'ascii'
);

const ports = ['COM8', 'COM4', 'COM5', 'COM7', 'COM9', 'COM10'];

async function tryPort(path, baudRate) {
  await new Promise((resolve, reject) => {
    const port = new SerialPort({ path, baudRate, autoOpen: false });
    const t = setTimeout(() => {
      try {
        port.close();
      } catch {
        /* */
      }
      reject(new Error('timeout'));
    }, 4000);

    port.open((err) => {
      if (err) {
        clearTimeout(t);
        return reject(err);
      }
      port.write(buf, (e) => {
        if (e) {
          clearTimeout(t);
          port.close();
          return reject(e);
        }
        port.drain(() => {
          clearTimeout(t);
          port.close(() => resolve());
        });
      });
    });
  });
}

for (const path of ports) {
  for (const baudRate of [9600, 115200]) {
    try {
      await tryPort(path, baudRate);
      console.log('OK', path, baudRate);
      process.exit(0);
    } catch (e) {
      console.log('FAIL', path, baudRate, e.message);
    }
  }
}
console.log('ningun COM funciono');
