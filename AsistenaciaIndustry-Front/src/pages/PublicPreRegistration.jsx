import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Result, Alert, Typography, Space, ConfigProvider } from 'antd';
import { DownloadOutlined, LockOutlined, IdcardOutlined, MailOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { api } from '../services/apiService';
import { logoBase64 } from '../assets/logoBase64.js';

const { Title, Text } = Typography;

export default function PublicPreRegistration({ eventId: propEventId }) {
  const pathParts = window.location.pathname.split('/');
  const eventId = propEventId || pathParts[pathParts.length - 1];
  const rawHash = window.location.hash ? window.location.hash.replace('#', '') : '';
  const urlHashCode = (rawHash && rawHash !== 'undefined' && rawHash !== 'null') ? rawHash : '';

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [invitationCode, setInvitationCode] = useState(urlHashCode);
  const [otherValues, setOtherValues] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    api.public.getEvent(eventId)
      .then((res) => {
        if (res.success) {
          setEventData(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (invitationCode && eventId) {
      api.public.getInvitation(eventId, invitationCode)
        .then((res) => {
          if (res.valid && res.data) {
            if (res.data.guest_name) {
              const parts = res.data.guest_name.split(' ');
              form.setFieldsValue({
                first_name: parts[0] || '',
                last_name: parts.slice(1).join(' ') || '',
                email: res.data.guest_email || ''
              });
            }
          }
        })
        .catch(console.error);
    }
  }, [invitationCode, eventId, form]);

  const handleSelectChange = (fieldId, val) => {
    form.setFieldsValue({ [fieldId]: val });
    if (val === 'Otro (especifique)') {
      setOtherValues(prev => ({ ...prev, [fieldId]: true }));
    } else {
      setOtherValues(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const processedValues = { ...values };
      Object.keys(values).forEach(key => {
        if (values[key] === 'Otro (especifique)' && values[`${key}_other`]) {
          processedValues[key] = `Otro: ${values[`${key}_other`]}`;
        }
      });

      const standardData = {};
      const additionalData = {};

      const allFormFields = [
        ...(eventData?.form_config?.fields || []),
        ...(eventData?.form_config?.custom_fields || [])
      ];

      Object.keys(processedValues).forEach(key => {
        if (key.endsWith('_other')) return;
        const val = processedValues[key];
        if (val === undefined || val === null) return;

        additionalData[key] = val;

        const matchedField = allFormFields.find(f => f.id === key);
        const normKey = String(key).toLowerCase();
        const normLabel = String(matchedField?.label || '').toLowerCase();

        if (key === 'first_name') standardData.first_name = val;
        else if (key === 'last_name') standardData.last_name = val;
        else if (key === 'email') standardData.email = val;
        else if (key === 'category_id') standardData.category_id = val;

        else if (key === 'company' || normKey === 'empresa' || normKey.includes('company') || normLabel.includes('empresa') || normLabel.includes('company') || normLabel.includes('organiza')) {
          standardData.company = val;
          additionalData.company = val;
          additionalData.empresa = val;
        }
        else if (key === 'phone' || normKey.includes('telef') || normKey.includes('phone') || normKey.includes('celular') || normLabel.includes('telef') || normLabel.includes('phone') || normLabel.includes('celular') || normLabel.includes('movil')) {
          standardData.phone = val;
          additionalData.phone = val;
          additionalData.telefono = val;
        }
        else if (key === 'job_title' || normKey.includes('cargo') || normKey.includes('puesto') || normLabel.includes('cargo') || normLabel.includes('puesto') || normLabel.includes('job')) {
          standardData.job_title = val;
          additionalData.job_title = val;
          additionalData.cargo = val;
        }
        else if (key === 'category' || normKey.includes('categor') || normLabel.includes('categor')) {
          additionalData.categoria = val;
          additionalData.category = val;
          additionalData.form_category = val;
        }
      });

      const res = await api.public.register(eventId, {
        ...standardData,
        phone: standardData.phone || undefined,
        company: standardData.company || undefined,
        job_title: standardData.job_title || undefined,
        additional_data: additionalData,
        invitation_code: invitationCode || undefined
      });

      if (res.success) {
        setResult(res);
      } else {
        alert('Error en preregistro: ' + res.error);
      }
    } catch (err) {
      alert('No se pudo procesar la solicitud: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0b', color: '#ffffff' }}>
        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Cargando datos del evento...</Text>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0b', color: '#c3302d' }}>
        <Text style={{ color: '#c3302d', fontWeight: 'bold' }}>Evento no encontrado o inactivo.</Text>
      </div>
    );
  }

  const styling = eventData.form_config?.styling || {
    background_color: '#0a0a0b',
    card_bg_color: '#ffffff',
    primary_color: '#c3302d',
    text_color: '#000000'
  };

  const baseFields = eventData.form_config?.fields || [
    { id: 'first_name', label: 'Nombre', visible: true, required: true },
    { id: 'last_name', label: 'Apellido', visible: true, required: true },
    { id: 'email', label: 'Correo electrónico', visible: true, required: true },
    { id: 'company', label: 'Empresa', visible: true, required: false },
    { id: 'job_title', label: 'Cargo', visible: true, required: false }
  ];

  const customFields = eventData.form_config?.custom_fields || [];
  // Exclude category from public form input fields
  const allFields = [
    ...baseFields.filter(f => f.visible && f.id !== 'category'),
    ...customFields.filter(f => f.visible)
  ].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  return (
    <ConfigProvider theme={{ token: { colorPrimary: styling.primary_color || '#c3302d', fontFamily: 'Montserrat, sans-serif' } }}>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: styling.background_color || '#0a0a0b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
          fontFamily: 'Montserrat, sans-serif',
          transition: 'all 0.2s ease'
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: '540px',
            borderRadius: '16px',
            backgroundColor: styling.card_bg_color || '#ffffff',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}
          bodyStyle={{ padding: 0 }}
        >
          {/* Header Banner filled with Primary Color */}
          <div
            style={{
              backgroundColor: styling.primary_color || '#c3302d',
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <img
              src={eventData?.logo_url || logoBase64}
              alt="Íntegro Logo"
              style={{
                maxHeight: '48px',
                maxWidth: '220px',
                objectFit: 'contain',
                margin: '0 auto',
                display: 'block'
              }}
            />
          </div>

          {/* Form Content Body */}
          <div style={{ padding: '24px 28px 36px', backgroundColor: styling.card_bg_color || '#ffffff' }}>
            {result ? (
              <Result
                status="success"
                title={
                  <Title level={3} style={{ margin: 0, fontWeight: '700', color: (eventData.form_config?.success_screen?.title_color) || styling.text_color || '#000000' }}>
                    {(eventData.form_config?.success_screen?.title) || '¡Preregistro Exitoso!'}
                  </Title>
                }
                subTitle={
                  <div style={{ color: (eventData.form_config?.success_screen?.subtitle_color) || '#59585a', fontSize: '0.95rem', marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {((eventData.form_config?.success_screen?.subtitle) || `Tu registro para {event_name} se ha completado correctamente.`).replace('{event_name}', eventData?.name || 'el evento')}
                  </div>
                }
                extra={[
                  <Alert
                    key="email-alert"
                    type="info"
                    showIcon
                    icon={<MailOutlined style={{ fontSize: '1.4rem', color: styling.primary_color || '#c3302d' }} />}
                    message={
                      <Text strong style={{ color: (eventData.form_config?.success_screen?.alert_text_color) || '#1e293b' }}>
                        {(eventData.form_config?.success_screen?.alert_title) || 'Revisa tu bandeja de correo electrónico'}
                      </Text>
                    }
                    description={
                      <div style={{ color: (eventData.form_config?.success_screen?.alert_text_color) || '#1e293b', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {(eventData.form_config?.success_screen?.alert_description) || 'Te hemos enviado tu boleto oficial de ingreso con tu Código QR personalizado directamente a tu e-mail. Por favor revisa tu bandeja de entrada (o correo no deseado). Deberás presentar dicho Código QR al ingresar al evento.'}
                      </div>
                    }
                    style={{
                      textAlign: 'left',
                      borderRadius: '10px',
                      padding: '18px 22px',
                      marginTop: '12px',
                      background: (eventData.form_config?.success_screen?.alert_bg_color) || '#f8fafc',
                      border: `1px solid ${(eventData.form_config?.success_screen?.alert_border_color) || '#cbd5e1'}`
                    }}
                  />
                ]}
              />
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <Title level={3} style={{ margin: '0 0 6px', fontWeight: '800', color: styling.text_color || '#000000' }}>
                    {eventData.form_config?.form_title || eventData.name}<span style={{ color: styling.primary_color || '#c3302d' }}>.</span>
                  </Title>
                  <div style={{ fontSize: '0.9rem', color: '#59585a', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {eventData.form_config?.form_description || eventData.description || 'Complete sus datos para recibir su pase corporativo de ingreso'}
                  </div>
                </div>

                {eventData.invitation_code_required && (
                  <Alert
                    message="Acceso Restringido"
                    description="Este evento requiere la validación de un código único de invitación asignado."
                    type="warning"
                    showIcon
                    icon={<LockOutlined />}
                    style={{ marginBottom: '20px', borderRadius: '8px' }}
                  />
                )}

                <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false} size="large">
                  {eventData.invitation_code_required && (
                    <Form.Item label={<Text strong style={{ color: styling.text_color || '#000000' }}>Código de Invitación VIP *</Text>}>
                      <Input
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        placeholder="Ej: VIP-2026-001"
                      />
                    </Form.Item>
                  )}

                  {allFields.map((f) => (
                    <Form.Item
                      key={f.id}
                      name={f.id}
                      label={<Text strong style={{ color: styling.text_color || '#000000' }}>{f.label}</Text>}
                      rules={[{ required: f.required, message: `Ingrese ${f.label.toLowerCase()}` }]}
                    >
                      {f.type === 'textarea' ? (
                        <Input.TextArea rows={3} placeholder={f.placeholder || `Ingrese ${f.label.toLowerCase()}`} />
                      ) : f.type === 'select' || f.type === 'select_with_other' ? (
                        <div>
                          <Select
                            placeholder={f.placeholder || `Seleccionar ${f.label.toLowerCase()}...`}
                            onChange={(val) => handleSelectChange(f.id, val)}
                            options={[
                              ...(f.options || []).map(o => ({ value: o, label: o })),
                              ...((f.allow_other || f.type === 'select_with_other') ? [{ value: 'Otro (especifique)', label: 'Otro (especifique)' }] : [])
                            ]}
                          />
                          {otherValues[f.id] && (
                            <Form.Item
                              name={`${f.id}_other`}
                              style={{ marginTop: '10px', marginBottom: 0 }}
                              rules={[{ required: f.required, message: 'Especifique su respuesta' }]}
                            >
                              <Input placeholder="Especifique otro..." />
                            </Form.Item>
                          )}
                        </div>
                      ) : f.type === 'other_specify' ? (
                        <Input placeholder={f.placeholder || "Especifique..."} />
                      ) : (
                        <Input type={f.id === 'email' || f.type === 'email' ? 'email' : 'text'} placeholder={f.placeholder || `Ingrese ${f.label.toLowerCase()}`} />
                      )}
                    </Form.Item>
                  ))}

                  <Form.Item style={{ marginTop: '32px', marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      block
                      icon={<IdcardOutlined />}
                      style={{
                        height: '50px',
                        fontWeight: '800',
                        fontSize: '0.98rem',
                        backgroundColor: styling.primary_color || '#c3302d',
                        borderColor: styling.primary_color || '#c3302d',
                        boxShadow: `0 8px 20px ${(styling.primary_color || '#c3302d')}40`,
                        borderRadius: '8px'
                      }}
                    >
                      {submitting ? 'Enviando Preregistro...' : (eventData.form_config?.submit_button_text || 'Completar Preregistro')}
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
          </div>
        </Card>
      </div>
    </ConfigProvider>
  );
}
