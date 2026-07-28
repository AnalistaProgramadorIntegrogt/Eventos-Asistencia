import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import eventRoutes from './routes/eventRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import attendeeRoutes from './routes/attendeeRoutes.js';
import trashRoutes from './routes/trashRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import checkinRoutes from './routes/checkinRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken, requirePermission } from './middleware/authMiddleware.js';
import { initAdminUser } from './services/authSeedService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Asegurar existencia de directorio de descargas / uploads
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middlewares globales
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Servir archivos estáticos subidos (videos, imágenes, etc.) en /uploads y /api/uploads
app.use('/uploads', express.static(uploadsPath));
app.use('/api/uploads', express.static(uploadsPath));

// Health Check (Público)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sistema de Control de Asistencia a Eventos API',
    timestamp: new Date().toISOString()
  });
});

// Rutas Públicas
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Rutas Protegidas (requieren autenticación JWT)
app.use('/api/events', authenticateToken, eventRoutes);
app.use('/api/events', authenticateToken, invitationRoutes);
app.use('/api', authenticateToken, invitationRoutes);
app.use('/api/events', authenticateToken, attendeeRoutes);
app.use('/api', authenticateToken, attendeeRoutes);
app.use('/api/checkin', authenticateToken, checkinRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/trash', authenticateToken, requirePermission('DELETE_EVENTS'), trashRoutes);

// Gestión de Usuarios y Roles
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/roles', authenticateToken, roleRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor Backend iniciado en el puerto ${PORT}`); 
  console.log(`📡 URL Base: http://localhost:${PORT}/api`);

  // Ejecutar inicialización del usuario administrador
  await initAdminUser();
});
