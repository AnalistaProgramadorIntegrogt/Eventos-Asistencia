import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Button, Modal, Drawer, Form, Input, Switch, Tag, Select,
  Typography, Space, Popconfirm, message, Divider, DatePicker, Empty,
  Skeleton, Tooltip, Badge, Tabs, QRCode
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, EnvironmentOutlined, LinkOutlined,
  CheckOutlined, LockOutlined, UnlockOutlined, DeleteOutlined,
  EditOutlined, ReloadOutlined, MailOutlined, GlobalOutlined,
  PictureOutlined, UsergroupAddOutlined, ArrowLeftOutlined, SlidersOutlined, QrcodeOutlined
} from '@ant-design/icons';
import { api } from '../services/apiService';
import GuestManagement from './GuestManagement';
import EmailTemplateCustomizer from './EmailTemplateCustomizer';
import FormCustomizer from './FormCustomizer';
import QRScannerCustomizer from './QRScannerCustomizer';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Helper: format date for display
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function EventManagement({ selectedEventId, setSelectedEventId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [managingGuestsEvent, setManagingGuestsEvent] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrModalData, setQrModalData] = useState({ url: '', eventName: '' });
  const [form] = Form.useForm();

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchEvents = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.events.list();
      if (res.success) {
        setEvents(res.data || []);
        if (!selectedEventId && (res.data || []).length > 0) {
          const first = res.data.find(e => e.status === 'active') || res.data[0];
          setSelectedEventId(first.id);
        }
      } else {
        if (!isSilent) message.error('Error cargando eventos: ' + (res.error || 'Intente nuevamente.'));
      }
    } catch (err) {
      if (!isSilent) message.error(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(false);
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── Create / Edit ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
      invitation_code_required: false,
      confirmation_message: '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada QR.'
    });
    setShowModal(true);
  };

  const openEdit = (evt) => {
    setEditTarget(evt);
    form.setFieldsValue({
      name: evt.name,
      description: evt.description || '',
      start_date: evt.start_date ? evt.start_date.slice(0, 16) : '',
      end_date: evt.end_date ? evt.end_date.slice(0, 16) : '',
      location: evt.location || '',
      banner_url: evt.banner_url || '',
      logo_url: evt.logo_url || '',
      status: evt.status || 'active',
      invitation_code_required: evt.invitation_code_required || false,
      confirmation_message: evt.confirmation_message || '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada QR.'
    });
    setShowModal(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        description: values.description || null,
        start_date: values.start_date || new Date().toISOString(),
        end_date: values.end_date || null,
        location: values.location || null,
        banner_url: values.banner_url || null,
        logo_url: values.logo_url || null,
        status: values.status || 'active',
        invitation_code_required: values.invitation_code_required || false,
        confirmation_message: values.confirmation_message ||
          '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada QR.'
      };

      let res;
      if (editTarget) {
        res = await api.events.update(editTarget.id, payload);
      } else {
        res = await api.events.create(payload);
      }

      if (res.success) {
        message.success(editTarget ? '✅ Evento actualizado exitosamente.' : '✅ Evento creado exitosamente.');
        setShowModal(false);
        form.resetFields();
        setEditTarget(null);
        fetchEvents();
      } else {
        message.error('Error: ' + (res.error || 'Intente nuevamente.'));
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id, name) => {
    try {
      const res = await api.events.delete(id);
      if (res.success) {
        message.success(`Evento "${name}" eliminado.`);
        if (selectedEventId === id) setSelectedEventId(null);
        fetchEvents();
      } else {
        message.error('Error eliminando evento: ' + (res.error || 'Intente nuevamente.'));
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // ─── Copy Link ──────────────────────────────────────────────────────────────

  const copyLink = (eventId) => {
    const url = `${window.location.origin}/public/events/${eventId}`;
    navigator.clipboard.writeText(url);
    message.success('¡Enlace de preregistro copiado!');
  };

  // ─── Modal Component ────────────────────────────────────────────────────────
  const renderModal = () => (
    <Modal
      title={
        <Space>
          <CalendarOutlined style={{ color: '#c3302d' }} />
          <Title level={4} style={{ margin: 0 }}>
            {editTarget ? `Editar: ${editTarget.name}` : 'Crear Nuevo Evento Corporativo'}
          </Title>
        </Space>
      }
      open={showModal}
      onCancel={() => { setShowModal(false); setEditTarget(null); form.resetFields(); }}
      footer={null}
      destroyOnClose
      width={640}
      styles={{ body: { paddingTop: '8px' } }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Name */}
        <Form.Item
          name="name"
          label={<Text strong>Nombre del Evento <span style={{ color: '#c3302d' }}>*</span></Text>}
          rules={[{ required: true, message: 'El nombre del evento es obligatorio' }]}
        >
          <Input
            size="large"
            placeholder="Ej: Convención de Innovación Íntegro 2026"
            prefix={<CalendarOutlined style={{ color: '#89888a' }} />}
          />
        </Form.Item>

        {/* Description */}
        <Form.Item name="description" label={<Text strong>Descripción</Text>}>
          <TextArea
            rows={3}
            placeholder="Agenda, objetivo y detalles del evento corporativo..."
            showCount
            maxLength={1000}
          />
        </Form.Item>

        {/* Dates */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="start_date"
              label={<Text strong>Fecha y Hora de Inicio <span style={{ color: '#c3302d' }}>*</span></Text>}
              rules={[{ required: true, message: 'La fecha de inicio es obligatoria' }]}
            >
              <Input type="datetime-local" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_date" label={<Text strong>Fecha y Hora de Fin</Text>}>
              <Input type="datetime-local" size="large" />
            </Form.Item>
          </Col>
        </Row>

        {/* Location */}
        <Form.Item name="location" label={<Text strong>Ubicación / Sede</Text>}>
          <Input
            placeholder="Ej: Real Intercontinental Guatemala, Salón Esmeralda"
            prefix={<EnvironmentOutlined style={{ color: '#89888a' }} />}
          />
        </Form.Item>

        {/* URLs */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="banner_url" label={<Text strong>URL de Banner / Imagen</Text>}>
              <Input
                placeholder="https://..."
                prefix={<PictureOutlined style={{ color: '#89888a' }} />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="logo_url" label={<Text strong>URL de Logo del Evento</Text>}>
              <Input
                placeholder="https://..."
                prefix={<GlobalOutlined style={{ color: '#89888a' }} />}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Status */}
        <Form.Item name="status" label={<Text strong>Estado del Evento</Text>}>
          <Select size="large">
            <Option value="active">
              <Badge status="success" text="Activo — recibiendo registros" />
            </Option>
            <Option value="inactive">
              <Badge status="warning" text="Inactivo — registro cerrado" />
            </Option>
            <Option value="finished">
              <Badge status="default" text="Finalizado" />
            </Option>
          </Select>
        </Form.Item>

        {/* Invitation Code */}
        <Form.Item
          name="invitation_code_required"
          valuePropName="checked"
          label={<Text strong>Control de Acceso</Text>}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fafafa', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <Form.Item name="invitation_code_required" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
            <div>
              <Text strong style={{ display: 'block', fontSize: '0.9rem' }}>Requerir Código de Invitación</Text>
              <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                Activado: solo ingresan quienes tengan código VIP. Desactivado: registro público abierto.
              </Text>
            </div>
          </div>
        </Form.Item>

        {/* Confirmation Message */}
        <Form.Item
          name="confirmation_message"
          label={
            <Space>
              <MailOutlined style={{ color: '#c3302d' }} />
              <Text strong>Mensaje de Confirmación</Text>
            </Space>
          }
        >
          <TextArea
            rows={2}
            placeholder="Mensaje que verá el invitado al registrarse exitosamente..."
          />
        </Form.Item>

        {/* Footer Buttons */}
        <Form.Item style={{ marginBottom: 0, marginTop: '8px', textAlign: 'right' }}>
          <Space>
            <Button
              onClick={() => { setShowModal(false); setEditTarget(null); form.resetFields(); }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={editTarget ? <EditOutlined /> : <PlusOutlined />}
              style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700' }}
            >
              {editTarget ? 'Actualizar Evento' : 'Crear Evento'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  // ─── Vista Dedicada del Evento / Workspace ─────────────────────────────────
  if (managingGuestsEvent) {
    return (
      <div>
        {/* Botón para volver al catálogo */}
        <div style={{ marginBottom: '20px' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => setManagingGuestsEvent(null)}
            style={{ fontWeight: '600', marginBottom: '16px' }}
          >
            Volver al Catálogo de Eventos
          </Button>

          {/* Banner de Cabecera del Evento */}
          <Card
            bordered={false}
            style={{
              borderRadius: '12px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
              background: 'linear-gradient(135deg, #111827 0%, #000000 100%)',
              color: '#ffffff'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <Space style={{ marginBottom: '8px' }}>
                  <Tag
                    style={{
                      backgroundColor: managingGuestsEvent.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: managingGuestsEvent.status === 'active' ? '#34d399' : '#fbbf24',
                      border: `1px solid ${managingGuestsEvent.status === 'active' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                      fontWeight: '600',
                      borderRadius: '6px',
                      padding: '3px 10px'
                    }}
                  >
                    {managingGuestsEvent.status === 'active' ? '● ACTIVO' : '● INACTIVO'}
                  </Tag>
                  <Tag
                    icon={managingGuestsEvent.invitation_code_required ? <LockOutlined style={{ color: '#fbbf24' }} /> : <UnlockOutlined style={{ color: '#34d399' }} />}
                    style={{
                      backgroundColor: managingGuestsEvent.invitation_code_required ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: managingGuestsEvent.invitation_code_required ? '#fbbf24' : '#34d399',
                      border: `1px solid ${managingGuestsEvent.invitation_code_required ? 'rgba(251, 191, 36, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`,
                      fontWeight: '600',
                      borderRadius: '6px',
                      padding: '3px 10px'
                    }}
                  >
                    {managingGuestsEvent.invitation_code_required ? 'Con Código' : 'Registro Libre'}
                  </Tag>
                </Space>

                <Title level={2} style={{ color: '#ffffff', margin: '4px 0 8px', fontWeight: '700' }}>
                  {managingGuestsEvent.name}
                </Title>

                <Space size="large" style={{ flexWrap: 'wrap', color: '#9ca3af', fontSize: '0.88rem' }}>
                  <Space>
                    <CalendarOutlined style={{ color: '#c3302d' }} />
                    <span>{fmtDate(managingGuestsEvent.start_date)}</span>
                  </Space>
                  {managingGuestsEvent.location && (
                    <Space>
                      <EnvironmentOutlined style={{ color: '#c3302d' }} />
                      <span>{managingGuestsEvent.location}</span>
                    </Space>
                  )}
                </Space>
              </div>

              <Space wrap>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => openEdit(managingGuestsEvent)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'transparent', color: '#ffffff', fontWeight: '600' }}
                >
                  Editar Evento
                </Button>
                <Button
                  icon={<LinkOutlined />}
                  onClick={() => copyLink(managingGuestsEvent.id)}
                  style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', color: '#ffffff', fontWeight: '600' }}
                >
                  Formulario Público
                </Button>
                <Button
                  icon={<QrcodeOutlined />}
                  onClick={() => window.open(`/scan/${managingGuestsEvent.id}`, '_blank')}
                  style={{ backgroundColor: '#059669', borderColor: '#059669', color: '#ffffff', fontWeight: '600' }}
                >
                  Lector QR Público
                </Button>
              </Space>
            </div>
          </Card>
        </div>

        {/* Tabs de Gestión del Evento */}
        <Tabs
          defaultActiveKey="guests"
          type="card"
          size="large"
          style={{ marginTop: '20px' }}
          items={[
            {
              key: 'guests',
              label: (
                <Space>
                  <UsergroupAddOutlined style={{ color: '#c3302d' }} />
                  <span style={{ fontWeight: '600' }}>Gestión de Invitados</span>
                </Space>
              ),
              children: <GuestManagement selectedEventId={managingGuestsEvent.id} embedded={true} />
            },
            {
              key: 'form',
              label: (
                <Space>
                  <SlidersOutlined style={{ color: '#c3302d' }} />
                  <span style={{ fontWeight: '600' }}>Diseñador del Formulario</span>
                </Space>
              ),
              children: <FormCustomizer selectedEventId={managingGuestsEvent.id} embedded={true} />
            },
            {
              key: 'scanner-designer',
              label: (
                <Space>
                  <QrcodeOutlined style={{ color: '#059669' }} />
                  <span style={{ fontWeight: '600' }}>Diseñador de Lector QR</span>
                </Space>
              ),
              children: <QRScannerCustomizer selectedEventId={managingGuestsEvent.id} embedded={true} />
            },
            {
              key: 'email',
              label: (
                <Space>
                  <MailOutlined style={{ color: '#c3302d' }} />
                  <span style={{ fontWeight: '600' }}>Plantilla de Correo</span>
                </Space>
              ),
              children: <EmailTemplateCustomizer selectedEventId={managingGuestsEvent.id} />
            }
          ]}
        />

        {renderModal()}
      </div>
    );
  }

  // ─── Vista Principal / Catálogo ──────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
            Catálogo de Eventos<span style={{ color: '#c3302d' }}>.</span>
          </Title>
          <Text type="secondary" style={{ fontSize: '0.9rem' }}>
            Gestión de conferencias, asambleas y actividades corporativas de Íntegro
          </Text>
        </div>
        <Space>
          <Tooltip title="Recargar lista">
            <Button icon={<ReloadOutlined />} onClick={fetchEvents} loading={loading} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openCreate}
            style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700' }}
          >
            Crear Nuevo Evento
          </Button>
        </Space>
      </div>

      {/* Event Grid */}
      {loading ? (
        <Row gutter={[24, 24]}>
          {[1, 2, 3].map(i => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card><Skeleton active /></Card>
            </Col>
          ))}
        </Row>
      ) : events.length === 0 ? (
        <Empty
          style={{ padding: '80px 0' }}
          description={
            <span>
              No hay eventos creados aún.{' '}
              <a onClick={openCreate} style={{ color: '#c3302d', cursor: 'pointer' }}>Crea el primero</a>.
            </span>
          }
        />
      ) : (
        <Row gutter={[24, 24]}>
          {events.map((evt) => {
            const isSelected = evt.id === selectedEventId;
            return (
              <Col xs={24} sm={12} lg={8} key={evt.id}>
                <Card
                  hoverable
                  onClick={() => {
                    setSelectedEventId(evt.id);
                    setManagingGuestsEvent(evt);
                  }}
                  style={{
                    borderRadius: '12px',
                    borderTop: isSelected ? '4px solid #c3302d' : '4px solid transparent',
                    boxShadow: isSelected
                      ? '0 8px 28px rgba(195,48,45,0.2)'
                      : '0 4px 14px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  {/* Status row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                    <Tag
                      style={{
                        backgroundColor: evt.status === 'active' ? '#ecfdf5' : '#fffbeb',
                        color: evt.status === 'active' ? '#059669' : '#d97706',
                        border: `1px solid ${evt.status === 'active' ? '#a7f3d0' : '#fde68a'}`,
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        borderRadius: '6px'
                      }}
                    >
                      {evt.status === 'active' ? '● ACTIVO' : '● INACTIVO'}
                    </Tag>
                    <Tag
                      icon={evt.invitation_code_required ? <LockOutlined style={{ color: '#d97706' }} /> : <UnlockOutlined style={{ color: '#16a34a' }} />}
                      style={{
                        backgroundColor: evt.invitation_code_required ? '#fffbeb' : '#f0fdf4',
                        color: evt.invitation_code_required ? '#d97706' : '#16a34a',
                        border: `1px solid ${evt.invitation_code_required ? '#fde68a' : '#bbf7d0'}`,
                        fontSize: '0.75rem',
                        borderRadius: '6px'
                      }}
                    >
                      {evt.invitation_code_required ? 'Con Código' : 'Registro Libre'}
                    </Tag>
                  </div>

                  {/* Event Name */}
                  <Title level={4} style={{ margin: '0 0 6px', color: '#000000', fontWeight: '700', lineHeight: '1.3' }}>
                    {evt.name}
                  </Title>

                  {/* Description */}
                  <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ fontSize: '0.85rem', marginBottom: '16px', minHeight: '40px' }}
                  >
                    {evt.description || 'Sin descripción asignada.'}
                  </Paragraph>

                  {/* Metadata */}
                  <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: '18px' }}>
                    <Space style={{ fontSize: '0.82rem', color: '#59585a' }}>
                      <CalendarOutlined style={{ color: '#c3302d' }} />
                      <span>{fmtDate(evt.start_date)}</span>
                    </Space>
                    {evt.end_date && (
                      <Space style={{ fontSize: '0.82rem', color: '#59585a' }}>
                        <CalendarOutlined style={{ color: '#89888a' }} />
                        <span>Fin: {fmtDate(evt.end_date)}</span>
                      </Space>
                    )}
                    {evt.location && (
                      <Space style={{ fontSize: '0.82rem', color: '#59585a' }}>
                        <EnvironmentOutlined style={{ color: '#89888a' }} />
                        <Text ellipsis style={{ maxWidth: '220px', fontSize: '0.82rem' }}>{evt.location}</Text>
                      </Space>
                    )}
                  </Space>

                  <Divider style={{ margin: '0 0 14px' }} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="primary"
                      icon={<UsergroupAddOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventId(evt.id);
                        setManagingGuestsEvent(evt);
                      }}
                      style={{
                        backgroundColor: '#c3302d',
                        borderColor: '#c3302d',
                        fontWeight: '700',
                        flex: 1
                      }}
                    >
                      Gestionar Invitados
                    </Button>

                    <Tooltip title="Editar Evento">
                      <Button
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(evt);
                        }}
                      />
                    </Tooltip>

                    <Tooltip title="Copiar enlace de preregistro público">
                      <Button
                        icon={<LinkOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyLink(evt.id);
                        }}
                      />
                    </Tooltip>

                    <Tooltip title="Mostrar QR del formulario">
                      <Button
                        icon={<QrcodeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalData({
                            url: `${window.location.origin}/public/events/${evt.id}`,
                            eventName: evt.name
                          });
                          setQrModalVisible(true);
                        }}
                      />
                    </Tooltip>

                    <Popconfirm
                      title="Eliminar evento"
                      description={`¿Confirma eliminar "${evt.name}"? Esta acción no se puede deshacer.`}
                      onConfirm={() => handleDelete(evt.id, evt.name)}
                      okText="Sí, eliminar"
                      cancelText="Cancelar"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Eliminar">
                        <Button
                          icon={<DeleteOutlined />}
                          danger
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {renderModal()}

      <Modal
        title={
          <Space>
            <QrcodeOutlined style={{ color: '#c3302d' }} />
            <span style={{ fontWeight: '700' }}>QR del Formulario</span>
          </Space>
        }
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" type="primary" style={{ backgroundColor: '#c3302d', borderColor: '#c3302d' }} onClick={() => setQrModalVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Title level={5} style={{ marginBottom: '20px' }}>
            {qrModalData.eventName}
          </Title>
          <div style={{ display: 'inline-block', padding: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <QRCode
              value={qrModalData.url || '-'}
              size={220}
              color="#29282D"
              bordered={false}
            />
          </div>
          <Paragraph type="secondary" style={{ marginTop: '16px', fontSize: '0.9rem' }}>
            Escanea este código para acceder al formulario de preregistro público.
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
}
