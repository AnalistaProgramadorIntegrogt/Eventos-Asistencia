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
import { api, getStoredUser, setAuthSession, getAuthToken, clearAuthSession } from './services/apiService';
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
import AuthCallback from './pages/AuthCallback';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

function getInitialTab(user) {
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const perms = user?.permissions || [];
  const has = (p) => isAdmin || perms.includes(p);

  if (has('VIEW_DASHBOARD')) return 'dashboard';
  if (has('VIEW_EVENTS') || has('CREATE_EVENTS') || has('EDIT_EVENTS')) return 'events';
  if (has('MANUAL_CHECKIN') || has('VIEW_GUESTS') || has('MANAGE_GUESTS')) return 'manual-checkin';
  if (has('VIEW_USERS') || has('MANAGE_USERS')) return 'users';
  return 'manual-checkin';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [currentTab, setCurrentTab] = useState(() => getInitialTab(currentUser));
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventsList, setEventsList] = useState([]);

  const pathname = window.location.pathname;
  const isPublicRegister = pathname.startsWith('/register/') || pathname.startsWith('/public/events/');
  const isPublicScan = pathname.startsWith('/scan/') || pathname.startsWith('/checkin/');
  const isAuthCallback = pathname.startsWith('/auth/callback') || window.location.hash.includes('access_token=');

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
    // Sincronizar automáticamente el usuario y permisos desde la BD al cargar
    if (getAuthToken()) {
      api.auth.me()
        .then((res) => {
          if (res.success && res.data) {
            const refToken = localStorage.getItem('integro_refresh_token');
            setAuthSession(getAuthToken(), res.data, refToken);
            setCurrentUser(res.data);
          }
        })
        .catch((err) => console.error('Error sincronizando perfil de usuario:', err));
    }
  }, []);

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

  if (isAuthCallback) {
    return <AuthCallback />;
  }

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
        setCurrentTab(getInitialTab(user));
        window.history.pushState({}, '', '/');
      }} />;
    } else {
      window.location.replace('https://integro.gt/');
      return null;
    }
  }

  const selectedEvent = eventsList.find(e => e.id === selectedEventId);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const hasPerm = (perm) => isAdmin || (currentUser?.permissions && currentUser.permissions.includes(perm));

  const adminChildren = [];
  if (hasPerm('VIEW_DASHBOARD')) {
    adminChildren.push({ key: 'dashboard', icon: <DashboardOutlined />, label: 'Tablero / Dashboard' });
  }
  if (hasPerm('VIEW_EVENTS') || hasPerm('CREATE_EVENTS') || hasPerm('EDIT_EVENTS')) {
    adminChildren.push({ key: 'events', icon: <CalendarOutlined />, label: 'Catálogo de Eventos' });
  }
  if (hasPerm('VIEW_USERS') || hasPerm('MANAGE_USERS')) {
    adminChildren.push({ key: 'users', icon: <SafetyCertificateOutlined />, label: 'Directorio de Usuarios' });
  }

  const checkinChildren = [];
  if (hasPerm('MANUAL_CHECKIN') || hasPerm('VIEW_GUESTS') || hasPerm('MANAGE_GUESTS') || hasPerm('SCAN_QR')) {
    checkinChildren.push({ key: 'manual-checkin', icon: <SearchOutlined />, label: 'Búsqueda y Asistencia' });
  }

  const menuItems = [
    ...(adminChildren.length > 0 ? [{
      key: 'grp-admin',
      label: 'ADMINISTRACIÓN',
      type: 'group',
      children: adminChildren
    }] : []),
    ...(checkinChildren.length > 0 ? [{
      key: 'grp-checkin',
      label: 'CONTROL DE INGRESO',
      type: 'group',
      children: checkinChildren
    }] : [])
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
              {currentTab === 'dashboard' && hasPerm('VIEW_DASHBOARD') && <AdminDashboard selectedEventId={selectedEventId} />}
              {currentTab === 'events' && (hasPerm('VIEW_EVENTS') || hasPerm('CREATE_EVENTS') || hasPerm('EDIT_EVENTS')) && <EventManagement selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId} />}
              {currentTab === 'users' && (hasPerm('VIEW_USERS') || hasPerm('MANAGE_USERS')) && <UserManagement currentUser={currentUser} />}
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
