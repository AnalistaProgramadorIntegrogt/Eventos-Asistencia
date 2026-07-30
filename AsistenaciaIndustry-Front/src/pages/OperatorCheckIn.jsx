import React, { useEffect, useRef, useState } from 'react';
import { Card, Input, Result, Typography, Space, Spin, Alert } from 'antd';
import { QrcodeOutlined, CheckCircleFilled, WarningFilled, CloseCircleFilled } from '@ant-design/icons';
import { api } from '../services/apiService';

const { Title, Text, Paragraph } = Typography;

export default function OperatorCheckIn({ selectedEventId, currentUser }) {
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const keepFocus = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    keepFocus();
    const interval = setInterval(keepFocus, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!qrInput.trim() || processing || !selectedEventId) return;

    const codeToScan = qrInput.trim();
    setQrInput('');
    setProcessing(true);

    try {
      const operatorName = currentUser?.full_name || 'Operador de Acceso';
      const json = await api.checkin.scan(selectedEventId, codeToScan, operatorName);
      setScanResult(json);
    } catch (err) {
      const msg = err.message || '';
      const isEarly = msg.includes('aún no ha iniciado') || msg.includes('programado para iniciar');
      setScanResult({
        status_code: isEarly ? 'NOT_STARTED' : 'INVALID',
        message: msg || 'Error de conexión con la API.'
      });
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: '28px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: '700', letterSpacing: '-0.04em' }}>
          Estación Lector QR Check-in<span style={{ color: '#c3302d' }}>.</span>
        </Title>
        <Text type="secondary" style={{ fontSize: '0.9rem' }}>
          Escáner USB/HID activado para lectura continua y rápida de entradas
        </Text>
      </div>

      <form onSubmit={handleScanSubmit} style={{ marginBottom: '32px' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <Input
            ref={inputRef}
            size="large"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Apointe el lector de código QR aquí..."
            prefix={<QrcodeOutlined style={{ color: '#c3302d', fontSize: '1.4rem' }} />}
            autoFocus
            style={{
              padding: '16px 20px',
              fontSize: '1.2rem',
              textAlign: 'center',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: '2px solid #c3302d',
              boxShadow: '0 0 0 4px rgba(195, 48, 45, 0.12)'
            }}
          />
        </div>
      </form>

      {scanResult ? (
        <Card
          style={{
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            borderTop:
              scanResult.status_code === 'SUCCESS'
                ? '5px solid #059669'
                : scanResult.status_code === 'ALREADY_USED'
                ? '5px solid #d97706'
                : '5px solid #e11d48'
          }}
        >
          {scanResult.status_code === 'SUCCESS' && (
            <Result
              status="success"
              title={<Title level={2} style={{ color: '#059669', margin: 0, fontWeight: '800' }}>¡INGRESO AUTORIZADO!</Title>}
              subTitle={<Title level={4} style={{ color: '#000000', margin: '8px 0' }}>{scanResult.message}</Title>}
              extra={
                scanResult.attendee && (
                  <div style={{ marginTop: '16px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <Text strong style={{ fontSize: '1.05rem', display: 'block' }}>
                      Empresa: {scanResult.attendee.company || 'Ejecutivo Independiente'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '0.95rem' }}>
                      Categoría: {scanResult.attendee.category_name || scanResult.attendee.internal_category || '—'}
                    </Text>
                  </div>
                )
              }
            />
          )}

          {scanResult.status_code === 'ALREADY_USED' && (
            <Result
              status="warning"
              title={<Title level={2} style={{ color: '#d97706', margin: 0, fontWeight: '800' }}>CÓDIGO YA UTILIZADO</Title>}
              subTitle={<Title level={4} style={{ color: '#000000', margin: '8px 0' }}>Este boleto QR ya registró su ingreso previo</Title>}
              extra={
                scanResult.attendee && (
                  <Text type="secondary" style={{ fontSize: '1.05rem' }}>
                    Asistente: <strong>{scanResult.attendee.full_name}</strong>
                  </Text>
                )
              }
            />
          )}

          {scanResult.status_code === 'INVALID' && (
            <Result
              status="error"
              title={<Title level={2} style={{ color: '#e11d48', margin: 0, fontWeight: '800' }}>CÓDIGO INVÁLIDO</Title>}
              subTitle={<Title level={4} style={{ color: '#000000', margin: '8px 0' }}>{scanResult.message || 'El código no existe en la base de datos'}</Title>}
            />
          )}

          {scanResult.status_code === 'NOT_STARTED' && (
            <Result
              status="warning"
              title={<Title level={2} style={{ color: '#d97706', margin: 0, fontWeight: '800' }}>EVENTO NO INICIADO</Title>}
              subTitle={<Title level={4} style={{ color: '#000000', margin: '8px 0' }}>{scanResult.message}</Title>}
            />
          )}
        </Card>
      ) : (
        <Card style={{ padding: '60px 20px', borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
          <QrcodeOutlined style={{ fontSize: '4rem', color: '#89888a', opacity: 0.3, marginBottom: '16px' }} />
          <Title level={4} type="secondary" style={{ margin: 0 }}>
            Listo para el siguiente código QR...
          </Title>
        </Card>
      )}
    </div>
  );
}
