import { supabase } from '../config/supabase.js';

const formatDateGT = (dateStr) => {
  if (!dateStr) return 'Por confirmar';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formatted = d.toLocaleDateString('es-GT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (e) {
    return dateStr || 'Por confirmar';
  }
};

const formatTimeGT = (dateStr) => {
  if (!dateStr) return 'Por confirmar';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Por confirmar';
    return d.toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'Por confirmar';
  }
};

async function testWaTemplate() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();

  const name = 'Harol Rodríguez';
  const eventName = event?.name || 'Lanzamiento Innova Park';
  const fecha = formatDateGT(event?.start_date);
  const hora = formatTimeGT(event?.start_date);
  const lugar = event?.location || 'Por confirmar';

  const caption = `Estimado(a) ${name},

Queremos recordarte tu asistencia a ${eventName}. Será un honor contar con tu presencia en este proyecto que representa una nueva visión para el desarrollo industrial en Guatemala.

Para tu comodidad, compartimos nuevamente tu código QR de acceso, el cual será requerido para ingresar al evento.

📅 Fecha: ${fecha}

🕒 Hora: ${hora}

📍 Lugar: ${lugar}

📲 Código QR: (Adjunto)`;

  console.log('=== WA CAPTION OUTPUT ===');
  console.log(caption);
}

testWaTemplate();
