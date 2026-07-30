import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Button, Modal, Tag, Typography, Space, message } from 'antd';
import { SearchOutlined, CheckOutlined, CloseOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '../services/apiService';

const { Title, Text } = Typography;

export default function ManualCheckIn({ selectedEventId, currentUser }) {
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const userPerms = currentUser?.permissions || [];

  const hasPerm = (permKey) => {
    if (isSuperAdmin) return true;
    if (Array.isArray(userPerms) && userPerms.length > 0) {
      return userPerms.includes(permKey);
    }
    if (isAdmin) return true;
    return false;
  };

  const canMark = hasPerm('MARK_ATTENDANCE_MANUAL');
  const canUnmark = hasPerm('UNMARK_ATTENDANCE_MANUAL');

  const [query, setQuery] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [markModal, setMarkModal] = useState(null);
  const [unmarkModal, setUnmarkModal] = useState(null);
  const [unmarkReason, setUnmarkReason] = useState('');

  const searchAttendees = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await api.checkin.search(selectedEventId, query);
      if (res.success) {
        setAttendees(res.data);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchAttendees();
  }, [selectedEventId]);

  const confirmMark = async () => {
    if (!markModal) return;
    try {
      const operatorName = currentUser?.full_name || 'Administrador (Manual)';
      const res = await api.checkin.manualMark(selectedEventId, markModal.id, operatorName);
      if (res.success) {
        message.success('Asistencia marcada correctamente.');
        setMarkModal(null);
        searchAttendees();
      } else {
        message.error('Error: ' + res.error);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const confirmUnmark = async () => {
    if (!unmarkModal) return;
    if (!unmarkReason.trim()) return message.warning('Ingrese el motivo de auditoría');

    try {
      const operatorName = currentUser?.full_name || 'Administrador (Manual)';
      const res = await api.checkin.manualUnmark(selectedEventId, unmarkModal.id, operatorName, unmarkReason);
      if (res.success) {
        message.success('Asistencia desmarcada e ingresada a auditoría.');
        setUnmarkModal(null);
        setUnmarkReason('');
        searchAttendees();
      } else {
        message.error('Error: ' + res.error);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    {
      title: 'Asistente',
      key: 'name',
      render: (_, r) => <Text strong>{r.first_name} {r.last_name}</Text>
    },
    {
      title: 'Correo',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Empresa / Cargo',
      key: 'company',
      render: (_, r) => r.company ? `${r.company} (${r.job_title || 'N/A'})` : 'N/A'
    },
    {
      title: 'Categoría',
      dataIndex: 'event_categories',
      key: 'category',
      render: (cat, record) => {
        const name = cat?.name || record.category_name;
        if (!name) return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
        return <Tag color="purple" style={{ fontWeight: 'bold' }}>{name}</Tag>;
      }
    },
    {
      title: 'Código QR',
      dataIndex: 'qr_code',
      key: 'qr_code',
      render: (code) => (
        <Text copyable style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {code}
        </Text>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'checked_in' ? 'success' : 'warning'}>
          {status === 'checked_in' ? 'ASISTIÓ' : 'PENDIENTE'}
        </Tag>
      )
    },
    {
      title: 'Acción Manual',
      key: 'actions',
      render: (_, r) => {
        const isCheckedIn = r.status === 'checked_in';
        if (!isCheckedIn) {
          if (!canMark) return <Tag color="default">Sin permiso para marcar</Tag>;
          return (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              onClick={() => setMarkModal(r)}
            >
              Marcar Asistencia
            </Button>
          );
        } else {
          if (!canUnmark) return <Tag color="success">🟢 Asistió</Tag>;
          return (
            <Button
              size="small"
              icon={<CloseOutlined />}
              danger
              onClick={() => setUnmarkModal(r)}
            >
              Desmarcar
            </Button>
          );
        }
      }
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
          Búsqueda y Asistencia Manual<span style={{ color: '#c3302d' }}>.</span>
        </Title>
        <Text type="secondary" style={{ fontSize: '0.9rem' }}>
          Consulta por Nombre, Email, Empresa o Código QR para marcaciones directas
        </Text>
      </div>

      <Card bordered={false} style={{ marginBottom: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <form onSubmit={(e) => { e.preventDefault(); searchAttendees(); }}>
          <Space style={{ width: '100%', maxWidth: '600px' }}>
            <Input
              size="large"
              placeholder="Buscar asistente por Nombre, Correo, Empresa..."
              prefix={<SearchOutlined />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '420px' }}
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={searchAttendees}
              style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700' }}
            >
              Buscar
            </Button>
          </Space>
        </form>
      </Card>

      <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={attendees.map(a => ({ ...a, key: a.id }))}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal Confirm Mark */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}>Confirmar Asistencia Manual</Title>}
        open={!!markModal}
        onCancel={() => setMarkModal(null)}
        onOk={confirmMark}
        okText="Confirmar Check-In"
        cancelText="Cancelar"
        okButtonProps={{ style: { backgroundColor: '#059669', borderColor: '#059669' } }}
      >
        {markModal && (
          <Text style={{ fontSize: '1rem' }}>
            ¿Deseas registrar la asistencia de <strong>{markModal.first_name} {markModal.last_name}</strong>?
          </Text>
        )}
      </Modal>

      {/* Modal Confirm Unmark */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#e11d48' }} />
            <Title level={4} style={{ margin: 0, color: '#e11d48' }}>Desmarcar Asistencia (Auditoría)</Title>
          </Space>
        }
        open={!!unmarkModal}
        onCancel={() => setUnmarkModal(null)}
        onOk={confirmUnmark}
        okText="Desmarcar y Registrar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        {unmarkModal && (
          <Space direction="vertical" style={{ width: '100%', padding: '8px 0' }} size="middle">
            <Text>
              Se desmarcará el registro de <strong>{unmarkModal.first_name} {unmarkModal.last_name}</strong>. Ingrese motivo:
            </Text>
            <Input
              placeholder="Ej: Corrección por marcación involuntaria"
              value={unmarkReason}
              onChange={(e) => setUnmarkReason(e.target.value)}
            />
          </Space>
        )}
      </Modal>
    </div>
  );
}
