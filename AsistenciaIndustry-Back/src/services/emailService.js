import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Función que crea y retorna el transportador de correo nodemailer
 */
function getTransporter() {
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

  // 1. Usar un servicio público HTTPS para el QR (evita bloqueos de base64 data URI en Gmail/Outlook)
  const qrPublicUrl = (qrDataUrl && qrDataUrl.startsWith('http')) 
    ? qrDataUrl 
    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=H&margin=15&data=${encodeURIComponent(qrCode || 'ENTRADA-OFICIAL')}`;

  const qrImageHtml = `<div style="text-align: center; margin: 16px auto; display: block;"><div style="background-color: #ffffff; padding: 16px; display: inline-block; border-radius: 12px; border: 4px solid #ffffff; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12); text-align: center;"><img src="${qrPublicUrl}" alt="Código QR de Entrada" width="220" height="220" style="width: 220px; height: 220px; border-radius: 8px; display: block; margin: 0 auto; border: 0; background-color: #ffffff;" /></div></div>`;

  // 2. Resolver URL del Logo (asegurar URL pública HTTPS válida, fallback a logo oficial Íntegro)
  const defaultLogoUrl = 'https://integro.gt/wp-content/uploads/2024/01/Logo-blanco.png';
  const validLogoUrl = (logoUrl && logoUrl.startsWith('http') && !logoUrl.includes('2022/10/logo-integro.png')) ? logoUrl : defaultLogoUrl;
  const logoHeaderHtml = `<img src="${validLogoUrl}" alt="${eventName}" style="max-height: 70px; max-width: 250px; object-fit: contain; display: block; margin: 0 auto 15px;" />`;

  // 3. Resolver Banner (asegurar URL pública HTTPS válida)
  const validBannerUrl = (bannerUrl && bannerUrl.startsWith('http')) ? bannerUrl : '';
  const bannerImageHtml = validBannerUrl ? `<img src="${validBannerUrl}" alt="${eventName}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; display: block; margin-bottom: 20px;" />` : '';

  const config = normalizeEmailConfig(emailConfig, formConfig);

  // Busca de forma exhaustiva en cualquier propiedad de plantilla guardada desde el frontend
  const rawSubject = config.ticket_subject || config.ticketSubject || config.rsvp_subject || config.rsvpSubject || config.subject || config.title || `Entrada Oficial y QR - ${eventName}`;
  const rawBody = config.ticket_body || config.ticketBody || config.rsvp_body || config.rsvpBody || config.ticket_template || config.ticketTemplate || config.rsvp_template || config.rsvpTemplate || config.ticket_html || config.ticketHtml || config.body || config.html || config.template || '';

  console.log(`📧 [ENVIANDO CORREO QR DESDE REGISTRO FRONTEND] Para: ${to} | Asunto: "${rawSubject}"`);

  const replacements = {
    guest_name: attendeeName || 'Estimado Invitado',
    event_name: eventName || 'Evento Corporativo',
    event_date: dateFormatted || 'Próximamente',
    event_location: location || '',
    logo_url: validLogoUrl,
    banner_url: validBannerUrl,
    logo_header: logoHeaderHtml,
    banner_image: bannerImageHtml,
    qr_code: qrCode || '',
    qr_image: qrImageHtml
  };

  const subject = replacePlaceholders(rawSubject, replacements);
  const html = replacePlaceholders(rawBody, replacements);

  let finalHtml = html || `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
      ${logoHeaderHtml}
      <h2>¡Gracias por registrarte a ${eventName}!</h2>
      <p>Hola <strong>${attendeeName}</strong>, aquí tienes tu entrada con código QR para el evento:</p>
      <div style="margin: 20px 0;">${qrImageHtml}</div>
      <p style="font-size: 18px; font-weight: bold;">Código: ${qrCode}</p>
    </div>
  `;

  // Reemplazar cualquier URL de logo rota o imagen base64 embebida por la URL pública HTTPS activa del logo
  finalHtml = finalHtml.replace(/https:\/\/integro\.gt\/wp-content\/uploads\/2022\/10\/logo-integro\.png/g, defaultLogoUrl);
  finalHtml = finalHtml.replace(/src=["']data:image\/[^"']+["']/gi, `src="${validLogoUrl}"`);

  // 1. Intentar envío nativo vía Brevo REST API si la API Key está configurada
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey && !brevoApiKey.includes('tu_api_key')) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@integro.net.gt';
      const senderName = process.env.BREVO_SENDER_NAME || 'Sistema de Eventos Íntegro';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to, name: attendeeName || to }],
          subject: subject,
          htmlContent: finalHtml
        })
      });

      const brevoData = await response.json();

      if (response.ok) {
        console.log(`✅ [EMAIL BREVO ENVIADO] ID: ${brevoData.messageId} a ${to}`);
        return { success: true, messageId: brevoData.messageId, provider: 'brevo' };
      } else {
        console.error('❌ Error de Brevo API:', brevoData);
      }
    } catch (brevoErr) {
      console.error('❌ Error realizando petición a Brevo API:', brevoErr.message);
    }
  }

  // 2. Fallback a Nodemailer SMTP
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Sistema de Eventos" <no-reply@integro.net.gt>`,
    to,
    subject,
    html: finalHtml
  };

  if (!transporter) {
    console.log(`[EMAIL SIMULADO TICKET QR] Para: ${to} | Evento: ${eventName} | QR: ${qrCode}`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL TICKET QR ENVIADO EN MAILTRAP/SMTP] ID: ${info.messageId} a ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Error enviando correo Ticket QR:', err.message);
    return { success: false, error: err.message };
  }
}

export const sendRSVPEmail = sendQRTicketEmail;
export const sendConfirmationEmail = sendQRTicketEmail;
