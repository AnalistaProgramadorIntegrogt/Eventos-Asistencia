import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 24px',
            maxWidth: '640px',
            margin: '40px auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            fontFamily: 'Montserrat, sans-serif',
            textAlign: 'center',
            color: '#000000'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#000000', margin: '0 0 8px', fontSize: '1.3rem', fontWeight: '700' }}>
            Ocurrió un error inesperado al cargar el componente
          </h2>
          <p style={{ color: '#c3302d', fontSize: '0.95rem', marginBottom: '16px', fontWeight: '600' }}>
            {this.state.error?.message || this.state.error?.toString() || 'Error de renderizado'}
          </p>
          {this.state.error?.stack && (
            <details style={{ textAlign: 'left', marginBottom: '20px', background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e1e2e4' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#000000', fontSize: '0.85rem' }}>Ver stack trace técnico</summary>
              <pre style={{ fontSize: '0.75rem', overflowX: 'auto', marginTop: '8px', color: '#333', whiteSpace: 'pre-wrap' }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              backgroundColor: '#c3302d',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Reintentar / Cargar de nuevo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
