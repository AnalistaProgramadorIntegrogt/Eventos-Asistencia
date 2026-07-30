import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Progress, Button, Spin, Alert, Typography, Space, Tooltip, Empty } from 'antd';
import {
  UsergroupAddOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  TagOutlined,
  ReloadOutlined,
  BarChartOutlined,
  AuditOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { api } from '../services/apiService';

const { Title, Text, Paragraph } = Typography;

export default function AdminDashboard({ selectedEventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboard.getMetrics(selectedEventId);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Error al cargar métricas corporativas');
      }
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servidor API backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [selectedEventId]);

  if (!selectedEventId) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <Empty description="No hay un evento activo seleccionado. Por favor cree o seleccione un evento en el Catálogo de Eventos." />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="Cargando datos ejecutivos y métricas en tiempo real..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error de Conexión"
        description={error}
        type="error"
        showIcon
        action={
          <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} type="primary" danger>
            Reintentar
          </Button>
        }
        style={{ marginBottom: '24px' }}
      />
    );
  }

  const metrics = data?.metrics || { invitados: 0, preregistrados: 0, asistieron: 0, pendientes: 0, no_show: 0 };
  const auditLogs = data?.audit_logs || [];
  const topCompanies = data?.charts?.top_companies || [];
  const categoryData = data?.charts?.categories || [];

  const totalPrereg = metrics.preregistrados || 1;
  const attendancePct = Math.round((metrics.asistieron / totalPrereg) * 100);

  const auditColumns = [
    {
      title: 'Fecha / Hora',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <Text style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {new Date(date).toLocaleString('es-GT')}
        </Text>
      )
    },
    {
      title: 'Usuario Responsable',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (name) => <Text strong>{name || 'Operador de Sistema'}</Text>
    },
    {
      title: 'Acción Ejecutada',
      dataIndex: 'action',
      key: 'action',
      render: (action) => {
        const isReversed = action.includes('REVERSED');
        return (
          <Tag color={isReversed ? 'error' : 'warning'}>
            {action}
          </Tag>
        );
      }
    },
    {
      title: 'Detalles de la Operación',
      dataIndex: 'details',
      key: 'details',
      render: (details) => (
        <Text type="secondary" style={{ fontSize: '0.85rem' }}>
          {typeof details === 'object' ? JSON.stringify(details) : details}
        </Text>
      )
    }
  ];

  return (
    <div>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
            Dashboard Ejecutivo<span style={{ color: '#c3302d' }}>.</span>
          </Title>
          <Text type="secondary" style={{ fontSize: '0.9rem' }}>
            Indicadores clave de rendimiento (KPIs) y control de asistencia corporativa en vivo
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchDashboardData}>
          Actualizar Datos
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: '28px' }}>
        <Col xs={24} sm={12} md={8} lg={4.8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderTop: '3px solid #000000' }}>
            <Statistic
              title={<Text strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#89888a' }}>Invitados</Text>}
              value={metrics.invitados}
              prefix={<TagOutlined style={{ color: '#000000' }} />}
              valueStyle={{ fontWeight: '700', letterSpacing: '-0.04em' }}
            />
            <Text type="secondary" style={{ fontSize: '0.78rem' }}>Códigos emitidos</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4.8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderTop: '3px solid #89888a' }}>
            <Statistic
              title={<Text strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#89888a' }}>Preregistrados</Text>}
              value={metrics.preregistrados}
              prefix={<UsergroupAddOutlined style={{ color: '#89888a' }} />}
              valueStyle={{ fontWeight: '700', letterSpacing: '-0.04em' }}
            />
            <Text type="secondary" style={{ fontSize: '0.78rem' }}>Formulario completado</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4.8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderTop: '3px solid #c3302d' }}>
            <Statistic
              title={<Text strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#c3302d' }}>Asistieron (Check-in)</Text>}
              value={metrics.asistieron}
              prefix={<CheckCircleOutlined style={{ color: '#c3302d' }} />}
              valueStyle={{ color: '#c3302d', fontWeight: '700', letterSpacing: '-0.04em' }}
            />
            <Text strong style={{ color: '#c3302d', fontSize: '0.78rem' }}>
              {attendancePct}% de conversión
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4.8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderTop: '3px solid #d97706' }}>
            <Statistic
              title={<Text strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#d97706' }}>Pendientes</Text>}
              value={metrics.pendientes}
              prefix={<ClockCircleOutlined style={{ color: '#d97706' }} />}
              valueStyle={{ color: '#d97706', fontWeight: '700', letterSpacing: '-0.04em' }}
            />
            <Text type="secondary" style={{ fontSize: '0.78rem' }}>Por ingresar</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4.8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderTop: '3px solid #e11d48' }}>
            <Statistic
              title={<Text strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#e11d48' }}>No-Show</Text>}
              value={metrics.no_show}
              prefix={<CloseCircleOutlined style={{ color: '#e11d48' }} />}
              valueStyle={{ color: '#e11d48', fontWeight: '700', letterSpacing: '-0.04em' }}
            />
            <Text type="secondary" style={{ fontSize: '0.78rem' }}>Ausentes confirmados</Text>
          </Card>
        </Col>
      </Row>

      {/* Analytics Section */}
      <Row gutter={[24, 24]} style={{ marginBottom: '28px' }}>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#7c3aed' }} />
                <span>Invitados por Categoría Interna</span>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}
          >
            {categoryData.length === 0 ? (
              <Text type="secondary">Sin registros por categoría interna aún.</Text>
            ) : (
              categoryData.map((cat, idx) => {
                const totalInCat = cat.total || 0;
                const grandTotal = metrics.total_submissions || metrics.total_guests || 0;
                const pct = cat.category_pct !== undefined ? cat.category_pct : (grandTotal > 0 ? Math.round((totalInCat / grandTotal) * 100) : 0);

                return (
                  <div key={idx} style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                      <Text strong>{cat.name}</Text>
                      <Space>
                        <Text type="secondary" style={{ fontSize: '0.82rem' }}>
                          {totalInCat} invitado(s) {grandTotal > 0 ? `de ${grandTotal} total` : ''}
                        </Text>
                        <Tag color="purple" style={{ fontWeight: 'bold', margin: 0 }}>
                          {pct}%
                        </Tag>
                      </Space>
                    </div>
                    <Progress percent={pct} strokeColor="#7c3aed" showInfo={false} />
                  </div>
                );
              })
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <ShopOutlined style={{ color: '#000000' }} />
                <span>Empresas Representadas</span>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}
          >
            {topCompanies.length === 0 ? (
              <Text type="secondary">No hay datos corporativos aún.</Text>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {topCompanies.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      borderLeft: idx === 0 ? '3px solid #c3302d' : '3px solid #000000'
                    }}
                  >
                    <Text strong>{idx + 1}. {c.company}</Text>
                    <Space size="small">
                      <Tag color="black">{c.count} {c.count === 1 ? 'ejecutivo' : 'ejecutivos'}</Tag>
                      {c.checked_in_count > 0 && <Tag color="green">🟢 {c.checked_in_count} en sala</Tag>}
                    </Space>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* Audit Log Table */}
      <Card
        title={
          <Space>
            <AuditOutlined style={{ color: '#c3302d' }} />
            <span>Registro de Auditoría y Modificaciones Manuales</span>
          </Space>
        }
        bordered={false}
        style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}
      >
        <Table
          dataSource={auditLogs.map(item => ({ ...item, key: item.id }))}
          columns={auditColumns}
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: 'No hay registros de auditoría almacenados' }}
        />
      </Card>
    </div>
  );
}
