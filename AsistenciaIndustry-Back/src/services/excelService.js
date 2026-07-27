import * as xlsx from 'xlsx';
import { generateUniqueInvitationCode } from './qrService.js';

/**
 * Normaliza un string quitando acentos y espacios adicionales para comparación insensible
 */
function normalizeKey(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Lee un buffer de archivo Excel (.xlsx, .xls) o CSV y extrae los datos de los invitados.
 * Detecta automáticamente encabezados en español e inglés.
 */
export function parseGuestsFromExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  
  const guests = rawData.map((row) => {
    // Crear un mapa con llaves normalizadas de la fila actual
    const normalizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[normalizeKey(key)] = String(value).trim();
    }

    // 1. Detectar Nombre / Apellido
    const firstName = normalizedRow['nombre'] || normalizedRow['nombres'] || normalizedRow['first_name'] || normalizedRow['firstname'] || normalizedRow['guest_name'] || normalizedRow['guest'] || normalizedRow['invitado'] || normalizedRow['asistente'] || normalizedRow['name'] || '';
    const lastName = normalizedRow['apellido'] || normalizedRow['apellidos'] || normalizedRow['last_name'] || normalizedRow['lastname'] || normalizedRow['surname'] || '';
    
    let fullName = normalizedRow['nombre completo'] || normalizedRow['fullname'] || normalizedRow['full_name'] || '';
    if (!fullName) {
      fullName = `${firstName} ${lastName}`.trim();
    }

    // 2. Detectar Correo / Email
    const email = normalizedRow['correo'] || normalizedRow['email'] || normalizedRow['correo electronico'] || normalizedRow['correo-electronico'] || normalizedRow['guest_email'] || normalizedRow['mail'] || normalizedRow['e-mail'] || '';

    // 3. Detectar Categoría
    const category = normalizedRow['categoria'] || normalizedRow['category'] || normalizedRow['tipo'] || normalizedRow['category_name'] || 'General';

    // 4. Detectar Empresa / Cargo (opcionales)
    const company = normalizedRow['empresa'] || normalizedRow['company'] || normalizedRow['organizacion'] || '';
    const jobTitle = normalizedRow['cargo'] || normalizedRow['puesto'] || normalizedRow['job_title'] || normalizedRow['job title'] || normalizedRow['title'] || '';

    return {
      first_name: firstName || fullName.split(' ')[0] || '',
      last_name: lastName || fullName.split(' ').slice(1).join(' ') || '',
      guest_name: fullName || firstName || email,
      guest_email: email,
      company,
      job_title: jobTitle,
      category: category || 'General',
      code: generateUniqueInvitationCode('INV')
    };
  }).filter(g => g.guest_name || g.guest_email);

  return guests;
}
