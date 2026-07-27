import React, { useState } from 'react';
import { Lock, Mail, Key, LogIn, AlertCircle } from 'lucide-react';
import { api, setAuthSession } from '../services/apiService';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.auth.login(email, password);
      if (res.success && res.data) {
        setAuthSession(res.data.access_token, res.data.user);
        onLoginSuccess(res.data.user);
        onClose();
      } else {
        setError(res.error || 'Credenciales inválidas');
      }
    } catch (err) {
      setError(err.message || 'Error autenticando contra la API backend');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay-backdrop">
      <div className="modal-dialog-card" style={{ maxWidth: '440px', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: 'var(--accent-red-light)',
              color: 'var(--integro-red)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}
          >
            <Lock size={24} />
          </div>
          <h2 className="modal-title" style={{ textAlign: 'center' }}>
            Acceso Corporativo<span className="integro-period">.</span>
          </h2>
          <p className="modal-description" style={{ textAlign: 'center', marginBottom: '0' }}>
            Ingrese con su correo institucional de Íntegro
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              color: 'var(--status-danger-text)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field-group">
            <label className="form-label-executive">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input-executive"
                required
                style={{ paddingLeft: '40px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@integro.gt"
              />
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            </div>
          </div>

          <div className="form-field-group">
            <label className="form-label-executive">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input-executive"
                required
                style={{ paddingLeft: '40px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Key size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              <LogIn size={16} /> {submitting ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
