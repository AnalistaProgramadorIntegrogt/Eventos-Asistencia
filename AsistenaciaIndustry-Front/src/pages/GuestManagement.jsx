import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Upload, Typography, Space, Popconfirm, message, Row, Col, Select, Switch, Tooltip, Segmented, Badge, QRCode } from 'antd';
import { UserAddOutlined, UploadOutlined, CopyOutlined, CheckOutlined, ReloadOutlined, PoweroffOutlined, FileExcelOutlined, SearchOutlined, DeleteOutlined, SyncOutlined, StarOutlined, GlobalOutlined, TeamOutlined, CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import { api } from '../services/apiService';

const { Title, Text } = Typography;

export default function GuestManagement({ selectedEventId, embedded = false }) {
  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState({ total_submissions: 0, confirmed_count: 0, pending_count: 0, declined_count: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'vip' | 'public'
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrModalGuest, setQrModalGuest] = useState(null);
  const [form] = Form.useForm();

  // Realtime Polling State
  const [realtimeActive, setRealtimeActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchSubmissions = async (silent = false) => {
    if (!selectedEventId) return;
    if (!silent) setLoading(true);
    else setIsSyncing(true);

    try {
      const res = await api.invitations.listByEvent(selectedEventId, { search: '', status: '' });
      if (res.success && res.data) {
        setSubmissions(res.data);
        if (res.summary) setSummary(res.summary);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
      setIsSyncing(false);
    }
  };

  // Initial Load + Auto Refresh
  useEffect(() => {
    fetchSubmissions(false);

    const interval = setInterval(() => {
      fetchSubmissions(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedEventId]);

  const handleCreateSingle = async (values) => {
    try {
      const res = await api.invitations.create(selectedEventId, values);
      if (res.success) {
        message.success('Invitación creada exitosamente.');
        setShowSingleModal(false);
        form.resetFields();
        fetchSubmissions(false);
      } else {
        message.error('Error: ' + res.error);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleImportCSV = async () => {
    if (fileList.length === 0) {
      message.warning('Por favor seleccione un archivo Excel o CSV.');
      return;
    }

    setUploading(true);
    try {
      const targetFile = fileList[0].originFileObj || fileList[0];
      const res = await api.invitations.importCSV(selectedEventId, targetFile);
      if (res.success !== false) {
        message.success(`Se importaron ${res.data?.count || res.imported_count || (res.data ? res.data.length : 0)} registrados exitosamente.`);
        setShowImportModal(false);
        setFileList([]);
        fetchSubmissions(false);
      } else {
        message.error('Error al importar: ' + (res.error || 'Verifique el formato del archivo.'));
      }
    } catch (err) {
      message.error('Error procesando archivo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (record, newStatus) => {
    try {
      const res = await api.invitations.updateStatus(record.id, newStatus);
      if (res.success) {
        message.success(`Estado actualizado a "${newStatus === 'confirmed' ? 'Registrado / Confirmado' : newStatus === 'declined' ? 'Rechazado' : 'Pendiente'}".`);
        fetchSubmissions(true);
      } else {
        message.error('No se pudo actualizar estado: ' + (res.error || 'Intente de nuevo.'));
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleRegenerate = async (id) => {
    try {
      const res = await api.invitations.regenerate(id);
      if (res.success) {
        message.success('Nuevo código generado: ' + res.data.code);
        fetchSubmissions(true);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleManualCheckin = async (record) => {
    try {
      const targetId = record.attendee_id || record.id;
      const res = await api.checkin.manualMark(selectedEventId, targetId);
      if (res.success !== false) {
        message.success(`✅ Asistencia registrada para ${record.guest_name || record.full_name || record.first_name || 'el invitado'}`);
        fetchSubmissions(true);
      } else {
        message.error(res.error || res.message || 'Error registrando asistencia.');
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const downloadQRImage = (guestName) => {
    const container = document.getElementById('guest-qr-download-container');
    const canvas = container?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const cleanName = (guestName || 'invitado').replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `QR_${cleanName}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('Código QR descargado exitosamente.');
    } else {
      message.error('No se pudo generar la imagen del código QR.');
    }
  };

  const copyLink = (inv) => {
    const code = inv.invitation_code || inv.code || inv.qr_code;
    const baseLink = `${window.location.origin}/public/events/${selectedEventId}`;
    const link = code ? `${baseLink}#${code}` : baseLink;
    navigator.clipboard.writeText(link);
    setCopiedCode(code || 'link');
    message.success('¡Enlace de invitación copiado!');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Helper check if record is VIP / imported
  const checkIsVip = (record) => {
    return record.is_imported || record.category_name === 'VIP' || record.event_categories?.name === 'VIP' || record.category_id === 'vip';
  };

  // Filtering Logic
  const filteredSubmissions = submissions.filter(item => {
    const isVip = checkIsVip(item);
    if (typeFilter === 'vip' && !isVip) return false;
    if (typeFilter === 'public' && isVip) return false;

    if (statusFilter && item.status !== statusFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const fullName = (item.full_name || item.guest_name || `${item.first_name || ''} ${item.last_name || ''}`).toLowerCase();
      const email = (item.email || item.guest_email || '').toLowerCase();
      const company = (item.company || item.guest_company || item.empresa || item.additional_data?.empresa || item.additional_data?.company || '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || company.includes(q);
    }
    return true;
  });

  // Calculate Metrics
  const vipSubmissions = submissions.filter(checkIsVip);
  const publicSubmissions = submissions.filter(item => !checkIsVip(item));

  const vipTotal = vipSubmissions.length;
  const vipConfirmed = vipSubmissions.filter(i => i.status === 'confirmed' || i.attended).length;
  const vipPending = vipSubmissions.filter(i => (!i.status || i.status === 'pending') && !i.attended).length;
  const publicTotal = publicSubmissions.length;

  const columns = [
    {
      title: 'Nombre Completo',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text, record) => {
        const name = text || record.guest_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Invitado';
        const email = record.email || record.guest_email;
        const job = record.job_title;
        return (
          <div>
            <Text strong style={{ display: 'block' }}>{name}</Text>
            {email && (
              <Text type="secondary" style={{ fontSize: '0.78rem', display: 'block' }}>
                {email}
              </Text>
            )}
            {job && (
              <Text type="secondary" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                {job}
              </Text>
            )}
          </div>
        );
      }
    },
    {
      title: 'Empresa',
      dataIndex: 'company',
      key: 'company',
      render: (text, record) => {
        const comp = text || record.company || record.guest_company || record.empresa || record.additional_data?.empresa || record.additional_data?.company;
        if (!comp) {
          return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
        }
        return <Text strong style={{ color: '#1e293b' }}>{comp}</Text>;
      }
    },
    {
      title: 'Origen de Lista',
      key: 'origin',
      render: (_, record) => {
        const isVip = checkIsVip(record);
        if (isVip) {
          return <Tag color="gold" icon={<StarOutlined />} style={{ fontWeight: 'bold' }}>⭐ VIP (Excel/CSV)</Tag>;
        }
        return <Tag color="blue" icon={<GlobalOutlined />}>🌐 Registro Web Público</Tag>;
      }
    },
    {
      title: 'Estado de Registro / RSVP',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const isVip = checkIsVip(record);
        const currentStatus = status || (record.is_active === false ? 'declined' : 'pending');
        
        return (
          <Select
            value={currentStatus}
            size="small"
            onChange={(val) => handleUpdateStatus(record, val)}
            style={{ minWidth: '150px' }}
          >
            <Select.Option value="confirmed">
              <Tag color="green" style={{ border: 'none', margin: 0 }}>🟢 {isVip ? 'VIP Registrado' : 'Confirmado'}</Tag>
            </Select.Option>
            <Select.Option value="pending">
              <Tag color="orange" style={{ border: 'none', margin: 0 }}>🟡 {isVip ? 'Pendiente Registro' : 'Pendiente'}</Tag>
            </Select.Option>
            <Select.Option value="declined">
              <Tag color="red" style={{ border: 'none', margin: 0 }}>🔴 Cancelado / No Asistirá</Tag>
            </Select.Option>
          </Select>
        );
      }
    },
    {
      title: 'Código / QR',
      dataIndex: 'invitation_code',
      key: 'invitation_code',
      render: (code, record) => {
        const displayCode = code || record.qr_code || record.code;
        if (!displayCode) {
          return <Tag color="orange" style={{ fontWeight: '500' }}>🟡 Pendiente (Sin QR)</Tag>;
        }
        return (
          <Text copyable style={{ fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#f4f5f7', padding: '2px 8px', borderRadius: '4px' }}>
            {displayCode}
          </Text>
        );
      }
    },
    {
      title: 'Asistencia Manual',
      key: 'manual_checkin',
      render: (_, record) => {
        const hasCheckedIn = record.status === 'checked_in' || record.checked_in === true || (record.checkins && record.checkins.length > 0);
        if (hasCheckedIn) {
          return <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontWeight: '600', padding: '4px 10px' }}>🟢 Asistió</Tag>;
        }
        return (
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleManualCheckin(record)}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: '600' }}
          >
            Marcar Asistencia
          </Button>
        );
      }
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver y Descargar Código QR">
            <Button
              size="small"
              icon={<QrcodeOutlined style={{ color: '#c3302d' }} />}
              onClick={() => {
                setQrModalGuest(record);
                setQrModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Copiar Enlace Personalizado">
            <Button
              size="small"
              icon={copiedCode === (record.invitation_code || record.code || record.qr_code) ? <CheckOutlined style={{ color: '#10b981' }} /> : <CopyOutlined />}
              onClick={() => copyLink(record)}
            />
          </Tooltip>
          <Tooltip title="Regenerar Código QR">
            <Popconfirm
              title="¿Regenerar código?"
              description="El código anterior dejará de ser válido."
              onConfirm={() => handleRegenerate(record.id)}
              okText="Sí, regenerar"
              cancelText="Cancelar"
            >
              <Button size="small" icon={<ReloadOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {!embedded && (
            <Title level={3} style={{ margin: 0, fontWeight: '700' }}>
              Gestión de Invitados VIP y Preregistros Públicos
            </Title>
          )}
        </div>

        <Space wrap>
          <Button icon={<UploadOutlined />} size={embedded ? "middle" : "large"} onClick={() => setShowImportModal(true)}>
            Cargar Excel / CSV
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            size={embedded ? "middle" : "large"}
            onClick={() => setShowSingleModal(true)}
            style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700' }}
          >
            Agregar Invitado VIP
          </Button>
        </Space>
      </div>

      {/* Summary Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" style={{ borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Total General</Text>
            <Title level={3} style={{ margin: 0 }}>{submissions.length}</Title>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={5}>
          <Card size="small" style={{ borderRadius: '8px', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Registros Web Públicos</Text>
            <Title level={3} style={{ margin: 0, color: '#6366f1' }}>{publicTotal}</Title>
          </Card>
        </Col>
      </Row>

      {/* Segmented Division Switcher */}
      <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text strong style={{ fontSize: '0.82rem', color: '#475569' }}>Filtrar División de Asistentes:</Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <Segmented
              size="middle"
              options={[
                { label: `Todos los Invitados (${submissions.length})`, value: 'all' },
                { label: `Invitados VIP por Excel (${vipTotal})`, value: 'vip' },
                { label: `Registros Web Públicos (${publicTotal})`, value: 'public' }
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />

            <Space wrap>
              <Input
                placeholder="Buscar por nombre, correo, empresa..."
                prefix={<SearchOutlined style={{ color: '#89888a' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '260px' }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '180px' }}
              >
                <Select.Option value="">Todos los Estados</Select.Option>
                <Select.Option value="confirmed">Registrados / Confirmados</Select.Option>
                <Select.Option value="pending">Pendientes de Registro</Select.Option>
                <Select.Option value="declined">Cancelados</Select.Option>
              </Select>
              <Button icon={<ReloadOutlined />} onClick={() => fetchSubmissions(false)}>
                Refrescar
              </Button>
            </Space>
          </div>
        </Space>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}>
        <Table
          dataSource={filteredSubmissions.map(i => ({ ...i, key: i.id }))}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal Crear Invitación Single */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}>Agregar Invitado VIP Manual</Title>}
        open={showSingleModal}
        onCancel={() => setShowSingleModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={handleCreateSingle} style={{ marginTop: '16px' }}>
          <Form.Item name="guest_name" label="Nombre Completo" rules={[{ required: true, message: 'Ingrese el nombre' }]}>
            <Input placeholder="Ej: Diego Medina" />
          </Form.Item>
          <Form.Item name="guest_email" label="Correo Electrónico" rules={[{ required: true, type: 'email', message: 'Ingrese un correo válido' }]}>
            <Input placeholder="ejemplo@empresa.com" />
          </Form.Item>
          <Form.Item name="company" label="Empresa (Opcional)">
            <Input placeholder="Ej: Íntegro Desarrolladora" />
          </Form.Item>
          <Form.Item name="job_title" label="Cargo (Opcional)">
            <Input placeholder="Ej: Director Comercial" />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setShowSingleModal(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#c3302d', borderColor: '#c3302d' }}>
                Guardar Invitado VIP
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal Importar Excel / CSV */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#10b981', fontSize: '1.4rem' }} />
            <Title level={4} style={{ margin: 0 }}>Cargar Lista Masiva de Invitados VIP (Excel / CSV)</Title>
          </Space>
        }
        open={showImportModal}
        onCancel={() => { setShowImportModal(false); setFileList([]); }}
        footer={[
          <Button key="back" onClick={() => { setShowImportModal(false); setFileList([]); }}>
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            onClick={handleImportCSV}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 'bold' }}
          >
            Comenzar Importación VIP
          </Button>
        ]}
      >
        <div style={{ margin: '16px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
            Suba un archivo con columnas <strong>Nombre, Correo, Empresa, Cargo</strong>. Todos los registros importados se categorizarán automáticamente como <strong>⭐ VIP</strong>.
          </Text>
          <Upload
            beforeUpload={(file) => {
              setFileList([file]);
              return false; // Evita envío automático
            }}
            fileList={fileList}
            onRemove={() => setFileList([])}
            accept=".xlsx, .xls, .csv"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Seleccionar archivo Excel / CSV</Button>
          </Upload>
        </div>
      </Modal>

      {/* Modal Ver y Descargar QR de Invitado */}
      <Modal
        title={
          <Space>
            <QrcodeOutlined style={{ color: '#c3302d', fontSize: '1.2rem' }} />
            <Text strong style={{ fontSize: '1.1rem' }}>Código QR de Entrada</Text>
          </Space>
        }
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            Cerrar
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => downloadQRImage(qrModalGuest?.guest_name || qrModalGuest?.full_name || qrModalGuest?.name)}
            style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: 'bold' }}
          >
            Descargar QR (.png)
          </Button>
        ]}
        width={380}
        centered
      >
        {qrModalGuest && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Title level={4} style={{ margin: 0, fontWeight: '700' }}>
              {qrModalGuest.guest_name || qrModalGuest.full_name || qrModalGuest.first_name || 'Invitado'}
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
              {qrModalGuest.guest_email || qrModalGuest.email || ''}
            </Text>

            <div id="guest-qr-download-container" style={{ display: 'inline-block', padding: '16px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
              <QRCode
                value={qrModalGuest.invitation_code || qrModalGuest.qr_code || qrModalGuest.code || 'N/A'}
                size={220}
                color="#111827"
                bordered={false}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <Text type="secondary" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código de Acceso:</Text>
              <Text strong style={{ display: 'block', fontFamily: 'monospace', fontSize: '1.1rem', color: '#c3302d', marginTop: '2px' }}>
                {qrModalGuest.invitation_code || qrModalGuest.qr_code || qrModalGuest.code || 'N/A'}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
