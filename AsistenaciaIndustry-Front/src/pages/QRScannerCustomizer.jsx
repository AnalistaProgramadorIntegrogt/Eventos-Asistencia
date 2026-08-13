import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Form, Input, Button, Select, Switch, Upload,
  Typography, Space, Spin, message, Tag, Empty, Tooltip,
  Badge, Result
} from 'antd';
import {
  SaveOutlined, EyeOutlined, LayoutOutlined, BgColorsOutlined,
  QrcodeOutlined, CheckCircleOutlined, FormOutlined,
  CheckCircleFilled, EditOutlined, ShopOutlined, VideoCameraOutlined,
  PictureOutlined, GlobalOutlined, SettingOutlined, UploadOutlined,
  FontSizeOutlined
} from '@ant-design/icons';
import { api } from '../services/apiService';
import logoImg from '../assets/Logo.png';
import { logoBase64 } from '../assets/logoBase64.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const DEFAULT_FORM_CONFIG = {
  header_brand_text: 'InnovaPark',
  header_logo_url: '',
  scanner_title: 'Control de Acceso',
  event_tagline: 'INNOVA PARK - Event',
  status_label_success: 'Entrada registrada',
  status_label_already_used: 'Entrada ya registrada previamente',
  status_label_invalid: 'Código denegado / No válido',
  pill_label_prefix: 'Ingresó a las',
  show_clock: true,
  show_logo: true,
  show_input_box: false,
  styling: {
    background_color: '#f8f6f8',
    card_bg_color: '#f7f5f9',
    header_gradient_start: '#ff4e00',
    header_gradient_end: '#e63900',
    primary_color: '#ff4e00',
    text_color: '#1c1c24',
    clock_color: '#ffffff',
    pill_bg_color: 'rgba(255, 255, 255, 0.75)',
    bg_image_url: '',
    bg_video_url: ''
  }
};

