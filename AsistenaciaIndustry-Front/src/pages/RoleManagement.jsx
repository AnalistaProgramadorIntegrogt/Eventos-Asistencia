import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Checkbox, Typography, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../services/apiService';

const { Title, Text } = Typography;

export default function RoleManagement({ permissionsCatalog, onRolesChange }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form] = Form.useForm();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.roles.list();
      if (res.success) {
        setRoles(res.data);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenCreate = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setShowModal(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    form.resetFields();
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      permissions: role.permissions || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRole) {
        const res = await api.roles.update(editingRole.name, values);
        if (res.success) {
          message.success('Rol actualizado exitosamente.');
          setShowModal(false);
          fetchRoles();
          if (onRolesChange) onRolesChange();
        } else {
          message.error('Error: ' + res.error);
        }
      } else {
        const res = await api.roles.create(values);
        if (res.success) {
          message.success('Rol creado exitosamente.');
          setShowModal(false);
          fetchRoles();
          if (onRolesChange) onRolesChange();
        } else {
          message.error('Error: ' + res.error);
        }
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDelete = async (name) => {
    try {
      const res = await api.roles.delete(name);
      if (res.success) {
        message.success(`Rol ${name} eliminado.`);
        fetchRoles();
        if (onRolesChange) onRolesChange();
      } else {
        message.error('Error: ' + res.error);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    {
      title: 'Nombre del Rol',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Permisos',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions) => (
        <Space size={[0, 8]} wrap>
          {permissions && permissions.length > 0 ? permissions.map(p => (
            <Tag color="blue" key={p}>{p}</Tag>
          )) : <Text type="secondary">Sin permisos</Text>}
        </Space>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => {
        const isBaseRole = ['super_admin', 'admin', 'operator'].includes(record.name);
        return (
          <Space size="small">
            <Button 
              size="small" 
              icon={<EditOutlined />} 
              onClick={() => handleOpenEdit(record)}
              disabled={record.name === 'super_admin'}
            >
              Editar
            </Button>
            <Popconfirm
              title="Eliminar rol"
              description={`¿Estás seguro de eliminar el rol ${record.name}?`}
              onConfirm={() => handleDelete(record.name)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              disabled={isBaseRole}
            >
              <Button size="small" icon={<DeleteOutlined />} danger disabled={isBaseRole} />
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return (
    <div>
      <Card bordered={false} style={{ marginBottom: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700' }}
          >
            Crear Rol Personalizado
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchRoles} />
        </Space>
      </Card>

      <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={roles.map(r => ({ ...r, key: r.name }))}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={<Title level={4} style={{ margin: 0 }}>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</Title>}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: '16px' }}>
          <Form.Item
            name="name"
            label={<Text strong>Nombre del Rol (Identificador único)</Text>}
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input disabled={!!editingRole} placeholder="Ej: validador_vip" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<Text strong>Descripción</Text>}
          >
            <Input.TextArea placeholder="Breve descripción del propósito de este rol" rows={2} />
          </Form.Item>

          <Form.Item
            name="permissions"
            label={<Text strong>Permisos Asociados</Text>}
            tooltip="Selecciona las acciones que este rol tendrá permitidas."
          >
            <Checkbox.Group style={{ width: '100%' }}>
              {Array.from(new Set(permissionsCatalog.map(p => p.category))).map(category => (
                <div key={category} style={{ marginBottom: '12px' }}>
                  <Text strong type="secondary" style={{ display: 'block', marginBottom: '8px' }}>{category}</Text>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {permissionsCatalog.filter(p => p.category === category).map(perm => (
                      <Checkbox key={perm.id} value={perm.id}>
                        {perm.name} <Text type="secondary" style={{ fontSize: '0.75rem' }}>({perm.id})</Text>
                      </Checkbox>
                    ))}
                  </Space>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>

          <Form.Item style={{ marginTop: '24px', marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#c3302d', borderColor: '#c3302d' }}>
                {editingRole ? 'Actualizar Rol' : 'Guardar Rol'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
