import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Tag, Alert, Popconfirm, message, Spin, Row, Col, Segmented, Tooltip } from 'antd';
import { MailOutlined, SaveOutlined, UndoOutlined, CopyOutlined, CheckOutlined, EyeOutlined, EditOutlined, PlusOutlined, CodeOutlined, BgColorsOutlined, LayoutOutlined, BankOutlined, AuditOutlined, GlobalOutlined, FileTextOutlined, CompassOutlined, QrcodeOutlined } from '@ant-design/icons';
import { api } from '../services/apiService';
import logoImg from '../assets/Logo.png';
import { logoBase64 } from '../assets/logoBase64.js';

const { Title, Text, Paragraph } = Typography;

export default function EmailTemplateCustomizer({ selectedEventId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editorMode, setEditorMode] = useState('visual'); // visual | code
  const [selectedPreset, setSelectedPreset] = useState('principal');

  // Íntegro Official App Brand Palette
  const [headerBgColor, setHeaderBgColor] = useState('#0a0a0b');
  const [headerTextColor, setHeaderTextColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#121214');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrBorderColor, setQrBorderColor] = useState('#c3302d');

  const [form] = Form.useForm();

  // Watch form fields for live preview
  const subjectConf = Form.useWatch('subject_confirmation', form) || '';
  const templateConf = Form.useWatch('template_confirmation', form) || '';

  const presets = [
    {
      id: 'principal',
      name: 'Plantilla Principal Íntegro',
      desc: 'Diseño oficial con el logo institucional en alta resolución y paleta corporativa.',
      headerBg: '#0a0a0b',
      headerText: '#ffffff',
      text: '#121214',
      bg: '#ffffff',
      qrBorder: '#c3302d',
      icon: <BankOutlined style={{ color: '#c3302d' }} />
    },
    {
      id: 'ejecutiva',
      name: 'Plantilla Ejecutiva Sobria',
      desc: 'Encabezado superior limpio con logo oficial centrado y acento en rojo corporativo.',
      headerBg: '#0a0a0b',
      headerText: '#ffffff',
      text: '#121214',
      bg: '#ffffff',
      qrBorder: '#0a0a0b',
      icon: <AuditOutlined style={{ color: '#0a0a0b' }} />
    },
    {
      id: 'premium',
      name: 'Plantilla Empresarial Premium',
      desc: 'Banner superior rojo Íntegro con el logo oficial y tarjeta contenedora blanca.',
      headerBg: '#c3302d',
      headerText: '#ffffff',
      text: '#121214',
      bg: '#f4f5f7',
      qrBorder: '#c3302d',
      icon: <FileTextOutlined style={{ color: '#c3302d' }} />
    },
    {
      id: 'arquitectura',
      name: 'Plantilla Arquitectura & Proyectos',
      desc: 'Diseño minimalista de líneas sobrias con el logo oficial para desarrollos.',
      headerBg: '#1f2937',
      headerText: '#ffffff',
      text: '#111827',
      bg: '#ffffff',
      qrBorder: '#111827',
      icon: <CompassOutlined style={{ color: '#111827' }} />
    }
  ];

  const visualBlocks = [
    { tag: '{guest_name}', label: 'Nombre del Invitado' },
    { tag: '{event_name}', label: 'Nombre del Evento' },
    { tag: '{event_date}', label: 'Fecha y Hora' },
    { tag: '{event_location}', label: 'Ubicación' },
    { tag: '{qr_image}', label: 'Boleto QR de Ingreso' }
  ];

  // Official Íntegro Base Ticket Template
  const principalTemplate = {
    subject_confirmation: '¡Asistencia Confirmada! Boleto Oficial de Ingreso - {event_name}',
    template_confirmation: `<div style="text-align: center; margin-bottom: 20px;">
  <h2 style="color: #000000; font-size: 1.25rem; margin: 0 0 8px; font-weight: 800; letter-spacing: -0.01em;">BOLETO OFICIAL DE INGRESO</h2>
  <div style="width: 40px; height: 3px; background-color: #c3302d; margin: 0 auto;"></div>
</div>

<p style="text-align: center; font-size: 1rem; color: #121214;">Estimado/a <strong>{guest_name}</strong>,</p>

<p style="text-align: center; color: #4a494b; line-height: 1.6;">
  Confirmamos la recepción de tu preregistro para <strong>{event_name}</strong>. A continuación encontrarás tu pase corporativo con Código QR de ingreso.
</p>

<!-- Bloque Resumen del Evento -->
<div style="background-color: #f4f5f7; border: 1px solid #e1e2e4; border-top: 4px solid #c3302d; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
  <div style="font-size: 0.78rem; text-transform: uppercase; color: #747376; font-weight: bold; letter-spacing: 0.1em; margin-bottom: 4px;">PROYECTO</div>
  <div style="font-size: 1.15rem; font-weight: 800; color: #000000; margin-bottom: 12px;">{event_name}</div>

  <div style="display: inline-block; text-align: center; margin: 0 16px;">
    <div style="font-size: 0.75rem; text-transform: uppercase; color: #747376; font-weight: bold; letter-spacing: 0.08em; margin-bottom: 2px;">FECHA Y HORA</div>
    <div style="color: #000000; font-weight: 700; font-size: 0.95rem;">{event_date}</div>
  </div>

  <div style="display: inline-block; text-align: center; margin: 0 16px;">
    <div style="font-size: 0.75rem; text-transform: uppercase; color: #747376; font-weight: bold; letter-spacing: 0.08em; margin-bottom: 2px;">UBICACIÓN</div>
    <div style="color: #000000; font-weight: 700; font-size: 0.95rem;">{event_location}</div>
  </div>
</div>

<p style="text-align: center; font-weight: bold; color: #000000; margin-top: 24px;">
  Presenta este Código QR al llegar a la recepción del evento:
</p>

{qr_image}

<div style="text-align: center; margin-top: 36px; border-top: 1px solid #e1e2e4; padding-top: 20px; color: #59585a; font-size: 0.88rem;">
  Le esperamos,<br/>
  <strong style="color: #000000; font-weight: 700;">Dirección de Proyectos & Desarrollo</strong><br/>
  Íntegro
</div>`
  };

  const ejecutivaTemplate = {
    subject_confirmation: 'Pase Confirmado - {event_name}',
    template_confirmation: `<div style="text-align: center; margin-bottom: 24px;">
  <h2 style="color: #000000; font-size: 1.2rem; margin: 0 0 6px; font-weight: 700;">PASE OFICIAL REGISTRADO</h2>
  <p style="color: #59585a; margin: 0; font-size: 0.9rem;">Íntegro Desarrolladora Inmobiliaria</p>
</div>

<p style="text-align: center;">Estimado/a <strong>{guest_name}</strong>,</p>

<p style="text-align: center; color: #4a494b;">
  Tu asistencia para el evento <strong>{event_name}</strong> ha sido registrada con éxito.
</p>

<!-- Tabla Resumen Sobria -->
<table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 0.92rem; background: #fafafa; border: 1px solid #e1e2e4;">
  <tr style="border-bottom: 1px solid #e1e2e4;">
    <td style="padding: 12px 16px; color: #747376; font-weight: bold; width: 35%; text-align: right;">PROYECTO:</td>
    <td style="padding: 12px 16px; color: #000000; font-weight: bold; text-align: left;">{event_name}</td>
  </tr>
  <tr style="border-bottom: 1px solid #e1e2e4;">
    <td style="padding: 12px 16px; color: #747376; font-weight: bold; text-align: right;">FECHA Y HORA:</td>
    <td style="padding: 12px 16px; color: #000000; text-align: left;">{event_date}</td>
  </tr>
  <tr>
    <td style="padding: 12px 16px; color: #747376; font-weight: bold; text-align: right;">UBICACIÓN:</td>
    <td style="padding: 12px 16px; color: #000000; text-align: left;">{event_location}</td>
  </tr>
</table>

<p style="text-align: center; color: #4a494b;">
  Muestra tu Código QR de ingreso al acceder:
</p>

{qr_image}

<div style="text-align: center; margin-top: 32px; color: #59585a; font-size: 0.88rem;">
  Atentamente,<br/>
  <strong style="color: #000000;">Gerencia de Proyectos</strong><br/>
  Íntegro
</div>`
  };

  const premiumTemplate = {
    subject_confirmation: 'Acreditación Confirmada - {event_name}',
    template_confirmation: `<div style="text-align: center; margin-bottom: 20px;">
  <span style="background: #c3302d; color: #ffffff; font-size: 0.72rem; font-weight: bold; padding: 4px 12px; border-radius: 4px; letter-spacing: 0.1em; text-transform: uppercase;">
    PASE DIGITAL VERIFICADO
  </span>
  <h2 style="color: #000000; font-size: 1.3rem; margin: 12px 0 4px; font-weight: 800;">CONFIRMACIÓN DE ASISTENCIA</h2>
</div>

<p style="text-align: center;">Estimado/a <strong>{guest_name}</strong>,</p>

<p style="text-align: center; color: #4a494b;">
  Tu registro para la inauguración de <strong>{event_name}</strong> ha sido confirmado.
</p>

<div style="background-color: #ffffff; border: 1px solid #e1e2e4; border-top: 4px solid #c3302d; padding: 20px; border-radius: 6px; margin: 22px 0; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
  <div style="font-weight: bold; color: #c3302d; font-size: 0.85rem; letter-spacing: 0.08em; margin-bottom: 8px;">DETALLES DEL ACCESO</div>
  <div style="margin-bottom: 6px; color: #000000; font-weight: bold;">{event_name}</div>
  <div style="margin-bottom: 4px; color: #59585a;">📅 {event_date}</div>
  <div style="color: #59585a;">📍 {event_location}</div>
</div>

{qr_image}

<div style="text-align: center; margin-top: 32px; color: #59585a; font-size: 0.88rem;">
  Atentamente,<br/>
  <strong style="color: #c3302d;">Presidencia e Inversión</strong><br/>
  Íntegro
</div>`
  };

  const arquitecturaTemplate = {
    subject_confirmation: 'Boleto Digital Registrado - {event_name}',
    template_confirmation: `<div style="text-align: center; margin-bottom: 24px;">
  <h2 style="color: #111827; font-size: 1.25rem; margin: 0 0 4px; font-weight: 900; letter-spacing: 0.05em;">REGISTRO DE INGRESO CONFIRMADO</h2>
  <div style="font-size: 0.78rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.15em;">ARQUITECTURA & DESARROLLO</div>
</div>

<p style="text-align: center;">Estimado/a <strong>{guest_name}</strong>,</p>

<p style="text-align: center; color: #374151;">
  Tu pase digital para la presentación de <strong>{event_name}</strong> ha sido generado con éxito.
</p>

{qr_image}

<div style="text-align: center; margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 0.88rem;">
  Atentamente,<br/>
  <strong style="color: #111827;">Dirección de Proyectos</strong><br/>
  Íntegro
</div>`
  };

  // Safely extract inner body content without keeping outer doctype or html tags
  const extractInnerHtml = (htmlStr) => {
    if (!htmlStr || typeof htmlStr !== 'string') return '';
    if (htmlStr.includes('id="email-inner-body"')) {
      const parts = htmlStr.split(/<div id="email-inner-body"[^>]*>/i);
      if (parts.length > 1) {
        const inner = parts[1].split(/<\/div>\s*<div style="margin-top:36px;/i)[0];
        if (inner && inner.trim()) return inner.trim();
      }
    }
    // If it's a full html document without clean inner-body match, return principalTemplate default instead of keeping full outer doctype wrapper in text field
    if (htmlStr.includes('<!DOCTYPE') || htmlStr.includes('<html')) {
      return principalTemplate.template_confirmation;
    }
    return htmlStr;
  };

  const fetchEmailConfig = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await api.events.getEmailConfig(selectedEventId);
      if (res && res.success !== false && res.data) {
        const rawTpl = res.data.template_confirmation || res.data.ticket_body || res.data.ticket_template || res.data.template_invitation || principalTemplate.template_confirmation;
        const rawSub = res.data.subject_confirmation || res.data.ticket_subject || res.data.subject_invitation || principalTemplate.subject_confirmation;
        form.setFieldsValue({
          subject_confirmation: rawSub,
          template_confirmation: extractInnerHtml(rawTpl) || principalTemplate.template_confirmation
        });
      } else {
        form.setFieldsValue(principalTemplate);
      }
    } catch (err) {
      console.warn('Cargando plantilla de correo por defecto:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailConfig();
  }, [selectedEventId]);

  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    setHeaderBgColor(preset.headerBg);
    setHeaderTextColor(preset.headerText);
    setTextColor(preset.text);
    setBgColor(preset.bg);
    setQrBorderColor(preset.qrBorder);

    let targetTemplate;
    if (preset.id === 'principal') targetTemplate = principalTemplate;
    else if (preset.id === 'ejecutiva') targetTemplate = ejecutivaTemplate;
    else if (preset.id === 'premium') targetTemplate = premiumTemplate;
    else if (preset.id === 'arquitectura') targetTemplate = arquitecturaTemplate;
    else targetTemplate = principalTemplate;

    form.setFieldsValue(targetTemplate);
    message.success(`Plantilla "${preset.name}" aplicada.`);
  };

  const insertTagIntoActiveField = (tag) => {
    const currentVal = form.getFieldValue('template_confirmation') || '';
    form.setFieldsValue({
      template_confirmation: currentVal + (currentVal.length > 0 ? ' ' : '') + tag
    });
    message.success(`Añadido ${tag}`);
  };

  const buildFullEmailDoc = (rawInnerContent) => {
    const logoUrl = 'https://integro.gt/wp-content/uploads/2024/01/Logo-blanco.png';

    const qrImageHtml = `
      <div style="text-align: center; margin: 24px 0;">
        <div style="background: #ffffff; padding: 20px; display: inline-block; border-radius: 8px; border: 2px solid ${qrBorderColor}; box-shadow: 0 8px 22px rgba(0,0,0,0.08);">
          {qr_image}
        </div>
      </div>
    `;

    let processed = (rawInnerContent || '')
      .replace(/{qr_image}/g, qrImageHtml);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Íntegro</title>
</head>
<body style="margin:0; padding:24px 12px; background-color:${bgColor}; font-family:Montserrat, Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #cbd5e1; box-shadow:0 12px 36px rgba(0,0,0,0.1);" border="0" cellspacing="0" cellpadding="0">
          <!-- Header Banner with Official Base64 White Logo -->
          <tr>
            <td style="background-color:${headerBgColor}; padding:28px 20px; text-align:center; border-bottom:4px solid ${qrBorderColor};">
              <img src="${logoUrl}" alt="Íntegro" width="220" style="max-height:52px; width:auto; margin:0 auto; display:block; border:0;" />
            </td>
          </tr>
          <!-- Main Email Content Body -->
          <tr>
            <td style="padding:36px 28px; background-color:${bgColor}; color:${textColor}; font-size:15px; line-height:1.65;">
              <div id="email-inner-body">
                ${processed}
              </div>
              <div style="margin-top:36px; padding-top:20px; border-top:1px solid #cbd5e1; text-align:center; color:#94a3b8; font-size:12px;">
                © 2026 Íntegro. Todos los derechos reservados.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const confirmationDoc = buildFullEmailDoc(values.template_confirmation);

      const fullPayload = {
        subject_confirmation: values.subject_confirmation,
        template_confirmation: confirmationDoc,
        confirmation_subject: values.subject_confirmation,
        confirmation_template: confirmationDoc,

        ticket_subject: values.subject_confirmation,
        ticketSubject: values.subject_confirmation,
        ticket_body: confirmationDoc,
        ticketTemplate: confirmationDoc,
        ticket_template: confirmationDoc,

        // Also duplicate to invitation fields so backend handles any legacy key lookups seamlessly
        subject_invitation: values.subject_confirmation,
        template_invitation: confirmationDoc,
        invitation_subject: values.subject_confirmation,
        invitation_template: confirmationDoc,
        rsvp_subject: values.subject_confirmation,
        rsvp_body: confirmationDoc,
        rsvp_template: confirmationDoc,

        email_config: {
          subject_confirmation: values.subject_confirmation,
          template_confirmation: confirmationDoc,
          ticket_subject: values.subject_confirmation,
          ticket_body: confirmationDoc,
          subject_invitation: values.subject_confirmation,
          template_invitation: confirmationDoc,
          rsvp_subject: values.subject_confirmation,
          rsvp_body: confirmationDoc,
          header_bg_color: headerBgColor,
          qr_border_color: qrBorderColor
        }
      };

      // Call BOTH email-config endpoint AND event update endpoint for complete multi-property backend compatibility
      await api.events.updateEmailConfig(selectedEventId, fullPayload);
      try {
        await api.events.update(selectedEventId, { email_config: fullPayload.email_config, ...fullPayload });
      } catch (e) {
        console.warn('Backend update event email_config fallback note:', e.message);
      }

      message.success('✅ Plantilla oficial de correo con Código QR guardada exitosamente.');
    } catch (err) {
      message.error('No se pudo guardar la configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await api.events.resetEmailConfig(selectedEventId);
      if (res && res.success !== false) {
        message.success('✨ Plantilla restablecida a los valores predeterminados.');
        setSelectedPreset('principal');
        setHeaderBgColor('#0a0a0b');
        setHeaderTextColor('#ffffff');
        setTextColor('#121214');
        setBgColor('#ffffff');
        setQrBorderColor('#c3302d');
        form.setFieldsValue(principalTemplate);
      } else {
        message.error('Error al restablecer plantilla: ' + (res?.error || 'Error del servidor'));
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  // Render Live Preview with Official Logo Image in Centered Header Banners
  const renderLiveEmailPreview = () => {
    const currentSubject = subjectConf;
    const rawTemplate = templateConf;

    const sampleSubject = (currentSubject || '')
      .replace(/{event_name}/g, 'Inauguración Oficial de Proyecto Íntegro 2026');

    // PURE QR IMAGE with Custom Border
    const sampleQRImage = `
      <div style="text-align: center; margin: 22px 0;">
        <div style="background: #ffffff; padding: 20px; display: inline-block; border-radius: 8px; border: 2px solid ${qrBorderColor}; box-shadow: 0 8px 22px rgba(0,0,0,0.08);">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ATT-892341" alt="Pase QR" style="width: 170px; height: 170px; display: block;" />
        </div>
      </div>
    `;

    let processedHtml = (rawTemplate || '')
      .replace(/{guest_name}/g, '[Nombre del Invitado]')
      .replace(/{event_name}/g, 'Inauguración Oficial de Proyecto Íntegro 2026')
      .replace(/{event_date}/g, 'Jueves 23 de Julio de 2026, 18:00 hrs')
      .replace(/{event_location}/g, 'Sede Central Íntegro, Salón Principal')
      .replace(/{qr_image}/g, sampleQRImage)
      .replace(/{qr_code}/g, '');

    return (
      <Card
        style={{
          borderRadius: '14px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          background: '#f4f5f7'
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Email Client Top Bar */}
        <div style={{ background: '#0a0a0b', padding: '12px 20px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text style={{ color: '#89888a', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', fontWeight: 'bold' }}>
              VISTA PREVIA EN VIVO (MAILTRAP MOCKUP)
            </Text>
            <Text strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>
              {sampleSubject || '(Sin Asunto)'}
            </Text>
          </div>
          <Tag color="volcano" style={{ fontWeight: '700', borderRadius: '4px' }}>Correo de Pase con QR</Tag>
        </div>

        {/* Recipient Meta */}
        <div style={{ padding: '10px 20px', background: '#e1e2e4', borderBottom: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#4a494b' }}>
          <div><strong>De:</strong> Íntegro Guatemala &lt;eventos@integro.gt&gt;</div>
          <div><strong>Para:</strong> [Nombre del Invitado] &lt;invitado@ejemplo.com&gt;</div>
        </div>

        {/* PRESET 1: PLANTILLA PRINCIPAL ÍNTEGRO (Centered Official Logo.png Image Header) */}
        {selectedPreset === 'principal' && (
          <div style={{ background: bgColor, padding: '20px' }}>
            <div style={{ background: headerBgColor, padding: '24px 20px', borderRadius: '8px 8px 0 0', textAlign: 'center', borderBottom: '3px solid #c3302d' }}>
              <img src={logoImg} alt="Íntegro" style={{ maxHeight: '52px', maxWidth: '240px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
            </div>

            <div style={{ background: '#ffffff', padding: '36px 28px', borderRadius: '0 0 8px 8px', border: '1px solid #e1e2e4', borderTop: 'none', color: textColor, minHeight: '340px' }}>
              <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
              <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #e1e2e4', textAlign: 'center', color: '#89888a', fontSize: '0.78rem' }}>
                © 2026 Íntegro. Todos los derechos reservados.
              </div>
            </div>
          </div>
        )}

        {/* PRESET 2: EJECUTIVA SOBRIA (Centered Logo.png Image Header with Red Top Border) */}
        {selectedPreset === 'ejecutiva' && (
          <div style={{ background: '#ffffff', padding: '28px 24px', borderTop: '5px solid #c3302d' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid #e1e2e4', paddingBottom: '18px', marginBottom: '24px', background: '#0a0a0b', padding: '20px', borderRadius: '6px' }}>
              <img src={logoImg} alt="Íntegro" style={{ maxHeight: '48px', maxWidth: '220px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
            </div>

            <div style={{ color: textColor, minHeight: '340px', lineHeight: '1.7' }}>
              <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
              <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e1e2e4', textAlign: 'center', color: '#89888a', fontSize: '0.8rem' }}>
                Íntegro Guatemala • Dirección de Proyectos
              </div>
            </div>
          </div>
        )}

        {/* PRESET 3: EMPRESARIAL PREMIUM (Centered Crimson Banner + Logo.png Image) */}
        {selectedPreset === 'premium' && (
          <div style={{ background: '#f4f5f7', paddingBottom: '20px' }}>
            <div style={{ background: headerBgColor, padding: '30px 20px 52px', textAlign: 'center' }}>
              <img src={logoImg} alt="Íntegro" style={{ maxHeight: '52px', maxWidth: '240px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
            </div>

            <div style={{ background: '#ffffff', borderRadius: '14px', margin: '-32px 20px 0', padding: '36px 28px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #e1e2e4', color: textColor, minHeight: '340px' }}>
              <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
              <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #e1e2e4', textAlign: 'center', color: '#89888a', fontSize: '0.78rem' }}>
                © 2026 Íntegro. Todos los derechos reservados.
              </div>
            </div>
          </div>
        )}

        {/* PRESET 4: ARQUITECTURA & PROYECTOS (Centered Dark Header with Logo.png Image) */}
        {selectedPreset === 'arquitectura' && (
          <div style={{ background: '#ffffff', padding: '24px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderTop: '4px solid #111827', padding: '24px', borderRadius: '6px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px', background: '#0a0a0b', padding: '20px', borderRadius: '6px' }}>
                <img src={logoImg} alt="Íntegro" style={{ maxHeight: '48px', maxWidth: '220px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
              </div>

              <div style={{ color: textColor, minHeight: '320px' }}>
                <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
                <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #e5e5eb', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Íntegro — Innovación & Desarrollo Inmobiliario
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <Spin size="large" tip="Cargando plantilla oficial de correo con Código QR..." />
      </div>
    );
  }

  return (
    <div>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: '700' }}>
            Diseñador de Plantilla Oficial de Correo (Boleto QR)
          </Title>
          <Text type="secondary" style={{ fontSize: '0.85rem' }}>
            Personaliza el correo automático que recibe el invitado inmediatamente al completarse su preregistro.
          </Text>
        </div>

        <Segmented
          options={[
            { label: '🎨 Editor Visual (Sencillo)', value: 'visual', icon: <EditOutlined /> },
            { label: '💻 Modo Código HTML', value: 'code', icon: <CodeOutlined /> }
          ]}
          value={editorMode}
          onChange={setEditorMode}
        />
      </div>

      {/* Official Presets Gallery */}
      <Card
        size="small"
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          background: '#fafafa',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <BankOutlined style={{ color: '#c3302d', fontSize: '1.1rem' }} />
          <Text strong style={{ fontSize: '0.9rem' }}>Galería de Plantillas Oficiales de Íntegro (Haz clic para aplicar):</Text>
        </div>

        <Row gutter={[16, 16]}>
          {presets.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <Col xs={24} sm={12} md={6} key={p.id}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => applyPreset(p)}
                  style={{
                    borderRadius: '10px',
                    border: isSelected ? `2px solid ${p.qrBorder}` : '1px solid #cbd5e1',
                    background: '#ffffff',
                    boxShadow: isSelected ? `0 6px 20px ${p.qrBorder}25` : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    height: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    {p.icon}
                    <Text strong style={{ fontSize: '0.85rem', color: '#121214' }}>{p.name}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: '0.78rem', display: 'block', lineHeight: '1.35' }}>
                    {p.desc}
                  </Text>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '4px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: p.headerBg, border: '1px solid #cbd5e1' }} />
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: p.qrBorder }} />
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: p.bg, border: '1px solid #cbd5e1' }} />
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Comprehensive Color Customizer Panel */}
      <Card
        title={
          <Space>
            <BgColorsOutlined style={{ color: '#c3302d' }} />
            <span style={{ fontSize: '0.92rem', fontWeight: '700' }}>Personalización Completa de Colores y Elementos</span>
          </Space>
        }
        size="small"
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <Row gutter={[20, 18]}>
          {/* 1. Header Background Color */}
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '6px', color: '#334155' }}>
              1. Fondo de Encabezado:
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <input
                type="color"
                value={headerBgColor}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
              <Input
                value={headerBgColor}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                maxLength={7}
              />
            </div>
          </Col>

          {/* 2. Header Text Color */}
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '6px', color: '#334155' }}>
              2. Texto de Encabezado:
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <input
                type="color"
                value={headerTextColor}
                onChange={(e) => setHeaderTextColor(e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
              <Input
                value={headerTextColor}
                onChange={(e) => setHeaderTextColor(e.target.value)}
                style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                maxLength={7}
              />
            </div>
          </Col>

          {/* 3. Main Text Color */}
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '6px', color: '#334155' }}>
              3. Color de Texto del Cuerpo:
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
              <Input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                maxLength={7}
              />
            </div>
          </Col>

          {/* 4. QR Border Color */}
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '6px', color: '#334155' }}>
              4. Color de Marco del QR:
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <input
                type="color"
                value={qrBorderColor}
                onChange={(e) => setQrBorderColor(e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
              <Input
                value={qrBorderColor}
                onChange={(e) => setQrBorderColor(e.target.value)}
                style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                maxLength={7}
              />
            </div>
          </Col>
        </Row>
      </Card>

      <Form form={form} layout="vertical" onFinish={handleSave} size="large">
        <Row gutter={[24, 24]}>
          {/* Left Column: Form Controls */}
          <Col xs={24} lg={13}>
            <Card style={{ borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
              {/* One-Click Visual Elements Panel */}
              <div style={{ marginBottom: '20px', background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                <Text strong style={{ fontSize: '0.82rem', color: '#374151', display: 'block', marginBottom: '8px' }}>
                  ✨ Haz clic para añadir elementos dinámicos al texto:
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {visualBlocks.map((b) => (
                    <Button
                      key={b.tag}
                      size="small"
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => insertTagIntoActiveField(b.tag)}
                      style={{ fontSize: '0.8rem', fontWeight: '600' }}
                    >
                      {b.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Form.Item
                  name="subject_confirmation"
                  label={<Text strong>Asunto del Correo de Pase con Código QR</Text>}
                  rules={[{ required: true, message: 'Ingrese el asunto' }]}
                >
                  <Input placeholder="Ej: ¡Asistencia Confirmada! Boleto Oficial de Ingreso - {event_name}" />
                </Form.Item>

                <Form.Item
                  name="template_confirmation"
                  label={<Text strong>Cuerpo del Correo de Pase con Código QR</Text>}
                  extra="Usa {guest_name} y {qr_image} para incluir la imagen del pase con Código QR."
                  rules={[{ required: true, message: 'Ingrese el mensaje' }]}
                >
                  <Input.TextArea
                    rows={13}
                    style={{ fontFamily: editorMode === 'code' ? 'monospace' : 'inherit', fontSize: '0.92rem' }}
                    placeholder="Escribe el mensaje con {guest_name} y {qr_image}..."
                  />
                </Form.Item>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <Popconfirm
                  title="Restablecer plantilla"
                  description="¿Desea volver a la plantilla predeterminada?"
                  onConfirm={handleReset}
                  okText="Restablecer"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <Button icon={<UndoOutlined />} loading={resetting}>
                    Restablecer a la Plantilla Predeterminada
                  </Button>
                </Popconfirm>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  style={{ backgroundColor: qrBorderColor, borderColor: qrBorderColor, fontWeight: '700', minWidth: '160px' }}
                >
                  Guardar Cambios y Aplicar a Correos
                </Button>
              </div>
            </Card>
          </Col>

          {/* Right Column: Live Interactive Preview */}
          <Col xs={24} lg={11}>
            <div style={{ position: 'sticky', top: '24px' }}>
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <EyeOutlined style={{ color: qrBorderColor }} />
                <Text strong style={{ fontSize: '0.9rem' }}>Vista Previa en Tiempo Real (Mailtrap Mockup)</Text>
              </div>
              {renderLiveEmailPreview()}
            </div>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
