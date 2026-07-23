/** Formato de placa: 4 números + 3 letras (ej. 4578DFC). */
export const PLATE_PATTERN = /^[0-9]{4}[A-Z]{3}$/;
export const PLATE_MAX_LENGTH = 7;
export const PLATE_PLACEHOLDER = '4578DFC';

export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Filtra la entrada para forzar 4 dígitos y luego 3 letras. */
export function formatPlateInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let result = '';

  for (const char of cleaned) {
    if (result.length >= PLATE_MAX_LENGTH) break;

    if (result.length < 4) {
      if (/\d/.test(char)) result += char;
    } else if (/[A-Z]/.test(char)) {
      result += char;
    }
  }

  return result;
}

export function isValidPlate(plate: string): boolean {
  return PLATE_PATTERN.test(normalizePlate(plate));
}
