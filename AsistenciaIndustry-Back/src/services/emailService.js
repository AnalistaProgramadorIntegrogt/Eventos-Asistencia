import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

/**
 * Función que crea y retorna el transportador de correo nodemailer
 */
function getTransporter() {
  dotenv.config();

  const host = (process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io').trim();
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  if (!user || !pass || user.includes('tu-correo') || user === '') {
    console.warn('⚠️ No se han configurado credenciales de SMTP válidas. Los correos se simularán en consola.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Reemplaza los marcadores dinámicos en una plantilla HTML/Texto.
 */
function replacePlaceholders(templateStr, replacements) {
  if (!templateStr) return '';
  let result = templateStr;
  for (const [key, val] of Object.entries(replacements)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(placeholder, val !== undefined && val !== null ? val : '');
  }
  return result;
}

/**
 * Helper para extraer la configuración enviada / guardada desde el frontend.
 */
function normalizeEmailConfig(emailConfig, formConfig) {
  let config = emailConfig;

  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch (e) { config = {}; }
  }

  if (!config || typeof config !== 'object' || Object.keys(config).length === 0) {
    if (typeof formConfig === 'string') {
      try { formConfig = JSON.parse(formConfig); } catch (e) {}
    }
    if (typeof formConfig === 'object' && formConfig !== null) {
      config = formConfig.email_config || formConfig.emailConfig || formConfig.email_template || formConfig.emailTemplate || formConfig;
    }
  }

  return config || {};
}

/**
 * Envía correo con el CÓDIGO QR de invitación inmediatamente al completar el preregistro.
 * Utiliza única y exclusivamente la plantilla guardada desde el Frontend.
 */
export async function sendQRTicketEmail({ to, attendeeName, eventName, location, startDate, logoUrl, bannerUrl, qrCode, qrDataUrl, emailConfig, formConfig }) {
  const transporter = getTransporter();

  const dateFormatted = startDate ? new Date(startDate).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  const qrImageHtml = `<img src="${qrDataUrl}" alt="Código QR de Entrada" style="width: 220px; height: 220px; border-radius: 8px; display: inline-block;" />`;
  const logoHeaderHtml = logoUrl ? `<img src="${logoUrl}" alt="${eventName}" style="max-height: 80px; max-width: 250px; object-fit: contain;" />` : '';
  const bannerImageHtml = bannerUrl ? `<img src="${bannerUrl}" alt="${eventName}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px;" />` : '';

  const config = normalizeEmailConfig(emailConfig, formConfig);

  // Busca de forma exhaustiva en cualquier propiedad de plantilla guardada desde el frontend
  const rawSubject = config.ticket_subject || config.ticketSubject || config.rsvp_subject || config.rsvpSubject || config.subject || config.title || `Entrada Oficial y QR - ${eventName}`;
  const rawBody = config.ticket_body || config.ticketBody || config.rsvp_body || config.rsvpBody || config.ticket_template || config.ticketTemplate || config.rsvp_template || config.rsvpTemplate || config.ticket_html || config.ticketHtml || config.body || config.html || config.template || '';

  console.log(`📧 [ENVIANDO CORREO QR DESDE REGISTRO FRONTEND] Para: ${to} | Asunto: "${rawSubject}"`);

  const replacements = {
    guest_name: attendeeName,
    event_name: eventName,
    event_date: dateFormatted,
    event_location: location || '',
    logo_url: logoUrl || '',
    banner_url: bannerUrl || '',
    logo_header: logoHeaderHtml,
    banner_image: bannerImageHtml,
    qr_code: qrCode,
    qr_image: qrImageHtml
  };

  const subject = replacePlaceholders(rawSubject, replacements);
  const html = replacePlaceholders(rawBody, replacements);

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Sistema de Eventos" <no-reply@integro.net.gt>`,
    to,
    subject,
    html: html || `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h2>¡Gracias por registrarte a ${eventName}!</h2>
        <p>Hola <strong>${attendeeName}</strong>, aquí tienes tu entrada con código QR para el evento:</p>
        <div style="margin: 20px 0;">${qrImageHtml}</div>
        <p style="font-size: 18px; font-weight: bold;">Código: ${qrCode}</p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[EMAIL SIMULADO TICKET QR] Para: ${to} | Evento: ${eventName} | QR: ${qrCode}`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL TICKET QR ENVIADO EN MAILTRAP] ID: ${info.messageId} a ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Error enviando correo Ticket QR:', err.message);
    return { success: false, error: err.message };
  }
}

export const sendRSVPEmail = sendQRTicketEmail;
export const sendConfirmationEmail = sendQRTicketEmail;
