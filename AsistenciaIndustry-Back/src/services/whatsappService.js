import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.EVOLUTION_API_URL;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;
const API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Sends a WhatsApp message with an attached QR code image using Evolution API
 * @param {string} phone - The recipient's phone number
 * @param {string} qrBase64 - The base64 string of the QR code (data:image/png;base64,...)
 * @param {string} caption - The text message to accompany the image
 */
export const sendQRWhatsApp = async (phone, qrBase64, caption) => {
  if (!API_URL || !INSTANCE_NAME || !API_KEY) {
    throw new Error('Las credenciales de Evolution API no están configuradas en .env');
  }

  // Remove any non-numeric characters from the phone (e.g. +, -, spaces)
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    const url = `${API_URL.replace(/\/$/, '')}/message/sendMedia/${INSTANCE_NAME}`;
    
    // Some versions of Evolution API require the base64 without the mime type prefix
    // We will extract it if it exists
    const base64Data = qrBase64.includes(',') ? qrBase64.split(',')[1] : qrBase64;

    const payload = {
      number: cleanPhone,
      options: {
        delay: 1200,
        presence: "composing"
      },
      mediaMessage: {
        mediatype: "image",
        caption: caption,
        media: base64Data
      }
    };

    console.log(`[WhatsAppService] Enviando QR a ${cleanPhone} vía Evolution API...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[WhatsAppService] Error en Evolution API:', responseData);
      throw new Error(`Error Evolution API: ${responseData?.message || response.statusText}`);
    }

    console.log(`[WhatsAppService] QR enviado exitosamente a ${cleanPhone}`);
    return responseData;

  } catch (error) {
    console.error('[WhatsAppService] Error interno enviando WhatsApp:', error);
    throw error;
  }
};
