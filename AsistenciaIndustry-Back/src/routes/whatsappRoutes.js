import express from 'express';
import { requirePermission } from '../middleware/authMiddleware.js';
import { getConnectionStatus, createInstance, connectInstance, logoutInstance } from '../services/whatsappService.js';

const router = express.Router();

// GET /api/whatsapp/status
router.get('/status', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const status = await getConnectionStatus();
    
    if (status.state === 'NOT_FOUND') {
      // Instance doesn't exist, create it
      await createInstance();
      // Try to connect immediately after creation to get QR
      const connectData = await connectInstance();
      return res.json({ success: true, status: 'QR_READY', qr: connectData.base64 });
    }

    if (status.state === 'close' || status.state === 'connecting') {
      // Exist but disconnected or connecting, request connection QR
      try {
        const connectData = await connectInstance();
        return res.json({ success: true, status: 'QR_READY', qr: connectData.base64 });
      } catch (err) {
        // sometimes /connect fails if it's already connecting, so we just return state
        return res.json({ success: true, status: 'CONNECTING' });
      }
    }

    if (status.state === 'open') {
      return res.json({ success: true, status: 'CONNECTED' });
    }

    res.json({ success: true, status: status.state.toUpperCase() });

  } catch (error) {
    console.error('Error en /api/whatsapp/status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/whatsapp/logout
router.delete('/logout', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    await logoutInstance();
    res.json({ success: true, message: 'Sesión de WhatsApp cerrada exitosamente' });
  } catch (error) {
    console.error('Error en /api/whatsapp/logout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
