import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography, Space, ConfigProvider } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, RightOutlined } from '@ant-design/icons';
import { api, setAuthSession } from '../services/apiService';
import logoImg from '../assets/Logo.png';

const { Title, Text, Paragraph } = Typography;

export default function LoginPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleFinish = async (values) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.auth.login(values.email, values.password);
      if (res.success && res.data) {
        setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
        onLoginSuccess(res.data.user);
      } else {
        setErrorMsg(res.error || 'Credenciales no válidas. Por favor intente de nuevo.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al conectar con la API de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#c3302d',
          fontFamily: 'Montserrat, sans-serif',
          borderRadius: 6,
        }
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#050505',
          backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(195, 48, 45, 0.12) 0%, rgba(5, 5, 5, 1) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          
          {/* Logo & Corporate Branding */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img
              src={logoImg}
              alt="Íntegro Logo"
              style={{
                height: '64px',
                objectFit: 'contain',
                marginBottom: '16px',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))'
              }}
            />

            <Title level={2} style={{ color: '#ffffff', margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
              Íntegro Events<span style={{ color: '#c3302d' }}>.</span>
            </Title>
            <Text style={{ color: '#89888a', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
              Control de Asistencia Corporativa
            </Text>
          </div>

          {/* Login Card */}
          <Card
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '12px 8px'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={4} style={{ margin: 0, fontWeight: '700', color: '#000000' }}>
                Iniciar Sesión
              </Title>
              <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                Ingrese sus credenciales de acceso para continuar
              </Text>
            </div>

            {errorMsg && (
              <Alert
                message={errorMsg}
                type="error"
                showIcon
                style={{ marginBottom: '20px', borderRadius: '6px' }}
              />
            )}

            <Form
              layout="vertical"
              onFinish={handleFinish}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                label={<Text strong style={{ fontSize: '0.85rem' }}>Correo Electrónico</Text>}
                name="email"
                rules={[
                  { required: true, message: 'Por favor ingrese su correo corporativo' },
                  { type: 'email', message: 'Ingrese un correo electrónico válido' }
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#89888a' }} />}
                  placeholder="usuario@integro.gt"
                  style={{ borderRadius: '6px' }}
                />
              </Form.Item>

              <Form.Item
                label={<Text strong style={{ fontSize: '0.85rem' }}>Contraseña</Text>}
                name="password"
                rules={[{ required: true, message: 'Por favor ingrese su contraseña' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#89888a' }} />}
                  placeholder="••••••••"
                  style={{ borderRadius: '6px' }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '28px', marginBottom: '12px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  icon={<RightOutlined />}
                  style={{
                    height: '48px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    backgroundColor: '#c3302d',
                    borderColor: '#c3302d',
                    boxShadow: '0 4px 14px rgba(195, 48, 45, 0.35)'
                  }}
                >
                  {loading ? 'Autenticando...' : 'Acceder al Sistema'}
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center', margin: '16px 0' }}>
                <Text type="secondary" style={{ fontSize: '0.85rem' }}>o continuar con</Text>
              </div>

              <Button
                block
                style={{
                  height: '48px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={async () => {
                  try {
                    const res = await api.auth.microsoft(window.location.origin + '/auth/callback');
                    if (res.success && res.url) {
                      window.location.href = res.url;
                    } else {
                      setErrorMsg('Error al iniciar sesión con Microsoft');
                    }
                  } catch (err) {
                    setErrorMsg('Error de red al conectar con Microsoft');
                  }
                }}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" style={{ width: '18px' }} />
                Iniciar sesión con Microsoft
              </Button>
            </Form>
          </Card>

          {/* Footer Security Badge */}
          <div style={{ textAlign: 'center', marginTop: '24px', color: '#89888a', fontSize: '0.78rem' }}>
            <Space size={6}>
              <SafetyCertificateOutlined style={{ color: '#c3302d' }} />
              <span>Conexión segura cifrada · Íntegro Corporativo</span>
            </Space>
          </div>

        </div>
      </div>
    </ConfigProvider>
  );
}
