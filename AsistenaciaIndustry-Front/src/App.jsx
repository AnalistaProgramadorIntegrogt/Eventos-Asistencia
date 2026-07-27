import React, { useEffect, useState } from 'react';
import { Layout, Menu, Select, Typography, Space, Avatar, Dropdown, Button, ConfigProvider, Tag } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  SlidersOutlined,
  SafetyCertificateOutlined,
  QrcodeOutlined,
  SearchOutlined,
  ExportOutlined,
  LogoutOutlined,
  UserOutlined,
  TagOutlined
} from '@ant-design/icons';
import { api, getStoredUser, clearAuthSession } from './services/apiService';
import logoImg from './assets/Logo.png';
import ErrorBoundary from './components/ErrorBoundary';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import EventManagement from './pages/EventManagement';
import GuestManagement from './pages/GuestManagement';
import FormCustomizer from './pages/FormCustomizer';
import UserManagement from './pages/UserManagement';
import OperatorCheckIn from './pages/OperatorCheckIn';
import ManualCheckIn from './pages/ManualCheckIn';
import PublicPreRegistration from './pages/PublicPreRegistration';
import PublicQRScanner from './pages/PublicQRScanner';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventsList, setEventsList] = useState([]);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const pathname = window.location.pathname;
  const isPublicRegister = pathname.startsWith('/register/') || pathname.startsWith('/public/events/');
  const isPublicScan = pathname.startsWith('/scan/') || pathname.startsWith('/checkin/');

  const fetchEvents = () => {
    api.events.list()
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setEventsList(json.data);
          if (!selectedEventId) {
            setSelectedEventId(json.data[0].id);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (currentUser) {
      fetchEvents();
    }
  }, [currentUser]);

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    window.location.href = '/events/auth/login';
  };

  // Routes públicos directos
  if (isPublicRegister) {
    return <PublicPreRegistration />;
  }
  if (isPublicScan) {
    return <PublicQRScanner />;
  }

  // Si no ha iniciado sesión, mostrar la pantalla formal de Login solo en la ruta específica
  if (!currentUser) {
    if (pathname === '/events/auth/login') {
      return <LoginPage onLoginSuccess={(user) => {
        setCurrentUser(user);
        window.history.pushState({}, '', '/');
      }} />;
    } else {
      window.location.replace('https://integro.gt/');
      return null;
    }
  }

  const selectedEvent = eventsList.find(e => e.id === selectedEventId);

  const menuItems = [
    {
      key: 'grp-admin',
      label: 'ADMINISTRACIÓN',
      type: 'group',
      children: [
        { key: 'dashboard', icon: <DashboardOutlined />, label: 'Tablero / Dashboard' },
        { key: 'events', icon: <CalendarOutlined />, label: 'Catálogo de Eventos' },
        { key: 'users', icon: <SafetyCertificateOutlined />, label: 'Directorio de Usuarios' }
      ]
    },
    {
      key: 'grp-checkin',
      label: 'CONTROL DE INGRESO',
      type: 'group',
      children: [
        { key: 'manual-checkin', icon: <SearchOutlined />, label: 'Búsqueda y Asistencia' },
        { key: 'public-preview', icon: <ExportOutlined />, label: 'Vista Previa Pública' }
      ]
    }
  ];

  const userMenuItems = [
    {
      key: 'info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ display: 'block' }}>{currentUser?.full_name || currentUser?.email || 'Usuario'}</Text>
          <Text type="secondary" style={{ fontSize: '0.78rem' }}>
            Rol: {currentUser?.role === 'admin' ? 'Administrador' : 'Operador'}
          </Text>
        </div>
      )
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#c3302d' }} />,
      label: <Text type="danger" strong>Cerrar Sesión Corporativa</Text>,
      onClick: handleLogout
    }
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#c3302d',
          colorLink: '#c3302d',
          fontFamily: 'Montserrat, sans-serif',
          borderRadius: 6,
          colorBgContainer: '#ffffff'
        },
        components: {
          Layout: {
            siderBg: '#000000',
            headerBg: '#ffffff',
            bodyBg: '#f4f5f7'
          },
          Menu: {
            darkItemBg: '#000000',
            darkItemSelectedBg: '#c3302d',
            darkItemColor: '#c5c6c9',
            darkItemSelectedColor: '#ffffff',
            darkGroupTitleColor: '#89888a'
          }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', fontFamily: 'Montserrat, sans-serif' }}>
        {/* Ant Design Sider Header */}
        <Sider width={270} style={{ backgroundColor: '#000000', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
            <Space size={12}>
              <img
                src={logoImg}
                alt="Íntegro Logo"
                style={{
                  height: '36px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))'
                }}
              />
              <div>
                <Title level={4} style={{ color: '#ffffff', margin: 0, fontWeight: '700', letterSpacing: '-0.03em' }}>
                  Íntegro Events<span style={{ color: '#c3302d' }}>.</span>
                </Title>
                <Text style={{ color: '#89888a', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>
                  Asistencia & Accesos
                </Text>
              </div>
            </Space>
          </div>

          {/* Event Selector inside Sider */}
          <div style={{ padding: '0 16px 16px' }}>
            <Text style={{ color: '#89888a', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              Evento Seleccionado
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedEventId || undefined}
              onChange={setSelectedEventId}
              options={eventsList.map(e => ({ value: e.id, label: e.name }))}
              placeholder="Seleccionar evento..."
            />
          </div>

          {/* Menu */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[currentTab]}
            onClick={({ key }) => setCurrentTab(key)}
            items={menuItems}
            style={{ borderRight: 0 }}
          />
        </Sider>

        <Layout>
          {/* Ant Design Header */}
          <Header style={{ padding: '0 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text strong style={{ fontSize: '0.85rem', color: '#89888a' }}>EVENTO ACTIVO:</Text>
              {selectedEvent ? (
                <Tag color="red" icon={<TagOutlined />} style={{ fontSize: '0.82rem', padding: '4px 10px', borderRadius: '12px' }}>
                  {selectedEvent.name}
                </Tag>
              ) : (
                <Text type="secondary">Ninguno seleccionado</Text>
              )}
            </Space>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#000000', border: '2px solid #c3302d' }}>
                  {String(currentUser?.full_name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: '1.2' }}>
                  <Text strong style={{ display: 'block', fontSize: '0.88rem' }}>
                    {currentUser?.full_name || currentUser?.email || 'Usuario'}
                  </Text>
                  <Text style={{ fontSize: '0.7rem', color: '#c3302d', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {currentUser?.role === 'admin' ? 'ADMINISTRADOR' : 'OPERADOR'}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Header>

          {/* Content */}
          <Content style={{ padding: '32px', overflowY: 'auto' }}>
            <ErrorBoundary key={currentTab}>
              {currentTab === 'dashboard' && <AdminDashboard selectedEventId={selectedEventId} />}
              {currentTab === 'events' && <EventManagement selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId} />}
              {currentTab === 'users' && <UserManagement currentUser={currentUser} />}
              {currentTab === 'scanner' && <OperatorCheckIn selectedEventId={selectedEventId} currentUser={currentUser} />}
              {currentTab === 'manual-checkin' && <ManualCheckIn selectedEventId={selectedEventId} currentUser={currentUser} />}
              {currentTab === 'public-preview' && <PublicPreRegistration eventId={selectedEventId} />}
            </ErrorBoundary>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
