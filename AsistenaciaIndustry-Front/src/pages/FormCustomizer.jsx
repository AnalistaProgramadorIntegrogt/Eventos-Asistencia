import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Form, Input, Checkbox, Button, Select, Switch,
  Typography, Space, Spin, message, Tag, Divider, Empty, Tooltip,
  Badge, Alert, Collapse, Segmented
} from 'antd';
import {
  SaveOutlined, EyeOutlined, LayoutOutlined, BgColorsOutlined,
  PlusOutlined, DeleteOutlined, CheckCircleOutlined,
  FormOutlined, EditOutlined, MailOutlined
} from '@ant-design/icons';
import { api } from '../services/apiService';
import logoImg from '../assets/Logo.png';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const FIELD_TYPES = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'email', label: 'Correo electrónico' },
  { value: 'select', label: 'Lista desplegable (Dropdown)' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'checkbox', label: 'Casilla de verificación' },
];

const DEFAULT_FORM_CONFIG = {
  form_title: '',
  form_description: '',
  fields: [
    { id: 'first_name', label: 'Nombre', visible: true, required: true, order: 1, locked: true },
    { id: 'last_name', label: 'Apellido', visible: true, required: true, order: 2, locked: true },
    { id: 'email', label: 'Correo electrónico', visible: true, required: true, order: 3, locked: true },
    { id: 'company', label: 'Empresa', visible: true, required: false, order: 4, locked: false },
    { id: 'job_title', label: 'Cargo / Puesto', visible: true, required: false, order: 5, locked: false },
  ],
  custom_fields: [],
  styling: {
    background_color: '#0a0a0b',
    card_bg_color: '#ffffff',
    primary_color: '#c3302d',
    text_color: '#000000',
    custom_css: ''
  },
  success_screen: {
    title: '¡Preregistro Exitoso!',
    subtitle: 'Tu registro para {event_name} se ha completado correctamente.',
    alert_title: 'Revisa tu bandeja de correo electrónico',
    alert_description: 'Te hemos enviado tu boleto oficial de ingreso con tu Código QR personalizado directamente a tu e-mail. Por favor revisa tu bandeja de entrada (o correo no deseado). Deberás presentar dicho Código QR al ingresar al evento.',
    title_color: '#000000',
    subtitle_color: '#59585a',
    alert_bg_color: '#f8fafc',
    alert_border_color: '#cbd5e1',
    alert_text_color: '#1e293b'
  }
};

