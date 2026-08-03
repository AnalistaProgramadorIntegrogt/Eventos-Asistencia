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

/**
 * Checks the connection state of the instance
 */
export const getConnectionStatus = async () => {
  if (!API_URL || !INSTANCE_NAME || !API_KEY) {
    throw new Error('Las credenciales de Evolution API no están configuradas en .env');
  }
  const url = `${API_URL.replace(/\/$/, '')}/instance/connectionState/${INSTANCE_NAME}`;
  const response = await fetch(url, {
    headers: { 'apikey': API_KEY }
  });
  if (response.status === 404) return { state: 'NOT_FOUND' };
  if (!response.ok) throw new Error('Error al consultar estado de conexión');
  const data = await response.json();
  return { state: data?.instance?.state || 'UNKNOWN' };
};

/**
 * Creates the instance in Evolution API
 */
export const createInstance = async () => {
  const url = `${API_URL.replace(/\/$/, '')}/instance/create`;
  const payload = {
    instanceName: INSTANCE_NAME,
    token: API_KEY, // Evolution V1 uses apikey, V2 uses token. We pass API_KEY as token for convenience.
    b64: true,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    reject_call: true
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    // If instance already exists, it might return an error, which is fine to ignore if we just wanted to create it.
    if (data?.response?.message?.includes('already exists')) {
       return { success: true, message: 'Instance already exists' };
    }
    throw new Error(data?.message || data?.response?.message || 'Error al crear instancia');
  }
  return data;
};

/**
 * Connects the instance and returns the QR code base64
 */
export const connectInstance = async () => {
  const url = `${API_URL.replace(/\/$/, '')}/instance/connect/${INSTANCE_NAME}`;
  const response = await fetch(url, {
    headers: { 'apikey': API_KEY }
  });
  if (!response.ok) throw new Error('Error al conectar instancia');
  const data = await response.json();
  return data;
};

/**
 * Logs out and disconnects the WhatsApp session
 */
export const logoutInstance = async () => {
  const url = `${API_URL.replace(/\/$/, '')}/instance/logout/${INSTANCE_NAME}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'apikey': API_KEY }
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data?.message || 'Error al desvincular WhatsApp');
  }
  return { success: true };
};
