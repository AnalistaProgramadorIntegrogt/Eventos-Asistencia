import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Checkbox, Typography, Space, Popconfirm, Tabs, message } from 'antd';
import { UserAddOutlined, SearchOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../services/apiService';
import RoleManagement from './RoleManagement';

const { Title, Text } = Typography;

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.users.list(search, roleFilter);
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionsAndRoles = async () => {
    try {
      const [permRes, rolesRes] = await Promise.all([
        api.users.getPermissions(),
        api.roles.list()
      ]);
      if (permRes.success) setPermissionsCatalog(permRes.data);
      if (rolesRes.success) setRolesList(rolesRes.data);
    } catch (err) {
      console.error('Error fetching data', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPermissionsAndRoles();
  }, [roleFilter]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'operator', permissions: [], is_active: true });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    form.resetFields();
    form.setFieldsValue({
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'operator',
      permissions: user.permissions || [],
      is_active: user.is_active ?? true
    });
    setShowModal(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        const payload = {
          full_name: values.full_name,
          role: values.role,
          permissions: values.permissions || [],
          is_active: values.is_active
        };
        if (values.password) payload.password = values.password;

        const res = await api.users.update(editingUser.id, payload);
        if (res.success) {
          message.success('Usuario actualizado.');
          setShowModal(false);
          fetchUsers();
        } else {
          message.error('Error: ' + res.error);
        }
      } else {
        const res = await api.users.create(values);
        if (res.success) {
          message.success('Usuario creado exitosamente.');
          setShowModal(false);
          fetchUsers();
        } else {
          message.error('Error: ' + res.error);
        }
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDelete = async (id, email) => {
    if (currentUser?.id === id) {
      return message.warning('No puedes eliminar tu propio usuario activo.');
    }
    try {
      const res = await api.users.delete(id);
      if (res.success) {
        message.success(`Usuario ${email} eliminado.`);
        fetchUsers();
      } else {
        message.error('Error: ' + res.error);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    {
      title: 'Usuario / Correo',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <Text strong>{email}</Text>
    },
    {
      title: 'Nombre Completo',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name) => name || 'Sin nombre asignado'
    },
    {
      title: 'Rol de Acceso',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'super_admin' ? 'red' : role === 'admin' ? 'volcano' : 'blue'} icon={<SafetyCertificateOutlined />}>
          {role}
        </Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        <Tag color={active !== false ? 'success' : 'error'}>
          {active !== false ? 'Activo' : 'Inactivo'}
        </Tag>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>
            Editar
          </Button>

          <Popconfirm
            title="Eliminar usuario"
            description={`¿Estás seguro de eliminar a ${record.email}?`}
            onConfirm={() => handleDelete(record.id, record.email)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const userTabContent = (
    <>
      <Card bordered={false} style={{ marginBottom: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space>
            <Input
              placeholder="Buscar por correo o nombre..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={fetchUsers}
              style={{ width: '280px' }}
            />

            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: '180px' }}
              options={[
                { value: '', label: 'Todos los Roles' },
                ...rolesList.map(r => ({ value: r.name, label: r.name }))
              ]}
            />

            <Button icon={<SearchOutlined />} onClick={fetchUsers}>Buscar</Button>
          </Space>

          <Button icon={<ReloadOutlined />} onClick={fetchUsers} />
        </Space>
      </Card>

      <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={users.map(u => ({ ...u, key: u.id }))}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={<Title level={4} style={{ margin: 0 }}>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</Title>}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: '16px' }}>
          <Form.Item
            name="email"
            label={<Text strong>Correo Electrónico</Text>}
            rules={[
              { required: true, message: 'Ingrese correo electrónico' },
              { type: 'email', message: 'Ingrese correo válido' }
            ]}
          >
            <Input disabled={!!editingUser} placeholder="usuario@integro.gt" />
          </Form.Item>

          <Form.Item
            name="full_name"
            label={<Text strong>Nombre Completo</Text>}
            rules={[{ required: true, message: 'Ingrese nombre completo' }]}
          >
            <Input placeholder="Ej: Lic. Carlos Mendoza" />
          </Form.Item>

          <Form.Item
            name="password"
            label={<Text strong>Contraseña {editingUser ? '(Dejar en blanco para no cambiar)' : '*'}</Text>}
            rules={editingUser ? [] : [{ required: true, message: 'Ingrese contraseña' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item
            name="role"
            label={<Text strong>Rol de Acceso Base</Text>}
            rules={[{ required: true }]}
          >
            <Select
              options={rolesList.map(r => ({ value: r.name, label: r.name }))}
            />
          </Form.Item>

          <Form.Item
            name="permissions"
            label={<Text strong>Permisos Adicionales (Opcional)</Text>}
            tooltip="Asigne permisos específicos a este usuario independientemente de su rol base."
          >
            <Checkbox.Group style={{ width: '100%' }}>
              {Array.from(new Set(permissionsCatalog.map(p => p.category))).map(category => (
                <div key={category} style={{ marginBottom: '12px' }}>
                  <Text strong type="secondary" style={{ display: 'block', marginBottom: '8px' }}>{category}</Text>
                  <Space direction="vertical">
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

          <Form.Item name="is_active" valuePropName="checked">
            <Checkbox>Cuenta activa autorizada para inicio de sesión</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginTop: '24px', marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#c3302d', borderColor: '#c3302d' }}>
                {editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
            Gestión de Usuarios y Roles<span style={{ color: '#c3302d' }}>.</span>
          </Title>
          <Text type="secondary" style={{ fontSize: '0.9rem' }}>
            Administración de accesos corporativos y credenciales de personal
          </Text>
        </div>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          size="large"
          onClick={handleOpenCreate}
          style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700' }}
        >
          Crear Usuario
        </Button>
      </div>

      <Tabs 
        defaultActiveKey="1" 
        items={[
          {
            key: '1',
            label: 'Directorio de Usuarios',
            children: userTabContent,
          },
          {
            key: '2',
            label: 'Roles y Permisos',
            children: <RoleManagement permissionsCatalog={permissionsCatalog} />,
          },
        ]}
      />
    </div>
  );
}
