import React, { useEffect } from 'react';
import { api, setAuthSession } from '../services/apiService';
import { Spin, Typography } from 'antd';

const { Title, Text } = Typography;

export default function AuthCallback() {
  useEffect(() => {
    const handleAuth = async () => {
      // Supabase sends access_token in the URL hash like #access_token=...&refresh_token=...
      const hash = window.location.hash;
      if (!hash) {
        window.location.href = '/events/auth/login';
        return;
      }

      const params = new URLSearchParams(hash.replace('#', '?'));
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      
      if (error) {
        alert(`Error de autenticación de Supabase/Microsoft: ${error} - ${errorDescription}`);
        window.location.href = '/events/auth/login';
        return;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        // Establecer temporalmente para que api.auth.me pueda usarlo
        setAuthSession(accessToken, null, refreshToken);
        
        try {
          const res = await api.auth.me();
          if (res.success && res.data) {
            setAuthSession(accessToken, res.data, refreshToken);
            window.location.href = '/';
          } else {
            alert(`Error del backend: no se pudo obtener el perfil de usuario. Intente de nuevo.`);
            window.location.href = '/events/auth/login';
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          alert(`Error al conectar con el backend o crear usuario: ${error.message}`);
          window.location.href = '/events/auth/login';
        }
      } else {
        window.location.href = '/events/auth/login';
      }
    };

    handleAuth();
  }, []);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#050505',
      color: '#fff'
    }}>
      <Spin size="large" />
      <Title level={4} style={{ color: '#fff', marginTop: 20 }}>Completando inicio de sesión...</Title>
      <Text style={{ color: '#89888a' }}>Por favor espere un momento.</Text>
    </div>
  );
}