export default function QRScannerCustomizer({ selectedEventId, embedded = false }) {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState(selectedEventId || null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState('demo'); // 'demo' | 'empty'

  const [formConfig, setFormConfig] = useState(DEFAULT_FORM_CONFIG);

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
              header_brand_text: res.data.form_config.header_brand_text !== undefined ? res.data.form_config.header_brand_text : 'InnovaPark',
              header_logo_url: res.data.form_config.header_logo_url !== undefined ? res.data.form_config.header_logo_url : '',
              scanner_title: res.data.form_config.scanner_title !== undefined ? res.data.form_config.scanner_title : 'Control de Acceso',
              event_tagline: res.data.form_config.event_tagline !== undefined ? res.data.form_config.event_tagline : `${res.data.name || 'INNOVA PARK'} - Event`,
              status_label_success: res.data.form_config.status_label_success || 'Entrada registrada',
              status_label_already_used: res.data.form_config.status_label_already_used || 'Entrada ya registrada previamente',
              status_label_invalid: res.data.form_config.status_label_invalid || 'Código denegado / No válido',
              pill_label_prefix: res.data.form_config.pill_label_prefix || 'Ingresó a las',
              show_clock: res.data.form_config.show_clock !== false,
              show_logo: res.data.form_config.show_logo !== false,
              show_input_box: res.data.form_config.show_input_box === true,
              styling: {
                ...DEFAULT_FORM_CONFIG.styling,
                ...(res.data.form_config.styling || {})
              }
            });
          } else {
            setFormConfig({
              ...DEFAULT_FORM_CONFIG,
              event_tagline: `${res.data.name || 'INNOVA PARK'} - Event`
            });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeEventId]);

  const handleFileUpload = async (file, isStylingField, keyName) => {
    const hideMsg = message.loading('Subiendo archivo multimedia...', 0);
    try {
      const res = await api.uploadMedia(file);
      hideMsg();
      if (res && res.success && res.url) {
        const fileUrl = res.url;
        if (isStylingField) {
          setFormConfig(prev => ({
            ...prev,
            styling: {
              ...prev.styling,
              [keyName]: fileUrl
            }
          }));
        } else {
          setFormConfig(prev => ({
            ...prev,
            [keyName]: fileUrl
          }));
        }
        setSaved(false);
        message.success('✅ Archivo subido y configurado correctamente.');
        return false;
      }
    } catch (err) {
      console.warn('Fallo subida al servidor, usando fallback local Base64:', err);
    }
    
    // Fallback local a Base64 si el upload falla o no está disponible
    const reader = new FileReader();
    reader.onload = (e) => {
      hideMsg();
      const base64Data = e.target.result;
      if (isStylingField) {
        setFormConfig(prev => ({
          ...prev,
          styling: {
            ...prev.styling,
            [keyName]: base64Data
          }
        }));
      } else {
        setFormConfig(prev => ({
          ...prev,
          [keyName]: base64Data
        }));
      }
      setSaved(false);
      message.success('✅ Archivo multimedia cargado correctamente.');
    };
    reader.readAsDataURL(file);
    return false; // Prevent Ant Design default HTTP POST
  };

  const handleSave = async () => {
    if (!activeEventId) {
      message.warning('Seleccione un evento primero.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.events.updateFormConfig(activeEventId, formConfig);
      if (res.success !== false) {
        message.success('✅ Configuración del Lector QR guardada exitosamente.');
        setSaved(true);
      } else {
        message.error('Error al guardar: ' + (res.error || 'Intente nuevamente.'));
      }
    } catch (err) {
      message.error(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const styling = formConfig.styling || DEFAULT_FORM_CONFIG.styling;
  const headerLogoSource = formConfig.header_logo_url;
  const gradientStart = styling.header_gradient_start || '#ff4e00';
  const gradientEnd = styling.header_gradient_end || '#e63900';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {!embedded ? (
            <>
              <Title level={2} style={{ margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
                Diseñador de Tarjeta de Lector QR<span style={{ color: '#c3302d' }}>.</span>
              </Title>
              <Text type="secondary" style={{ fontSize: '0.9rem' }}>
                Personalice los colores de las olas de la tarjeta, textos de marca, logos y vista previa idéntica en tiempo real.
              </Text>
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: '0.88rem' }}>
              Personalización de la tarjeta idéntica: marca, logo, olas de degradado y etiquetas.
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
              <QrcodeOutlined style={{ color: '#c3302d', fontSize: '1.1rem' }} />
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
              <Button
                size="small"
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => window.open(`/scan/${eventData.id}`, '_blank')}
                style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 'bold' }}
              >
                Abrir Lector QR Público
              </Button>
            )}
          </Space>
        </Card>
      )}

      {!activeEventId && !loadingEvents && (
        <Empty
          style={{ padding: '60px 0' }}
          description="Seleccione un evento de la lista para diseñar su pantalla de lector QR."
        />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="Cargando configuración del Lector QR..." />
        </div>
      )}

      {activeEventId && !loading && (
        <Row gutter={[24, 24]}>
          {/* Left: Config Panels */}
          <Col xs={24} xl={12}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">

              {/* 1. Header Brand & Text Customizer */}
              <Card
                title={
                  <Space>
                    <FontSizeOutlined style={{ color: '#c3302d' }} />
                    <span style={{ fontWeight: '700' }}>Marca y Textos de la Tarjeta</span>
                  </Space>
                }
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <Form layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label={<Text strong style={{ fontSize: '0.85rem' }}>1. Texto de Marca (Derecha):</Text>}>
                        <Input
                          value={formConfig.header_brand_text || ''}
                          placeholder="Ej: InnovaPark"
                          onChange={(e) => {
                            setFormConfig({ ...formConfig, header_brand_text: e.target.value });
                            setSaved(false);
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={<Text strong style={{ fontSize: '0.85rem' }}>2. Título de Módulo (Centro):</Text>}>
                        <Input
                          value={formConfig.scanner_title || ''}
                          placeholder="Ej: Control de Acceso"
                          onChange={(e) => {
                            setFormConfig({ ...formConfig, scanner_title: e.target.value });
                            setSaved(false);
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label={<Text strong style={{ fontSize: '0.85rem' }}>3. Subtítulo / Tagline del Evento:</Text>}>
                    <Input
                      value={formConfig.event_tagline || ''}
                      placeholder="Ej: INNOVA PARK - Event"
                      onChange={(e) => {
                        setFormConfig({ ...formConfig, event_tagline: e.target.value });
                        setSaved(false);
                      }}
                    />
                  </Form.Item>

                  <Form.Item label={<Text strong style={{ fontSize: '0.85rem' }}>4. Logo de Cabecera (Cargar archivo o URL):</Text>}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="URL de logo o cargue archivo de imagen"
                        prefix={<GlobalOutlined style={{ color: '#c3302d' }} />}
                        value={formConfig.header_logo_url ? (formConfig.header_logo_url.startsWith('data:') ? '🏷️ Logo de cabecera cargado' : formConfig.header_logo_url) : ''}
                        onChange={(e) => {
                          setFormConfig({ ...formConfig, header_logo_url: e.target.value });
                          setSaved(false);
                        }}
                      />
                      <Upload beforeUpload={(file) => handleFileUpload(file, false, 'header_logo_url')} showUploadList={false} accept="image/*">
                        <Button icon={<UploadOutlined />} style={{ fontWeight: '600', borderColor: '#c3302d', color: '#c3302d' }}>
                          Subir Logo
                        </Button>
                      </Upload>
                    </Space.Compact>
                  </Form.Item>
                </Form>
              </Card>

              {/* 2. Colors & Gradient Customizer */}
              <Card
                title={
                  <Space>
                    <BgColorsOutlined style={{ color: '#ff4e00' }} />
                    <span style={{ fontWeight: '700' }}>Personalización de Colores y Olas de Degradado</span>
                  </Space>
                }
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <Row gutter={[16, 16]}>
                  {/* Gradient Color 1 */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      1. Color Degradado Olas (Inicio):
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={gradientStart}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, header_gradient_start: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={gradientStart}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, header_gradient_start: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>

                  {/* Gradient Color 2 */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      2. Color Degradado Olas (Fin):
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={gradientEnd}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, header_gradient_end: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={gradientEnd}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, header_gradient_end: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>

                  {/* Inner Card Background */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      3. Fondo Centro de la Tarjeta:
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={styling.card_bg_color || '#f7f5f9'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, card_bg_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={styling.card_bg_color || '#f7f5f9'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, card_bg_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>

                  {/* Outer Page Background */}
                  <Col span={12}>
                    <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                      4. Fondo General Exterior:
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="color"
                        value={styling.background_color || '#f8f6f8'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, background_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <Input
                        value={styling.background_color || '#f8f6f8'}
                        onChange={e => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, background_color: e.target.value } });
                          setSaved(false);
                        }}
                        style={{ width: '90px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}
                        maxLength={7}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 3. Background Video / Image Options */}
              <Card
                title={
                  <Space>
                    <VideoCameraOutlined style={{ color: '#059669' }} />
                    <span style={{ fontWeight: '700' }}>Fondo Multimedia (Video MP4 / Foto) y Toggles</span>
                  </Space>
                }
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <Form layout="vertical">
                  <Form.Item label={<Text strong style={{ fontSize: '0.85rem' }}>🎬 Video MP4 de Fondo (Cargar archivo o URL):</Text>}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="Cargue archivo MP4 o pegue URL de video"
                        prefix={<VideoCameraOutlined style={{ color: '#059669' }} />}
                        value={styling.bg_video_url ? (styling.bg_video_url.startsWith('data:') ? '🎥 Archivo de video cargado' : styling.bg_video_url) : ''}
                        onChange={(e) => {
                          setFormConfig({ ...formConfig, styling: { ...formConfig.styling, bg_video_url: e.target.value } });
                          setSaved(false);
                        }}
                      />
                      <Upload beforeUpload={(file) => handleFileUpload(file, true, 'bg_video_url')} showUploadList={false} accept="video/mp4,video/webm">
                        <Button icon={<UploadOutlined />} style={{ fontWeight: '600', borderColor: '#059669', color: '#059669' }}>
                          Subir Video
                        </Button>
                      </Upload>
                    </Space.Compact>
                  </Form.Item>

                  <Row gutter={12}>
                    <Col span={8}>
                      <div style={{ background: '#fafafa', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '0.78rem' }}>Reloj Vivo:</Text>
                        <Switch
                          size="small"
                          checked={formConfig.show_clock}
                          onChange={(v) => {
                            setFormConfig({ ...formConfig, show_clock: v });
                            setSaved(false);
                          }}
                        />
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ background: '#fafafa', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '0.78rem' }}>Mostrar Logo:</Text>
                        <Switch
                          size="small"
                          checked={formConfig.show_logo}
                          onChange={(v) => {
                            setFormConfig({ ...formConfig, show_logo: v });
                            setSaved(false);
                          }}
                        />
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ background: '#fafafa', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '0.78rem' }}>Texto Manual:</Text>
                        <Switch
                          size="small"
                          checked={formConfig.show_input_box}
                          onChange={(v) => {
                            setFormConfig({ ...formConfig, show_input_box: v });
                            setSaved(false);
                          }}
                        />
                      </div>
                    </Col>
                  </Row>
                </Form>
              </Card>

              {/* Direct Open Button */}
              <Card size="small" style={{ borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <Text strong style={{ color: '#047857', display: 'block' }}>Pantalla Pública Lista para Estación de Ingreso</Text>
                    <Text type="secondary" style={{ fontSize: '0.8rem' }}>URL pública libre de contraseña para tablets o laptops en la entrada.</Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => window.open(`/scan/${activeEventId}`, '_blank')}
                    style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 'bold' }}
                  >
                    Abrir Lector QR Público
                  </Button>
                </div>
              </Card>
            </Space>
          </Col>

          {/* Right: Live Interactive Preview Card Matching Image 100% */}
          <Col xs={24} xl={12}>
            <div style={{ position: 'sticky', top: '20px' }}>
              <Card
                title={
                  <Space>
                    <EyeOutlined style={{ color: '#059669' }} />
                    <span style={{ fontWeight: '700' }}>Vista Previa Idéntica en Tiempo Real</span>
                  </Space>
                }
                extra={
                  <Space size="small">
                    <Button
                      size="small"
                      type={previewMode === 'demo' ? 'primary' : 'default'}
                      onClick={() => setPreviewMode('demo')}
                    >
                      Demo (Escaneo)
                    </Button>
                    <Button
                      size="small"
                      type={previewMode === 'empty' ? 'primary' : 'default'}
                      onClick={() => setPreviewMode('empty')}
                    >
                      Espera (QR)
                    </Button>
                  </Space>
                }
                bordered={false}
                style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}
              >
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: styling.background_color || '#f8f6f8',
                    borderRadius: '16px',
                    padding: '36px 16px',
                    maxHeight: '78vh',
                    overflowY: 'auto',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  {/* 100% IDENTICAL CARD MATCHING USER MOCKUP IMAGE */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '520px',
                      minHeight: '340px',
                      borderRadius: '32px',
                      overflow: 'hidden',
                      backgroundColor: styling.card_bg_color || '#f7f5f9',
                      boxShadow: '0 25px 60px rgba(255, 78, 0, 0.22), 0 8px 24px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(255,255,255,0.9)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* SVG Wave Background Overlay */}
                    <svg
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 0,
                        pointerEvents: 'none'
                      }}
                      viewBox="0 0 520 340"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="prevHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={gradientStart} />
                          <stop offset="100%" stopColor={gradientEnd} />
                        </linearGradient>
                        <linearGradient id="prevWave1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={gradientStart} stopOpacity="0.85" />
                          <stop offset="100%" stopColor={gradientEnd} stopOpacity="0.95" />
                        </linearGradient>
                        <linearGradient id="prevWave2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={gradientEnd} stopOpacity="0.75" />
                          <stop offset="100%" stopColor={gradientStart} stopOpacity="0.85" />
                        </linearGradient>
                      </defs>

                      <rect width="520" height="340" fill="url(#prevHeaderGrad)" />
                      <path
                        d="M 0,90 
                           C 130,90 140,200 0,300 
                           L 0,340 
                           L 330,340 
                           C 390,270 430,190 520,140 
                           L 520,90 
                           Z"
                        fill={styling.card_bg_color || '#f7f5f9'}
                      />
                      <path d="M 520,150 C 410,210 380,280 330,340 L 520,340 Z" fill="url(#prevWave1)" />
                      <path d="M 520,200 C 450,250 420,300 380,340 L 520,340 Z" fill="url(#prevWave2)" />
                      <path d="M 520,240 C 470,280 450,310 420,340 L 520,340 Z" fill="url(#prevHeaderGrad)" />
                    </svg>

                    {/* Top Bar: Clock on Left (WHITE) | Logo & Brand Text on Right (WHITE) */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: '20px 28px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#ffffff'
                      }}
                    >
                      {/* Clock (WHITE) */}
                      {formConfig.show_clock !== false ? (
                        <div style={{ fontSize: '2.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'system-ui, sans-serif', lineHeight: 1 }}>
                          11:42:47
                        </div>
                      ) : <div />}

                      {/* Header Brand Logo & Text */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {formConfig.show_logo !== false && (
                          headerLogoSource ? (
                            <img src={headerLogoSource} alt="Brand" style={{ maxHeight: '34px', maxWidth: '100px', objectFit: 'contain' }} />
                          ) : null
                        )}
                        {formConfig.header_brand_text !== '' && (
                          <span style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.02em', fontFamily: 'system-ui, sans-serif' }}>
                            {formConfig.header_brand_text !== undefined ? formConfig.header_brand_text : 'InnovaPark'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: '14px 32px 28px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexGrow: 1
                      }}
                    >
                      {formConfig.scanner_title ? (
                        <div style={{ fontSize: '1.1rem', color: '#33333e', fontWeight: '500', marginBottom: '2px', fontFamily: 'system-ui, sans-serif' }}>
                          {formConfig.scanner_title}
                        </div>
                      ) : null}

                      {previewMode === 'demo' ? (
                        <>
                          <div style={{ color: '#2e7d32', fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px' }}>
                            {formConfig.status_label_success || 'Entrada registrada'}
                          </div>

                          <Title level={3} style={{ margin: '0 0 2px', fontWeight: '800', color: styling.text_color || '#1c1c24', fontSize: '1.9rem', fontFamily: 'system-ui, sans-serif' }}>
                            Diego Medina
                          </Title>

                          <div style={{ fontSize: '0.9rem', color: '#33333e', fontWeight: '600', marginBottom: '18px', fontFamily: 'system-ui, sans-serif' }}>
                            {formConfig.event_tagline || `${eventData?.name || 'INNOVA PARK'} - Event`}
                          </div>

                          <div
                            style={{
                              backgroundColor: styling.pill_bg_color || 'rgba(255, 255, 255, 0.75)',
                              backdropFilter: 'blur(8px)',
                              borderRadius: '999px',
                              padding: '8px 24px',
                              display: 'inline-block',
                              fontSize: '0.88rem',
                              color: '#444455',
                              fontWeight: '600',
                              border: '1px solid rgba(255, 255, 255, 0.8)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                            }}
                          >
                            {formConfig.pill_label_prefix || 'Ingresó a las'} <strong>11:37</strong>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.75)', borderRadius: '18px', border: '1px dashed #cbd5e1', width: '100%', maxWidth: '320px', marginTop: '6px' }}>
                          <QrcodeOutlined style={{ fontSize: '2.5rem', color: gradientStart, marginBottom: '6px' }} />
                          <Text style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                            Listo para escanear Código QR
                          </Text>
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
