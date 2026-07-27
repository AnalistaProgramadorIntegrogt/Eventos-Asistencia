-- ========================================================
-- ESQUEMA DE BASE DE DATOS - SISTEMA DE CONTROL DE ASISTENCIA A EVENTOS
-- Esquema: events
-- Tabla de Usuarios: events.users
-- Ejecutar este archivo en el Editor SQL de Supabase
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear Esquema de Eventos
CREATE SCHEMA IF NOT EXISTS events;

-- Otorgar permisos al esquema events para la API de Supabase
GRANT USAGE ON SCHEMA events TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA events TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA events TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA events GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 1. TABLA DE USUARIOS Y ROLES (events.users)
CREATE TABLE IF NOT EXISTS events.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE EVENTOS
CREATE TABLE IF NOT EXISTS events.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location TEXT,
    banner_url TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'finished', 'cancelled')),
    invitation_code_required BOOLEAN DEFAULT false,
    form_config JSONB DEFAULT '{
        "fields": [
            {"id": "first_name", "label": "Nombre", "visible": true, "required": true, "order": 1},
            {"id": "last_name", "label": "Apellido", "visible": true, "required": true, "order": 2},
            {"id": "email", "label": "Correo electrónico", "visible": true, "required": true, "order": 3},
            {"id": "company", "label": "Empresa", "visible": true, "required": false, "order": 4},
            {"id": "job_title", "label": "Cargo", "visible": true, "required": false, "order": 5},
            {"id": "category", "label": "Categoría", "visible": true, "required": false, "order": 6}
        ],
        "custom_fields": [],
        "styling": {
            "background_color": "#f8fafc",
            "primary_color": "#2563eb",
            "text_color": "#1e293b",
            "custom_css": ""
        }
    }'::jsonb,
    confirmation_message TEXT DEFAULT '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE CATEGORÍAS POR EVENTO
CREATE TABLE IF NOT EXISTS events.event_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, name)
);

-- 4. TABLA DE INVITACIONES (Códigos de invitación)
CREATE TABLE IF NOT EXISTS events.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES events.event_categories(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    guest_name TEXT,
    guest_email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, code)
);

-- 5. TABLA DE PREREGISTROS / ASISTENTES
CREATE TABLE IF NOT EXISTS events.attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    invitation_id UUID REFERENCES events.invitations(id) ON DELETE SET NULL,
    category_id UUID REFERENCES events.event_categories(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    job_title TEXT,
    additional_data JSONB DEFAULT '{}'::jsonb,
    qr_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'no_show')),
    is_public_registration BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA DE CHECK-INS
CREATE TABLE IF NOT EXISTS events.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL REFERENCES events.attendees(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES events.users(id) ON DELETE SET NULL,
    scanned_by_name TEXT DEFAULT 'Operador',
    checkin_type TEXT NOT NULL CHECK (checkin_type IN ('qr_scan', 'manual')),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, attendee_id)
);

-- 7. TABLA DE AUDITORÍA
CREATE TABLE IF NOT EXISTS events.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES events.users(id) ON DELETE SET NULL,
    user_name TEXT DEFAULT 'Sistema/Operador',
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDICES PARA RENDIMIENTO RÁPIDO
CREATE INDEX IF NOT EXISTS idx_users_email ON events.users(email);
CREATE INDEX IF NOT EXISTS idx_events_status ON events.events(status);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON events.invitations(event_id, code);
CREATE INDEX IF NOT EXISTS idx_attendees_qr ON events.attendees(qr_code);
CREATE INDEX IF NOT EXISTS idx_attendees_event ON events.attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event ON events.checkins(event_id);

-- DATOS DE PRUEBA / SEMILLA INICIAL
INSERT INTO events.events (id, name, description, start_date, location, status, invitation_code_required)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
    'Industrial Summit 2026',
    'Conferencia Magistral sobre Tecnología e Industria en Centroamérica.',
    NOW() + INTERVAL '1 day',
    'Centro de Convenciones Íntegro, Ciudad de Guatemala',
    'active',
    false
) ON CONFLICT DO NOTHING;

INSERT INTO events.event_categories (id, event_id, name)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-1234567890ab', 'VIP'),
    ('c2222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-1234567890ab', 'General'),
    ('c3333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-1234567890ab', 'Prensa')
ON CONFLICT DO NOTHING;

INSERT INTO events.invitations (event_id, category_id, code, guest_name, guest_email)
VALUES 
    ('a1b2c3d4-e5f6-7890-abcd-1234567890ab', 'c1111111-1111-1111-1111-111111111111', 'VIP-2026-001', 'Carlos Mendoza', 'cmendoza@empresa.com'),
    ('a1b2c3d4-e5f6-7890-abcd-1234567890ab', 'c2222222-2222-2222-2222-222222222222', 'GEN-2026-002', 'Ana Lucía Gómez', 'agomez@empresa.com')
ON CONFLICT DO NOTHING;
