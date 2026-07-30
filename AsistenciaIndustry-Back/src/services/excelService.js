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
 * Normaliza y da formato limpio a números de teléfono nacionales e internacionales con o sin extensión.
 */
export function formatPhoneNumber(input) {
  if (!input) return '';
  let str = String(input).trim();
  if (!str) return '';

  // Manejar notación científica de Excel (ej: 5.025555444e+11)
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    try {
      str = BigInt(Math.round(Number(str))).toString();
    } catch (e) {
      str = Number(str).toFixed(0);
    }
  }

  // Eliminar decimales si Excel lo convirtió a float (ej: 50255554444.0 -> 50255554444)
  str = str.replace(/\.0+$/, '');

  // Extraer extensión si existe (ej: ext 101, Ext. 101, x101, extensión 101)
  let extension = '';
  const extMatch = str.match(/(?:ext|extensión|ext|x|extension|\#)\.?\s*(\d+)/i);
  if (extMatch) {
    extension = ` Ext. ${extMatch[1]}`;
    str = str.substring(0, extMatch.index).trim();
  }

  const isInternationalWithPlus = str.startsWith('+');
  let digits = str.replace(/[^\d]/g, '');

  if (!digits) return input;

  // Caso 1: 8 dígitos exactos (Número nacional Guatemala, ej: 55554444)
  if (digits.length === 8) {
    return `+502 ${digits.substring(0, 4)}-${digits.substring(4)}${extension}`;
  }

  // Caso 2: 11 dígitos iniciando con 502 (ej: 50255554444)
  if (digits.length === 11 && digits.startsWith('502')) {
    const num = digits.substring(3);
    return `+502 ${num.substring(0, 4)}-${num.substring(4)}${extension}`;
  }

  // Caso 3: Número internacional (+1 305 555 0199 o 001...)
  if (isInternationalWithPlus || digits.length > 8) {
    if (digits.startsWith('00')) {
      digits = digits.substring(2);
    }

    if (isInternationalWithPlus || !digits.startsWith('502')) {
      if (digits.length === 11 && digits.startsWith('1')) {
        return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}${extension}`;
      }
      return `+${digits.substring(0, digits.length - 8)} ${digits.substring(digits.length - 8, digits.length - 4)}-${digits.substring(digits.length - 4)}${extension}`;
    }
  }

  return `${str}${extension}`;
}

/**
 * Lee un buffer de archivo Excel (.xlsx, .xls) o CSV y extrae los datos de los invitados.
 * Detecta automáticamente encabezados en español e inglés.
 */
export function parseGuestsFromExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer', raw: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  
  const guests = rawData.map((row) => {
    // Crear un mapa con llaves normalizadas de la fila actual
    const normalizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (key !== undefined && value !== undefined && value !== null) {
        const normK = normalizeKey(key);
        if (normK) normalizedRow[normK] = String(value).trim();
      }
    }

    // 1. Detectar Nombre / Apellido
    let firstName = normalizedRow['nombre'] || normalizedRow['nombres'] || normalizedRow['first_name'] || normalizedRow['firstname'] || normalizedRow['guest_name'] || normalizedRow['guest'] || normalizedRow['invitado'] || normalizedRow['asistente'] || normalizedRow['name'] || '';
    let lastName = normalizedRow['apellido'] || normalizedRow['apellidos'] || normalizedRow['last_name'] || normalizedRow['lastname'] || normalizedRow['surname'] || '';
    
    let fullName = normalizedRow['nombre completo'] || normalizedRow['fullname'] || normalizedRow['full_name'] || normalizedRow['nombre y apellido'] || normalizedRow['nombres y apellidos'] || normalizedRow['nombre y apellidos'] || normalizedRow['nombre del invitado'] || normalizedRow['invitado'] || normalizedRow['invitados'] || normalizedRow['participante'] || normalizedRow['participantes'] || normalizedRow['persona'] || normalizedRow['contacto'] || '';

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    }

    // 2. Detectar Correo / Email
    let email = normalizedRow['correo'] || normalizedRow['email'] || normalizedRow['correo electronico'] || normalizedRow['correo-electronico'] || normalizedRow['guest_email'] || normalizedRow['mail'] || normalizedRow['e-mail'] || normalizedRow['direccion de correo'] || normalizedRow['direccion de correo electronico'] || normalizedRow['email address'] || '';

    // Detección Inteligente de Fallback para Email (buscar cualquier celda que contenga @)
    if (!email) {
      for (const val of Object.values(normalizedRow)) {
        if (val && typeof val === 'string' && val.includes('@') && val.includes('.')) {
          email = val.trim();
          break;
        }
      }
    }

    // Detección Inteligente de Fallback para Nombre (si no hubo coincidencia de encabezado directo)
    if (!fullName && !firstName) {
      for (const [key, val] of Object.entries(normalizedRow)) {
        if (val && typeof val === 'string' && val.length >= 2 && !val.includes('@') && !/^\d+$/.test(val)) {
          fullName = val.trim();
          break;
        }
      }
    }

    // 3. Detectar Categoría Interna
    let category = normalizedRow['categoria'] || normalizedRow['categorias'] || normalizedRow['categoria interna'] || normalizedRow['categoria de invitado'] || normalizedRow['tipo de invitado'] || normalizedRow['category'] || normalizedRow['tipo'] || normalizedRow['category_name'] || '';

    if (!category) {
      for (const [k, v] of Object.entries(normalizedRow)) {
        if ((k.includes('categor') || k.includes('tipo')) && v && typeof v === 'string') {
          category = v.trim();
          break;
        }
      }
    }

    // 4. Detectar Empresa / Cargo (opcionales)
    const company = normalizedRow['empresa'] || normalizedRow['company'] || normalizedRow['organizacion'] || '';
    const jobTitle = normalizedRow['cargo'] || normalizedRow['puesto'] || normalizedRow['job_title'] || normalizedRow['job title'] || normalizedRow['title'] || '';

    // 5. Detectar Teléfono (opcional)
    let phone = normalizedRow['telefono'] || normalizedRow['tel'] || normalizedRow['phone'] || normalizedRow['celular'] || normalizedRow['movil'] || normalizedRow['mobile'] || normalizedRow['telefono de contacto'] || normalizedRow['telefono_contacto'] || normalizedRow['numero de telefono'] || normalizedRow['numero'] || normalizedRow['contact_number'] || normalizedRow['whatsapp'] || '';

    if (!phone) {
      for (const [k, v] of Object.entries(normalizedRow)) {
        if (v) {
          const valStr = String(v).trim();
          const digitsCount = valStr.replace(/[^\d]/g, '').length;
          if ((k.includes('telef') || k.includes('phone') || k.includes('celular') || k.includes('movil') || k.includes('tel') || k.includes('whatsapp') || k.includes('numero') || k.includes('contacto')) && digitsCount >= 7) {
            phone = valStr;
            break;
          }
        }
      }
    }

    const finalGuestName = fullName || firstName || email || 'Invitado VIP';

    return {
      first_name: firstName || finalGuestName.split(' ')[0] || 'Invitado',
      last_name: lastName || finalGuestName.split(' ').slice(1).join(' ') || '',
      guest_name: finalGuestName,
      guest_email: email,
      company,
      job_title: jobTitle,
      phone: formatPhoneNumber(phone),
      category: category || '',
      code: generateUniqueInvitationCode('INV')
    };
  }).filter(g => Boolean(g.guest_name || g.guest_email));

  return guests;
}