export default function FormCustomizer({ selectedEventId, embedded = false }) {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState(selectedEventId || null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formConfig, setFormConfig] = useState(DEFAULT_FORM_CONFIG);
  const [previewMode, setPreviewMode] = useState('form'); // 'form' | 'success'

  // New custom field state with allow_other option toggle
  const [newField, setNewField] = useState({ label: '', type: 'text', required: false, allow_other: false, placeholder: '', rawOptions: '' });
  const [addingField, setAddingField] = useState(false);
  const [previewOtherValues, setPreviewOtherValues] = useState({});

  // Sync with selectedEventId prop
  useEffect(() => {
    if (selectedEventId) {
      setActiveEventId(selectedEventId);
    }
  }, [selectedEventId]);

  // Fetch events list on mount
  useEffect(() => {
    setLoadingEvents(true);
    api.events.list()
      .then((res) => {
        if (res.success && res.data) {
          setEvents(res.data);
          if (selectedEventId) {
            setActiveEventId(selectedEventId);
          } else if (res.data.length > 0) {
            const active = res.data.find(e => e.status === 'active') || res.data[0];
            setActiveEventId(active.id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
  }, []);

  // Load event form config when activeEventId changes
  useEffect(() => {
    if (!activeEventId) return;
    setLoading(true);
    api.events.getById(activeEventId)
      .then((res) => {
        if (res.success && res.data) {
          setEventData(res.data);
          if (res.data.form_config) {
            setFormConfig({
              ...DEFAULT_FORM_CONFIG,
              ...res.data.form_config,
              form_title: res.data.form_config.form_title || '',
              form_description: res.data.form_config.form_description || '',
              styling: {
                ...DEFAULT_FORM_CONFIG.styling,
                ...(res.data.form_config.styling || {})
              }
            });
          } else {
            setFormConfig(DEFAULT_FORM_CONFIG);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeEventId]);

  const handleBaseFieldChange = (index, key, value) => {
    const updatedFields = [...formConfig.fields];
    updatedFields[index] = { ...updatedFields[index], [key]: value };
    setFormConfig({ ...formConfig, fields: updatedFields });
    setSaved(false);
  };

  const handleAddCustomField = () => {
    if (!newField.label.trim()) {
      message.warning('Por favor ingrese un nombre para el campo.');
      return;
    }

    if (newField.type === 'select' && !newField.rawOptions?.trim()) {
      message.warning('Por favor ingrese las opciones para la lista desplegable separadas por comas.');
      return;
    }

    const optionsArray = newField.rawOptions
      ? newField.rawOptions.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    const id = `custom_${Date.now()}`;
    const field = {
      ...newField,
      id,
      options: optionsArray,
      visible: true,
      order: (formConfig.custom_fields || []).length + 10
    };

    setFormConfig({
      ...formConfig,
      custom_fields: [...(formConfig.custom_fields || []), field]
    });

    setNewField({ label: '', type: 'text', required: false, allow_other: false, placeholder: '', rawOptions: '' });
    setAddingField(false);
    setSaved(false);
  };

  const handleRemoveCustomField = (index) => {
    const updated = [...(formConfig.custom_fields || [])];
    updated.splice(index, 1);
    setFormConfig({ ...formConfig, custom_fields: updated });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!activeEventId) {
      message.warning('Seleccione un evento primero.');
      return;
    }
    setSaving(true);
    try {
      await api.events.updateFormConfig(activeEventId, formConfig);
      const res = await api.events.update(activeEventId, { form_config: formConfig });
      if (res.success !== false) {
        message.success('✅ Configuración del formulario guardada exitosamente.');
        setSaved(true);
      } else {
        message.error('Error al guardar: ' + (res.error || 'Intente nuevamente.'));
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const visibleFields = [
    ...formConfig.fields.filter(f => f.visible && f.id !== 'category'),
    ...(formConfig.custom_fields || []).filter(f => f.visible)
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {!embedded ? (
            <>
              <Title level={2} style={{ margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
                Diseñador de Formulario<span style={{ color: '#c3302d' }}>.</span>
              </Title>
              <Text type="secondary" style={{ fontSize: '0.9rem' }}>
                Configure los campos, listas desplegables, opción "Otro" y la vista previa del formulario público de preregistro.
              </Text>
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: '0.88rem' }}>
              Personalización de campos y colores visuales del formulario de inscripción para este evento.
            </Text>
          )}
        </div>
        <Space>
          {saved && (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 12px' }}>
              Guardado
            </Tag>
          )}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            disabled={!activeEventId}
            style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700', minWidth: '150px' }}
          >
            Guardar Cambios
          </Button>
        </Space>
      </div>

      {/* Event Selector (only when not embedded) */}
      {!embedded && (
        <Card size="small" style={{ marginBottom: '20px', borderRadius: '8px', background: '#fafafa', border: '1px solid #e5e7eb' }}>
          <Space align="center" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <FormOutlined style={{ color: '#c3302d', fontSize: '1.1rem' }} />
              <Text strong style={{ fontSize: '0.9rem' }}>Evento a Personalizar:</Text>
              <Select
                style={{ minWidth: '300px' }}
                value={activeEventId}
                onChange={(val) => { setActiveEventId(val); setSaved(false); }}
                loading={loadingEvents}
                placeholder="Seleccionar evento..."
              >
                {events.map((e) => (
                  <Option key={e.id} value={e.id}>
                    {e.name} {e.status === 'active' ? '🟢 Active' : '⚪ Draft'}
                  </Option>
                ))}
              </Select>
            </Space>

            {eventData && (
              <Space wrap>
                <Tag color="blue">Preregistrados: {eventData.stats?.pre_registrations_count || 0}</Tag>
                <Button
                  size="small"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => window.open(`/register/${eventData.id}`, '_blank')}
                >
                  Formulario Público
                </Button>
                <Button
                  size="small"
                  type="link"
                  icon={<QrcodeOutlined style={{ color: '#059669' }} />}
                  onClick={() => window.open(`/scan/${eventData.id}`, '_blank')}
                  style={{ color: '#059669', fontWeight: 'bold' }}
                >
                  Lector QR Público
                </Button>
              </Space>
            )}
          </Space>
        </Card>
      )}

      {!activeEventId && !loadingEvents && (
        <Empty
          style={{ padding: '60px 0' }}
          description="Seleccione un evento de la lista para diseñar su formulario de preregistro."
        />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="Cargando configuración del formulario..." />
        </div>
      )}

      {activeEventId && !loading && (
        <Row gutter={[24, 24]}>
          {/* Left: Config panels */}
          <Col xs={24} xl={12}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">

              {/* Base Fields */}
              <Card
                title={
                  <Space>
                    <LayoutOutlined style={{ color: '#c3302d' }} />
                    <span style={{ fontWeight: '700' }}>Campos Base del Formulario</span>
                  </Space>
                }
                extra={<Text type="secondary" style={{ fontSize: '0.8rem' }}>Campos bloqueados siempre se incluyen</Text>}
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', gap: '8px', padding: '0 4px', marginBottom: '4px' }}>
                    <Text strong style={{ fontSize: '0.78rem', color: '#89888a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Etiqueta</Text>
                    <Text strong style={{ fontSize: '0.78rem', color: '#89888a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Visible</Text>
                    <Text strong style={{ fontSize: '0.78rem', color: '#89888a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Obligatorio</Text>
                  </div>

                  {formConfig.fields.filter(f => f.id !== 'category').map((f, idx) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 90px',
                        gap: '8px',
                        alignItems: 'center',
                        background: f.locked ? '#fafafa' : '#ffffff',
                        border: `1px solid ${f.locked ? '#e8d5d5' : '#e5e7eb'}`,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        borderLeft: f.locked ? '3px solid #c3302d' : '3px solid #e5e7eb'
                      }}
                    >
                      <Space size={8}>
                        {f.locked && (
                          <Tooltip title="Campo obligatorio del sistema">
                            <Tag color="red" style={{ fontSize: '0.7rem', lineHeight: '1.4', padding: '0 6px' }}>Base</Tag>
                          </Tooltip>
                        )}
                        <Input
                          value={f.label}
                          onChange={(e) => handleBaseFieldChange(idx, 'label', e.target.value)}
                          disabled={f.locked}
                          size="small"
                          style={{ fontWeight: f.locked ? '600' : '400' }}
                        />
                      </Space>
                      <div style={{ textAlign: 'center' }}>
                        <Switch
                          checked={f.visible}
                          onChange={(v) => handleBaseFieldChange(idx, 'visible', v)}
                          disabled={f.locked}
                          size="small"
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <Switch
                          checked={f.required}
                          onChange={(v) => handleBaseFieldChange(idx, 'required', v)}
                          disabled={f.locked}
                          size="small"
                          style={{ backgroundColor: f.required ? '#c3302d' : undefined }}
                        />
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>

              {/* Custom Fields (Includes Dropdowns & Option "Otro (especifique)") */}
              <Card
                title={
                  <Space>
                    <PlusOutlined style={{ color: '#059669' }} />
                    <span style={{ fontWeight: '700' }}>Campos Personalizados (Desplegables y Opción "Otro")</span>
                    <Badge count={(formConfig.custom_fields || []).length} style={{ backgroundColor: '#059669' }} />
                  </Space>
                }
                extra={
                  <Button
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setAddingField(!addingField)}
                    style={{ borderColor: '#059669', color: '#059669' }}
                  >
                    Agregar campo
                  </Button>
                }
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                {/* Add new field form */}
                {addingField && (
                  <div style={{ background: '#f0fdf4', border: '1px dashed #059669', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '12px', color: '#059669' }}>
                      Nuevo Campo Personalizado
                    </Text>
                    <Row gutter={[12, 12]}>
                      <Col span={12}>
                        <Text style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>Nombre / Etiqueta del campo *</Text>
                        <Input
                          placeholder="Ej: ¿Cómo se enteró?, Ciudad..."
                          value={newField.label}
                          onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                        />
                      </Col>
                      <Col span={12}>
                        <Text style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>Tipo de campo</Text>
                        <Select
                          style={{ width: '100%' }}
                          value={newField.type}
                          onChange={(v) => setNewField({ ...newField, type: v })}
                        >
                          {FIELD_TYPES.map(t => (
                            <Option key={t.value} value={t.value}>{t.label}</Option>
                          ))}
                        </Select>
                      </Col>

                      {/* Dropdown Options Input & "Otro" option toggle */}
                      {newField.type === 'select' && (
                        <Col span={24}>
                          <Text style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px', color: '#059669', fontWeight: 'bold' }}>
                            Opciones de la Lista Desplegable (Separadas por comas) *
                          </Text>
                          <Input.TextArea
                            rows={2}
                            placeholder="Ej: Redes Sociales, Correo Electrónico, Recomendación, Página Web"
                            value={newField.rawOptions || ''}
                            onChange={(e) => setNewField({ ...newField, rawOptions: e.target.value })}
                          />

                          <div style={{ marginTop: '8px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                            <Checkbox
                              checked={newField.allow_other}
                              onChange={(e) => setNewField({ ...newField, allow_other: e.target.checked })}
                              style={{ fontWeight: '600', color: '#047857' }}
                            >
                              Incluir automáticamente la opción "Otro (especifique)" en este desplegable
                            </Checkbox>
                          </div>
                        </Col>
                      )}

                      <Col span={24}>
                        <Checkbox
                          checked={newField.required}
                          onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                        >
                          Campo obligatorio
                        </Checkbox>
                      </Col>

                      <Col span={24} style={{ textAlign: 'right', marginTop: '8px' }}>
                        <Space>
                          <Button size="small" onClick={() => setAddingField(false)}>Cancelar</Button>
                          <Button size="small" type="primary" onClick={handleAddCustomField} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                            Guardar Campo
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* List of custom fields */}
                {(!formConfig.custom_fields || formConfig.custom_fields.length === 0) && !addingField ? (
                  <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '0.88rem' }}>
                    No se han agregado campos personalizados aún.
                  </Text>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {(formConfig.custom_fields || []).map((field, idx) => (
                      <div
                        key={field.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          borderLeft: '3px solid #059669'
                        }}
                      >
                        <Space direction="vertical" size={0}>
                          <Text strong style={{ fontSize: '0.88rem' }}>{field.label}</Text>
                          <Space size={6} wrap>
                            <Tag color="green" style={{ fontSize: '0.7rem' }}>
                              {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                            </Tag>
                            {field.required && <Tag color="red" style={{ fontSize: '0.7rem' }}>Obligatorio</Tag>}
                            {field.allow_other && <Tag color="purple" style={{ fontSize: '0.7rem' }}>+ Incluye "Otro (especifique)"</Tag>}
                            {field.options && field.options.length > 0 && (
                              <Tag color="blue" style={{ fontSize: '0.7rem' }}>{field.options.length} Opciones</Tag>
                            )}
                          </Space>
                          {field.options && field.options.length > 0 && (
                            <Text type="secondary" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              Opciones: {field.options.join(', ')} {field.allow_other ? '+ Otro (especifique)' : ''}
                            </Text>
                          )}
                        </Space>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveCustomField(idx)}
                        />
                      </div>
                    ))}
                  </Space>
                )}
              </Card>

              {/* Visual Styles Panel */}
              <Card
                title={
                  <Space>
                    <BgColorsOutlined style={{ color: '#c3302d' }} />
                    <span style={{ fontWeight: '700' }}>Estilo Visual y Colores del Formulario</span>
                  </Space>
                }
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <Row gutter={[16, 16]}>
                  {/* 1. Page Background Color */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      1. Fondo General (Página Exterior):
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={formConfig.styling.background_color || '#0a0a0b'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, background_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={formConfig.styling.background_color || '#0a0a0b'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, background_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>

                  {/* 2. Form Card Background Color */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      2. Fondo de la Tarjeta (Interior):
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={formConfig.styling.card_bg_color || '#ffffff'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, card_bg_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={formConfig.styling.card_bg_color || '#ffffff'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, card_bg_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>

                  {/* 3. Primary Color */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      3. Color Principal (Encabezado y Botón):
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={formConfig.styling.primary_color || '#c3302d'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, primary_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={formConfig.styling.primary_color || '#c3302d'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, primary_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>

                  {/* 4. Text Color */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      4. Color de Letras del Formulario:
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={formConfig.styling.text_color || '#000000'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, text_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={formConfig.styling.text_color || '#000000'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, text_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Success Screen Customization Panel */}
              <Card
                title={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: '700' }}>Mensaje de Confirmación Post-Envío (Textos y Colores)</span>
                  </Space>
                }
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong style={{ fontSize: '0.83rem', color: '#334155' }}>Título del Mensaje de Éxito:</Text>
                    <Input
                      value={formConfig.success_screen?.title || ''}
                      onChange={e => {
                        setFormConfig({
                          ...formConfig,
                          success_screen: { ...formConfig.success_screen, title: e.target.value }
                        });
                        setSaved(false);
                      }}
                      placeholder="Ej: ¡Preregistro Exitoso!"
                      style={{ marginTop: '4px' }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ fontSize: '0.83rem', color: '#334155' }}>Subtítulo / Mensaje Secundario (Admite {'{event_name}'}):</Text>
                    <Input.TextArea
                      rows={2}
                      value={formConfig.success_screen?.subtitle || ''}
                      onChange={e => {
                        setFormConfig({
                          ...formConfig,
                          success_screen: { ...formConfig.success_screen, subtitle: e.target.value }
                        });
                        setSaved(false);
                      }}
                      placeholder="Ej: Tu registro para {event_name} se ha completado correctamente."
                      style={{ marginTop: '4px' }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ fontSize: '0.83rem', color: '#334155' }}>Encabezado de Alerta de Correo:</Text>
                    <Input
                      value={formConfig.success_screen?.alert_title || ''}
                      onChange={e => {
                        setFormConfig({
                          ...formConfig,
                          success_screen: { ...formConfig.success_screen, alert_title: e.target.value }
                        });
                        setSaved(false);
                      }}
                      placeholder="Ej: Revisa tu bandeja de correo electrónico"
                      style={{ marginTop: '4px' }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ fontSize: '0.83rem', color: '#334155' }}>Descripción de Alerta de Correo:</Text>
                    <Input.TextArea
                      rows={3}
                      value={formConfig.success_screen?.alert_description || ''}
                      onChange={e => {
                        setFormConfig({
                          ...formConfig,
                          success_screen: { ...formConfig.success_screen, alert_description: e.target.value }
                        });
                        setSaved(false);
                      }}
                      placeholder="Ej: Te hemos enviado tu boleto oficial de ingreso con tu Código QR personalizado..."
                      style={{ marginTop: '4px' }}
                    />
                  </div>

                  <Text strong style={{ display: 'block', marginTop: '8px', fontSize: '0.88rem', color: '#0f172a' }}>
                    🎨 Paleta de Colores de la Pantalla de Éxito:
                  </Text>

                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Text style={{ fontSize: '0.78rem', color: '#64748b' }}>Color Título Éxito:</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <input
                          type="color"
                          value={formConfig.success_screen?.title_color || '#000000'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, title_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                        />
                        <Input
                          value={formConfig.success_screen?.title_color || '#000000'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, title_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          size="small"
                          style={{ width: '85px', fontFamily: 'monospace' }}
                        />
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text style={{ fontSize: '0.78rem', color: '#64748b' }}>Color Subtítulo:</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <input
                          type="color"
                          value={formConfig.success_screen?.subtitle_color || '#59585a'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, subtitle_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                        />
                        <Input
                          value={formConfig.success_screen?.subtitle_color || '#59585a'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, subtitle_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          size="small"
                          style={{ width: '85px', fontFamily: 'monospace' }}
                        />
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text style={{ fontSize: '0.78rem', color: '#64748b' }}>Fondo Alerta Correo:</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <input
                          type="color"
                          value={formConfig.success_screen?.alert_bg_color || '#f8fafc'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, alert_bg_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                        />
                        <Input
                          value={formConfig.success_screen?.alert_bg_color || '#f8fafc'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, alert_bg_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          size="small"
                          style={{ width: '85px', fontFamily: 'monospace' }}
                        />
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text style={{ fontSize: '0.78rem', color: '#64748b' }}>Borde Alerta Correo:</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <input
                          type="color"
                          value={formConfig.success_screen?.alert_border_color || '#cbd5e1'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, alert_border_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                        />
                        <Input
                          value={formConfig.success_screen?.alert_border_color || '#cbd5e1'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, alert_border_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          size="small"
                          style={{ width: '85px', fontFamily: 'monospace' }}
                        />
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text style={{ fontSize: '0.78rem', color: '#64748b' }}>Texto Alerta Correo:</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <input
                          type="color"
                          value={formConfig.success_screen?.alert_text_color || '#1e293b'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, alert_text_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                        />
                        <Input
                          value={formConfig.success_screen?.alert_text_color || '#1e293b'}
                          onChange={e => {
                            setFormConfig({
                              ...formConfig,
                              success_screen: { ...formConfig.success_screen, alert_text_color: e.target.value }
                            });
                            setSaved(false);
                          }}
                          size="small"
                          style={{ width: '85px', fontFamily: 'monospace' }}
                        />
                      </div>
                    </Col>
                  </Row>
                </Space>
              </Card>
            </Space>
          </Col>

          {/* Right: Live Preview of Public Form */}
          <Col xs={24} xl={12}>
            <div style={{ position: 'sticky', top: '20px' }}>
              <Card
                title={
                  <Space>
                    <EyeOutlined style={{ color: '#059669' }} />
                    <span style={{ fontWeight: '700' }}>Vista Previa en Tiempo Real del Formulario Público</span>
                  </Space>
                }
                extra={<Tag color="blue">URL: /register/{activeEventId?.slice(0, 8)}...</Tag>}
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <div
                  style={{
                    backgroundColor: formConfig.styling.background_color || '#0a0a0b',
                    borderRadius: '16px',
                    padding: '28px 16px',
                    maxHeight: '78vh',
                    overflowY: 'auto',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '440px',
                      margin: '0 auto',
                      backgroundColor: formConfig.styling.card_bg_color || '#ffffff',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header Banner filled with Primary Color */}
                    <div
                      style={{
                        backgroundColor: formConfig.styling.primary_color || '#c3302d',
                        padding: '24px 20px',
                        textAlign: 'center',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <img src={logoImg} alt="Íntegro" style={{ maxHeight: '48px', maxWidth: '220px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                    </div>

                    {/* Form Fields Preview Container */}
                    <div style={{ padding: '24px 20px', backgroundColor: formConfig.styling.card_bg_color || '#ffffff' }}>

                      {/* Header Segmented Switcher for Preview Mode */}
                      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <Segmented
                          size="small"
                          value={previewMode}
                          onChange={setPreviewMode}
                          options={[
                            { label: '📋 Formulario', value: 'form' },
                            { label: '🎉 Mensaje de Éxito', value: 'success' }
                          ]}
                        />
                      </div>

                      {previewMode === 'success' ? (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                          <CheckCircleOutlined style={{ fontSize: '3.2rem', color: '#10b981', marginBottom: '16px' }} />
                          <Title level={4} style={{ margin: '0 0 6px', fontWeight: '800', color: formConfig.success_screen?.title_color || '#000000' }}>
                            {formConfig.success_screen?.title || '¡Preregistro Exitoso!'}
                          </Title>
                          <Text style={{ display: 'block', fontSize: '0.88rem', color: formConfig.success_screen?.subtitle_color || '#59585a', marginBottom: '20px' }}>
                            {(formConfig.success_screen?.subtitle || 'Tu registro para {event_name} se ha completado correctamente.').replace('{event_name}', eventData?.name || 'el evento')}
                          </Text>

                          <div
                            style={{
                              textAlign: 'left',
                              borderRadius: '10px',
                              padding: '16px',
                              background: formConfig.success_screen?.alert_bg_color || '#f8fafc',
                              border: `1px solid ${formConfig.success_screen?.alert_border_color || '#cbd5e1'}`,
                              color: formConfig.success_screen?.alert_text_color || '#1e293b'
                            }}
                          >
                            <Space align="start">
                              <MailOutlined style={{ fontSize: '1.3rem', color: formConfig.styling.primary_color || '#c3302d', marginTop: '2px' }} />
                              <div>
                                <Text strong style={{ display: 'block', color: formConfig.success_screen?.alert_text_color || '#1e293b', marginBottom: '4px' }}>
                                  {formConfig.success_screen?.alert_title || 'Revisa tu bandeja de correo electrónico'}
                                </Text>
                                <Text style={{ fontSize: '0.8rem', color: formConfig.success_screen?.alert_text_color || '#1e293b', lineHeight: '1.5' }}>
                                  {formConfig.success_screen?.alert_description || 'Te hemos enviado tu boleto oficial de ingreso con tu Código QR personalizado directamente a tu e-mail.'}
                                </Text>
                              </div>
                            </Space>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <Title level={4} style={{ color: formConfig.styling.text_color || '#000000', margin: '0 0 4px', fontWeight: '800' }}>
                              {eventData?.name || 'Nombre del Evento'}<span style={{ color: formConfig.styling.primary_color || '#c3302d' }}>.</span>
                            </Title>
                            <Text style={{ color: '#59585a', fontSize: '0.82rem' }}>
                              {eventData?.description || 'Complete sus datos para recibir su pase corporativo de ingreso'}
                            </Text>
                          </div>

                          {visibleFields.map((field) => (
                            <div key={field.id} style={{ marginBottom: '14px' }}>
                              <Text
                                strong
                                style={{
                                  display: 'block',
                                  color: formConfig.styling.text_color || '#000000',
                                  marginBottom: '4px',
                                  fontSize: '0.83rem'
                                }}
                              >
                                {field.label} {field.required && <span style={{ color: formConfig.styling.primary_color || '#c3302d' }}>*</span>}
                              </Text>

                              {field.type === 'select' || field.type === 'select_with_other' ? (
                                <div>
                                  <Select
                                    placeholder={field.placeholder || `Seleccionar ${field.label.toLowerCase()}...`}
                                    style={{ width: '100%' }}
                                    onChange={(val) => {
                                      setPreviewOtherValues({
                                        ...previewOtherValues,
                                        [field.id]: val === 'Otro (especifique)'
                                      });
                                    }}
                                    options={[
                                      ...(field.options || []).map(o => ({ value: o, label: o })),
                                      ...((field.allow_other || field.type === 'select_with_other') ? [{ value: 'Otro (especifique)', label: 'Otro (especifique)' }] : [])
                                    ]}
                                  />
                                  {previewOtherValues[field.id] && (
                                    <Input
                                      placeholder="Especifique otro..."
                                      style={{ marginTop: '8px', borderRadius: '6px' }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <Input
                                  placeholder={field.placeholder || `Ingrese ${field.label.toLowerCase()}`}
                                  disabled
                                  style={{ borderRadius: '6px' }}
                                />
                              )}
                            </div>
                          ))}

                          <Button
                            type="primary"
                            block
                            style={{
                              marginTop: '16px',
                              height: '44px',
                              fontWeight: '800',
                              backgroundColor: formConfig.styling.primary_color || '#c3302d',
                              borderColor: formConfig.styling.primary_color || '#c3302d',
                              borderRadius: '8px'
                            }}
                          >
                            Completar Preregistro
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}
