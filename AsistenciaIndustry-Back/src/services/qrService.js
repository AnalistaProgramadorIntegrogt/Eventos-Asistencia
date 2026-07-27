import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Genera un código de asistente único alfanumérico aleatorio.
 * Sin datos personales por privacidad (PRD Regla 6).
 */
export function generateUniqueAttendeeCode() {
  const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `ATT-${randomHex.substring(0, 4)}-${randomHex.substring(4, 8)}`;
}

/**
 * Genera un código de invitación alfanumérico aleatorio.
 */
export function generateUniqueInvitationCode(prefix = 'INV') {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomHex}`;
}

/**
 * Convierte una cadena de texto (el código QR) en un DataURL (Base64 PNG).
 * @param {string} code 
 * @returns {Promise<string>} DataURL del código QR
 */
export async function generateQRDataURL(code) {
  try {
    const dataUrl = await QRCode.toDataURL(code, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generando QR DataURL:', err);
    throw err;
  }
}
