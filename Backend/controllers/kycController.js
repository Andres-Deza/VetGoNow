import Verification from '../models/Verification.js';
import Tesseract from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Human es opcional en el backend (el frontend hace el procesamiento principal)
let Human = null;
let humanInstance = null;
let humanLoadAttempted = false;

// Cargar Human de forma lazy (solo cuando se necesite)
const loadHuman = async () => {
  if (humanLoadAttempted) {
    return Human;
  }
  
  humanLoadAttempted = true;
  try {
    const humanModule = await import('@vladmandic/human');
    Human = humanModule.Human;
    console.log('Human cargado exitosamente en el backend (opcional)');
  } catch (error) {
    console.warn('Human no está disponible en el backend (opcional). El frontend hará el procesamiento principal.');
    Human = null;
  }
  return Human;
};

// Inicializar Human (solo si está disponible)
const initHuman = async () => {
  // Intentar cargar Human si no se ha intentado antes
  if (!humanLoadAttempted) {
    await loadHuman();
  }
  
  if (!Human) {
    return null; // Human no disponible, usar datos del frontend
  }
  
  if (!humanInstance) {
    try {
      // Human en Node.js requiere configuración especial
      humanInstance = new Human({
        backend: 'cpu', // En Node.js solo CPU está disponible
        modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
        face: {
          enabled: true,
          detector: { 
            modelPath: 'blazeface.json',
            return: true
          },
          mesh: { 
            enabled: true,
            return: true
          },
          iris: { enabled: false },
          emotion: { enabled: false },
          description: { 
            enabled: true, // Para embeddings
            return: true
          }
        },
        // Deshabilitar otras funcionalidades no necesarias
        hand: { enabled: false },
        body: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false }
      });
      
      // Warmup puede fallar en Node.js, manejarlo con try-catch
      try {
        await humanInstance.warmup();
      } catch (warmupError) {
        console.warn('Human warmup warning (puede ser normal en Node.js):', warmupError.message);
      }
    } catch (error) {
      console.warn('Error inicializando Human (opcional):', error.message);
      humanInstance = null; // Marcar como no disponible
    }
  }
  return humanInstance;
};

// Función para normalizar RUT (limpiar y formatear)
const normalizeRut = (rut) => {
  if (!rut) return '';
  return rut.toString().toUpperCase().replace(/[^0-9K]/g, '');
};

// Función para validar RUT chileno (módulo 11)
const validateRut = (rut) => {
  if (!rut) return false;
  const cleaned = normalizeRut(rut);
  if (cleaned.length < 8) return false;
  
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const calculatedDv = remainder < 2 ? remainder.toString() : (11 - remainder).toString();
  const calculatedDvK = calculatedDv === '10' ? 'K' : calculatedDv;
  
  return dv === calculatedDvK;
};

// Función para extraer RUT del texto OCR (priorizando RUN explícito)
const extractRutFromText = (text) => {
  // PRIORIDAD 1: Buscar "RUN" explícitamente (más confiable)
  const runExplicitPattern = /RUN[\s:]+(\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9K])/gi;
  const runMatches = text.match(runExplicitPattern);
  if (runMatches && runMatches.length > 0) {
    // Tomar el último match de RUN (más probable que sea el correcto)
    const runMatch = runMatches[runMatches.length - 1];
    const rutExtracted = runMatch.match(/(\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9K])/i);
    if (rutExtracted) {
      return normalizeRut(rutExtracted[1]);
    }
  }

  // PRIORIDAD 2: Buscar patrones de RUT pero excluyendo números de documento
  // El número de documento suele aparecer después de "NÚMERO DOCUMENTO" o "DOCUMENTO"
  // Extraer primero el número de documento para excluirlo
  const docNumberPattern = /N[ÚU]MERO\s+DOCUMENTO[\s:]+(\d{1,3}\.?\d{3}\.?\d{3})/i;
  const docNumberMatch = text.match(docNumberPattern);
  let excludedNumbers = [];
  
  if (docNumberMatch) {
    const docNumber = docNumberMatch[1].replace(/\./g, '');
    excludedNumbers.push(docNumber);
    // También excluir variaciones con guiones
    excludedNumbers.push(docNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3'));
  }

  // Buscar todos los patrones de RUT en el texto
  const allRutPatterns = [
    /(\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9K])/gi,
    /(\d{7,8}[-]?[0-9K])/gi
  ];

  for (const pattern of allRutPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      // Filtrar matches que no sean números de documento
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const cleaned = normalizeRut(match);
        
        // Verificar que no sea un número de documento excluido
        let isExcluded = false;
        for (const excluded of excludedNumbers) {
          if (cleaned.includes(excluded) || excluded.includes(cleaned)) {
            isExcluded = true;
            break;
          }
        }
        
        // Verificar que tenga formato válido de RUT (7-8 dígitos + DV)
        if (!isExcluded && cleaned.length >= 8 && cleaned.length <= 10) {
          // Validar que el dígito verificador sea válido
          if (validateRut(cleaned)) {
            return cleaned;
          }
        }
      }
    }
  }

  return null;
};

// Función para parsear fechas en formato chileno (DD MMM YYYY)
const parseChileanDate = (day, month, year) => {
  const monthMap = {
    'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
  };
  const monthNum = monthMap[month.toUpperCase()];
  if (monthNum) {
    const dayPadded = day.padStart(2, '0');
    return new Date(`${year}-${monthNum}-${dayPadded}`);
  }
  return null;
};

// Función para extraer campos específicos de cédula chilena (frente)
const extractChileanIdFields = (text) => {
  const result = {};
  const textUpper = text.toUpperCase();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Extraer RUT (RUN) - usar la función mejorada que evita confundir con número de documento
  const extractedRut = extractRutFromText(text);
  if (extractedRut) {
    result.rut = extractedRut;
  }

  // Extraer APELLIDOS - múltiples variaciones
  const apellidosPatterns = [
    /APELLIDOS?[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|NOMBRES|NACIONALIDAD|SEXO|FECHA|RUN|$)/i,
    /APELLIDO[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|NOMBRES|NACIONALIDAD|SEXO|FECHA|RUN|$)/i
  ];
  
  for (const pattern of apellidosPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.lastNames = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  // Extraer NOMBRES - múltiples variaciones
  const nombresPatterns = [
    /NOMBRES?[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|NACIONALIDAD|SEXO|FECHA|N[ÚU]MERO|RUN|$)/i,
    /NOMBRE[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|NACIONALIDAD|SEXO|FECHA|N[ÚU]MERO|RUN|$)/i
  ];
  
  for (const pattern of nombresPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.firstNames = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  // Combinar nombres completos
  if (result.lastNames && result.firstNames) {
    result.fullName = `${result.firstNames} ${result.lastNames}`.trim();
  } else if (result.firstNames) {
    result.fullName = result.firstNames;
  } else if (result.lastNames) {
    result.fullName = result.lastNames;
  }

  // Extraer NACIONALIDAD (puede ser "CHILENA" o código de país como "VEN")
  const nacionalidadPatterns = [
    /NACIONALIDAD[\s:]+(CHILENA|CHILE)/i,
    /NACIONALIDAD[\s:]+([A-Z]{2,3})/i
  ];
  
  for (const pattern of nacionalidadPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.nationality = match[1].trim();
      break;
    }
  }

  // Extraer SEXO (M o F)
  const sexoMatch = text.match(/SEXO[\s:]+([MF])/i);
  if (sexoMatch) {
    result.sex = sexoMatch[1].toUpperCase();
  }

  // Extraer FECHA DE NACIMIENTO (formato: DD MMM YYYY)
  const fechaNacPatterns = [
    /FECHA\s+DE\s+NACIMIENTO[\s:]+(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i,
    /NACIMIENTO[\s:]+(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i
  ];
  
  for (const pattern of fechaNacPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = parseChileanDate(match[1], match[2], match[3]);
      if (date) {
        result.birthDate = date;
      }
      break;
    }
  }

  // Extraer NÚMERO DOCUMENTO (puede ser numérico o alfanumérico como "B1234567")
  const docNumberPatterns = [
    /N[ÚU]MERO\s+DOCUMENTO[\s:]+([A-Z0-9\.\s]+?)(?:\n|FECHA|EMISI|VENC|$)/i,
    /DOCUMENTO[\s:]+([A-Z0-9\.\s]+?)(?:\n|FECHA|EMISI|VENC|$)/i
  ];
  
  for (const pattern of docNumberPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.docNumber = match[1].trim().replace(/\s+/g, '').replace(/\./g, '');
      break;
    }
  }

  // Extraer FECHA DE EMISIÓN
  const fechaEmisionPatterns = [
    /FECHA\s+DE\s+EMISI[ÓO]N[\s:]+(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i,
    /EMISI[ÓO]N[\s:]+(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i
  ];
  
  for (const pattern of fechaEmisionPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = parseChileanDate(match[1], match[2], match[3]);
      if (date) {
        result.issueDate = date;
      }
      break;
    }
  }

  // Extraer FECHA DE VENCIMIENTO
  const fechaVencPatterns = [
    /FECHA\s+DE\s+VENCIMIENTO[\s:]+(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i,
    /VENCIMIENTO[\s:]+(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i
  ];
  
  for (const pattern of fechaVencPatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = parseChileanDate(match[1], match[2], match[3]);
      if (date) {
        result.expiryDate = date;
      }
      break;
    }
  }

  return result;
};

// Función para parsear MRZ (Machine Readable Zone) de cédula chilena
const parseMRZ = (mrzLines) => {
  const result = {};
  
  if (!mrzLines || mrzLines.length < 2) return result;
  
  // El MRZ típicamente tiene 2-3 líneas
  // Línea 1: Tipo de documento (IECHL) + número documento + otros campos
  // Línea 2: Fecha nacimiento (YYMMDD) + Sexo (M/F) + Fecha vencimiento (YYMMDD) + Nacionalidad (3 letras) + RUN (8 dígitos) + DV (1 dígito) + checksums
  // Línea 3: Apellidos + Nombres separados por <
  
  const line1 = mrzLines[0] || '';
  const line2 = mrzLines[1] || '';
  const line3 = mrzLines[2] || '';
  
  // Extraer número de documento de línea 1 (después de IECHL)
  const docNumberMatch = line1.match(/IECHL([0-9]{9})/);
  if (docNumberMatch) {
    result.docNumber = docNumberMatch[1];
  }
  
  // Parsear línea 2: YYMMDDSEXYYMMDDNATRUN<DV<...
  // Ejemplo: 0003159M2807270PER23161628<4<6
  // Posiciones: 0-5: Fecha nacimiento (YYMMDD), 6: Sexo, 7-12: Fecha vencimiento (YYMMDD), 13-15: Nacionalidad, 16-23: RUN, 24: DV
  
  // Extraer fecha de nacimiento (YYMMDD) - primeros 6 dígitos
  const birthDateMatch = line2.match(/^(\d{6})/);
  if (birthDateMatch) {
    const yymmdd = birthDateMatch[1];
    const year = parseInt(yymmdd.slice(0, 2));
    const month = yymmdd.slice(2, 4);
    const day = yymmdd.slice(4, 6);
    // Ajustar año: si es > 50, probablemente es 1900, si no es 2000
    const fullYear = year > 50 ? `19${yymmdd.slice(0, 2)}` : `20${yymmdd.slice(0, 2)}`;
    result.birthDate = new Date(`${fullYear}-${month}-${day}`);
  }
  
  // Extraer sexo (M/F) - posición 6
  const sexMatch = line2.match(/^\d{6}([MF])/);
  if (sexMatch) {
    result.sex = sexMatch[1];
  }
  
  // Extraer fecha de vencimiento (YYMMDD) - después del sexo
  const expiryMatch = line2.match(/^\d{6}[MF](\d{6})/);
  if (expiryMatch) {
    const yymmdd = expiryMatch[1];
    const year = parseInt(yymmdd.slice(0, 2));
    const month = yymmdd.slice(2, 4);
    const day = yymmdd.slice(4, 6);
    const fullYear = year > 50 ? `19${yymmdd.slice(0, 2)}` : `20${yymmdd.slice(0, 2)}`;
    result.expiryDate = new Date(`${fullYear}-${month}-${day}`);
  }
  
  // Extraer nacionalidad (3 letras) - después de fecha vencimiento
  const nationalityMatch = line2.match(/^\d{6}[MF]\d{6}([A-Z]{3})/);
  if (nationalityMatch) {
    result.nationality = nationalityMatch[1];
  }
  
  // Extraer RUN y DV de línea 2
  // El RUN está después de la nacionalidad, típicamente 8 dígitos seguidos de < y luego el DV
  // Ejemplo: PER23161628<4
  const runMatch = line2.match(/[A-Z]{3}(\d{8})[<](\d{1})/);
  if (runMatch) {
    const runBody = runMatch[1];
    const dv = runMatch[2];
    result.rut = normalizeRut(`${runBody}${dv}`);
  } else {
    // Patrón alternativo: RUN sin separador explícito
    const runMatch2 = line2.match(/[A-Z]{3}(\d{8,9})/);
    if (runMatch2) {
      const runWithDV = runMatch2[1];
      if (runWithDV.length >= 8) {
        const runBody = runWithDV.slice(0, -1);
        const dv = runWithDV.slice(-1);
        result.rut = normalizeRut(`${runBody}${dv}`);
      }
    }
  }
  
  // Extraer nombre completo de línea 3
  // Formato: APELLIDO1<APELLIDO2<<NOMBRE1<NOMBRE2<<<<
  // Ejemplo: DEZA<SAMAME<<ANDRES<JOEL<<<<<<
  if (line3) {
    // Los nombres están separados por <
    const nameParts = line3.split('<').filter(part => part.trim().length > 0);
    if (nameParts.length >= 2) {
      // Los primeros son apellidos, los siguientes son nombres
      const lastNames = nameParts.slice(0, 2).join(' ').trim();
      const firstNames = nameParts.slice(2).join(' ').trim();
      result.lastNames = lastNames;
      result.firstNames = firstNames;
      result.fullName = `${firstNames} ${lastNames}`.trim();
    } else if (nameParts.length === 1) {
      // Solo un apellido
      result.lastNames = nameParts[0].trim();
      result.fullName = nameParts[0].trim();
    }
  }
  
  return result;
};

// Función para extraer campos del reverso de cédula chilena
const extractChileanIdBackFields = (text) => {
  const result = {};
  const textUpper = text.toUpperCase();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Detectar si es cédula de extranjero
  const isExtranjero = textUpper.includes('EXTRANJERO') || textUpper.includes('EXTRANJERA') || 
                       textUpper.includes('PERMANENCIA');
  result.isExtranjero = isExtranjero;

  // Detectar y parsear MRZ (Machine Readable Zone) - 2-3 líneas
  // Estrategia múltiple para detectar MRZ incluso con OCR imperfecto
  
  // Estrategia 1: Buscar líneas que contengan IECHL (prefijo de cédulas chilenas)
  const iechlIndex = lines.findIndex(line => {
    const cleaned = line.replace(/\s/g, '').toUpperCase();
    return cleaned.includes('IECHL');
  });
  
  let mrzLines = [];
  
  if (iechlIndex >= 0) {
    // Encontramos IECHL, tomar esa línea y las siguientes 2-3 líneas
    const potentialMRZ = lines.slice(iechlIndex, iechlIndex + 4);
    mrzLines = potentialMRZ.filter(line => {
      const cleaned = line.replace(/\s/g, '').toUpperCase();
      // Aceptar líneas que sean principalmente alfanuméricas con <
      const alphanumericRatio = (cleaned.match(/[A-Z0-9<]/g) || []).length / Math.max(cleaned.length, 1);
      return cleaned.length >= 15 && alphanumericRatio >= 0.8;
    });
  }
  
  // Estrategia 2: Si no encontramos con IECHL, buscar líneas que parezcan MRZ
  if (mrzLines.length < 2) {
    const strictMRZ = lines.filter(line => {
      const cleaned = line.replace(/\s/g, '').toUpperCase();
      const mrzPattern = /^[A-Z0-9<]+$/;
      return mrzPattern.test(cleaned) && cleaned.length >= 20;
    });
    
    if (strictMRZ.length >= 2) {
      mrzLines = strictMRZ.slice(-3); // Tomar las últimas 3 líneas que parezcan MRZ
    }
  }
  
  // Estrategia 3: Buscar líneas largas con muchos números y letras (características del MRZ)
  if (mrzLines.length < 2) {
    const longLines = lines.filter(line => {
      const cleaned = line.replace(/\s/g, '').toUpperCase();
      const digitCount = (cleaned.match(/\d/g) || []).length;
      const letterCount = (cleaned.match(/[A-Z]/g) || []).length;
      const totalLength = cleaned.length;
      // MRZ típicamente tiene muchos dígitos y letras
      return totalLength >= 25 && 
             (digitCount + letterCount) >= totalLength * 0.7 &&
             cleaned.includes('<');
    });
    
    if (longLines.length >= 2) {
      mrzLines = longLines.slice(-3);
    }
  }
  
  // Limpiar y normalizar las líneas MRZ encontradas
  mrzLines = mrzLines.map(line => {
    // Remover espacios y convertir a mayúsculas
    return line.replace(/\s/g, '').toUpperCase();
  }).filter(line => line.length >= 15); // Filtrar líneas muy cortas
  
  if (mrzLines.length >= 2) {
    result.hasMRZ = true;
    result.mrz = mrzLines.slice(-3).join('\n'); // Últimas 2-3 líneas
    
    // Parsear MRZ para extraer datos estructurados
    const mrzData = parseMRZ(mrzLines.slice(-3));
    if (mrzData.rut) {
      result.rut = mrzData.rut;
    }
    if (mrzData.birthDate) {
      result.birthDate = mrzData.birthDate;
    }
    if (mrzData.sex) {
      result.sex = mrzData.sex;
    }
    if (mrzData.expiryDate) {
      result.expiryDate = mrzData.expiryDate;
    }
    if (mrzData.nationality) {
      result.nationality = mrzData.nationality;
    }
    if (mrzData.fullName) {
      result.fullName = mrzData.fullName;
    }
    if (mrzData.firstNames) {
      result.firstNames = mrzData.firstNames;
    }
    if (mrzData.lastNames) {
      result.lastNames = mrzData.lastNames;
    }
    if (mrzData.docNumber) {
      result.docNumber = mrzData.docNumber;
    }
  }

  // Extraer VISA (solo para extranjeros)
  if (isExtranjero) {
    const visaPatterns = [
      /VISA[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|PROFESI|$)/i,
      /PERMANENCIA[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|PROFESI|$)/i
    ];
    for (const pattern of visaPatterns) {
      const visaMatch = text.match(pattern);
      if (visaMatch) {
        result.visa = visaMatch[1].trim();
        break;
      }
    }
  }

  // Extraer PROFESIÓN
  const profesionPatterns = [
    /PROFESI[ÓO]N[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|DOMICILIO|COMUNA|REGION|VISA|$)/i,
    /PROFESI[ÓO]N[\s:]+No\s+informada/i
  ];
  for (const pattern of profesionPatterns) {
    const profesionMatch = text.match(pattern);
    if (profesionMatch) {
      result.profession = profesionMatch[1] ? profesionMatch[1].trim() : 'No informada';
      break;
    }
  }

  // Extraer DOMICILIO
  const domicilioMatch = text.match(/DOMICILIO[\s:]+([A-ZÁÉÍÓÚÑ0-9\s,\.]+?)(?:\n|COMUNA|REGION|$)/i);
  if (domicilioMatch) {
    result.address = domicilioMatch[1].trim();
  }

  // Extraer COMUNA
  const comunaMatch = text.match(/COMUNA[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|REGION|$)/i);
  if (comunaMatch) {
    result.commune = comunaMatch[1].trim();
  }

  // Extraer REGIÓN
  const regionMatch = text.match(/REGION[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|ESTADO|$)/i);
  if (regionMatch) {
    result.region = regionMatch[1].trim();
  }

  // Extraer ESTADO CIVIL
  const estadoCivilMatch = text.match(/ESTADO\s+CIVIL[\s:]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|FOLIO|SERIE|$)/i);
  if (estadoCivilMatch) {
    result.maritalStatus = estadoCivilMatch[1].trim();
  }

  // Extraer FOLIO
  const folioMatch = text.match(/FOLIO[\s:]+([A-Z0-9\s]+?)(?:\n|SERIE|$)/i);
  if (folioMatch) {
    result.folio = folioMatch[1].trim().replace(/\s+/g, '');
  }

  // Extraer SERIE
  const serieMatch = text.match(/SERIE[\s:]+([A-Z0-9\s]+?)(?:\n|$)/i);
  if (serieMatch) {
    result.serie = serieMatch[1].trim().replace(/\s+/g, '');
  }

  // Detectar QR Code (presencia de caracteres QR típicos o patrón visual)
  // También considerar que si hay MRZ, probablemente hay QR code (son elementos estándar)
  if (textUpper.includes('QR') || 
      text.match(/\[QR\]/i) || 
      mrzLines.length > 0 || // Si hay MRZ, probablemente hay QR
      textUpper.includes('CODIGO') && textUpper.includes('QR')) {
    result.hasQRCode = true;
  }
  
  // Si no se detectó QR pero hay MRZ, asumir que hay QR (elemento estándar de cédulas chilenas)
  if (!result.hasQRCode && mrzLines.length >= 2) {
    result.hasQRCode = true;
  }

  return result;
};

// Función para calcular similitud coseno entre embeddings
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Iniciar sesión de verificación
export const startVerification = async (req, res) => {
  try {
    const { userId, rut } = req.body;

    const verification = new Verification({
      userId: userId || null,
      rut: rut || null,
      status: 'PENDING_DOCUMENT_FRONT'
    });

    await verification.save();

    res.status(200).json({
      success: true,
      verificationId: verification._id.toString(),
      status: verification.status
    });
  } catch (error) {
    console.error('Error starting verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar la verificación',
      error: error.message
    });
  }
};

// Procesar cédula frontal
export const processFrontId = async (req, res) => {
  try {
    const { verificationId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió la imagen de la cédula frontal'
      });
    }

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Sesión de verificación no encontrada'
      });
    }

    // Guardar imagen
    const imagePath = file.path;
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    
    verification.docData.frontImageUrl = imageUrl;

    // OCR con Tesseract
    const { data: { text } } = await Tesseract.recognize(imagePath, 'spa');
    console.log('OCR Text (frontal):', text);

    // Extraer campos específicos de cédula chilena
    const extractedData = extractChileanIdFields(text);
    
    // Validar y guardar RUT
    const extractedRut = extractedData.rut || extractRutFromText(text);
    if (extractedRut && validateRut(extractedRut)) {
      verification.docData.rut = extractedRut;
    }

    // Guardar otros campos extraídos del frente
    if (extractedData.fullName) {
      verification.docData.fullName = extractedData.fullName;
    }
    if (extractedData.firstNames) {
      verification.docData.firstNames = extractedData.firstNames;
    }
    if (extractedData.lastNames) {
      verification.docData.lastNames = extractedData.lastNames;
    }
    if (extractedData.birthDate) {
      verification.docData.birthDate = extractedData.birthDate;
    }
    if (extractedData.sex) {
      verification.docData.sex = extractedData.sex;
    }
    if (extractedData.nationality) {
      verification.docData.nationality = extractedData.nationality;
    }
    if (extractedData.docNumber) {
      verification.docData.docNumber = extractedData.docNumber;
    }
    if (extractedData.issueDate) {
      verification.docData.issueDate = extractedData.issueDate;
    }
    if (extractedData.expiryDate) {
      verification.docData.expiryDate = extractedData.expiryDate;
    }

    // Detección facial y generación de embedding (opcional, el frontend también lo hace)
    // Nota: El embedding se generará principalmente en el frontend
    // Este es solo un fallback opcional si Human está disponible en el backend
    try {
      const human = await initHuman();
      if (human) {
        const imageBuffer = await fs.readFile(imagePath);
        const result = await human.detect(imageBuffer);
        
        if (result && result.face && result.face.length > 0) {
          const face = result.face[0];
          const embedding = face.embedding || face.description;
          if (embedding && Array.isArray(embedding) && embedding.length > 0) {
            verification.embeddings.idCardFront = Array.from(embedding);
          }
        }
      }
    } catch (humanError) {
      // No crítico: el frontend generará el embedding
      console.log('Embedding de cédula frontal se generará en el frontend');
    }

    verification.status = 'PENDING_DOCUMENT_BACK';
    verification.updatedAt = new Date();
    await verification.save();

    res.status(200).json({
      success: true,
      nextStep: 'BACK',
      status: verification.status,
      extractedData: {
        rut: verification.docData.rut,
        fullName: verification.docData.fullName
      }
    });
  } catch (error) {
    console.error('Error processing front ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la cédula frontal',
      error: error.message
    });
  }
};

// Procesar cédula reverso
export const processBackId = async (req, res) => {
  try {
    const { verificationId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió la imagen del reverso de la cédula'
      });
    }

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Sesión de verificación no encontrada'
      });
    }

    // Guardar imagen
    const imagePath = file.path;
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    
    verification.docData.backImageUrl = imageUrl;

    // OCR con Tesseract - intentar primero sin restricciones para capturar todo el texto
    // Luego podemos hacer un segundo OCR específico para MRZ si es necesario
    let text = '';
    try {
      const result = await Tesseract.recognize(imagePath, 'spa', {
        logger: (m) => {
          // Filtrar warnings de imagen pequeña pero continuar
          if (m.status === 'recognizing text' || m.status === 'recognized text') {
            // Continuar normalmente
          }
        }
      });
      text = result.data.text;
      console.log('OCR Text (reverso) - Primera pasada:', text);
      console.log('OCR Text length:', text.length);
      console.log('OCR Text lines:', text.split('\n').length);
    } catch (ocrError) {
      // Si el error es por imagen pequeña, intentar con configuración diferente
      if (ocrError.message && ocrError.message.includes('too small')) {
        console.warn('Imagen pequeña detectada, intentando OCR con configuración alternativa...');
        try {
          const result2 = await Tesseract.recognize(imagePath, 'eng+spa', {
            tessedit_pageseg_mode: '6', // Asumir un bloque uniforme de texto
            logger: (m) => {
              // Ignorar warnings
            }
          });
          text = result2.data.text;
          console.log('OCR Text (reverso) - Segunda pasada (configuración alternativa):', text);
        } catch (retryError) {
          console.error('Error en OCR alternativo:', retryError);
          // Continuar con texto vacío, la validación visual puede pasar
          text = '';
        }
      } else {
        throw ocrError;
      }
    }
    
    // Si no encontramos palabras clave importantes, intentar OCR sin restricciones de idioma
    const textUpper = text.toUpperCase();
    if (!textUpper.includes('VISA') && !textUpper.includes('PERMANENCIA') && !textUpper.includes('IECHL') && text.length < 50) {
      console.log('No se encontraron keywords importantes, intentando OCR sin restricciones...');
      try {
        const result2 = await Tesseract.recognize(imagePath, 'eng+spa', {
          tessedit_pageseg_mode: '6', // Asumir un bloque uniforme de texto
        });
        if (result2.data.text && result2.data.text.length > text.length) {
          text = result2.data.text;
          console.log('OCR Text (reverso) - Segunda pasada (mejor resultado):', text);
        }
      } catch (retryError) {
        console.warn('Error en segunda pasada OCR, continuando con texto disponible:', retryError.message);
        // Continuar con el texto que tenemos
      }
    }

    // Extraer campos específicos del reverso
    const backFields = extractChileanIdBackFields(text);
    
    // Guardar campos extraídos del reverso
    // Si el MRZ tiene RUT, actualizar el RUT (más confiable que el OCR del frente)
    if (backFields.rut && validateRut(backFields.rut)) {
      verification.docData.rut = backFields.rut;
      verification.rut = backFields.rut;
    }
    
    // Actualizar otros campos del MRZ si están disponibles
    if (backFields.fullName) {
      verification.docData.fullName = backFields.fullName;
    }
    if (backFields.firstNames) {
      verification.docData.firstNames = backFields.firstNames;
    }
    if (backFields.lastNames) {
      verification.docData.lastNames = backFields.lastNames;
    }
    if (backFields.birthDate) {
      verification.docData.birthDate = backFields.birthDate;
    }
    if (backFields.sex) {
      verification.docData.sex = backFields.sex;
    }
    if (backFields.expiryDate) {
      verification.docData.expiryDate = backFields.expiryDate;
    }
    if (backFields.nationality) {
      verification.docData.nationality = backFields.nationality;
    }
    if (backFields.docNumber) {
      verification.docData.docNumber = backFields.docNumber;
    }
    
    // Campos adicionales del reverso
    if (backFields.address) {
      verification.docData.address = backFields.address;
    }
    if (backFields.commune) {
      verification.docData.commune = backFields.commune;
    }
    if (backFields.region) {
      verification.docData.region = backFields.region;
    }
    if (backFields.maritalStatus) {
      verification.docData.maritalStatus = backFields.maritalStatus;
    }
    if (backFields.folio) {
      verification.docData.folio = backFields.folio;
    }
    if (backFields.serie) {
      verification.docData.serie = backFields.serie;
    }
    if (backFields.profession) {
      verification.docData.profession = backFields.profession;
    }
    if (backFields.visa) {
      verification.docData.visa = backFields.visa;
    }
    if (backFields.isExtranjero !== undefined) {
      verification.docData.isExtranjero = backFields.isExtranjero;
    }
    if (backFields.hasMRZ !== undefined) {
      verification.docData.hasMRZ = backFields.hasMRZ;
    }
    if (backFields.mrz) {
      verification.docData.mrz = backFields.mrz;
    }
    if (backFields.hasQRCode !== undefined) {
      verification.docData.hasQRCode = backFields.hasQRCode;
    }

    // Verificar palabras clave del reverso (validación mejorada y más flexible)
    const backIdKeywords = [
      'REPUBLICA', 'CHILE', 'IDENTIDAD', 'DOMICILIO',
      'COMUNA', 'REGION', 'FOLIO', 'SERIE', 'ESTADO', 'CIVIL',
      'QR', 'HUELLA', 'FINGERPRINT', 'MRZ', 'VISA', 'PROFESION',
      'EXTRANJERO', 'PERMANENCIA', 'IECHL'
    ];
    
    // Asegurarse de que textUpper esté actualizado después de posibles cambios en text
    const textUpperFinal = text.toUpperCase();
    const foundKeywords = backIdKeywords.filter(keyword => textUpperFinal.includes(keyword));

    // Validación más flexible: 
    // - Si tiene MRZ válido con RUT extraído, es suficiente (el MRZ es el elemento más confiable)
    // - Si tiene MRZ válido (aunque no se haya extraído RUT), también es válido
    // - O si tiene al menos 1 keyword + QR/Huella
    // - O si tiene al menos 2 keywords
    // - O si tiene MRZ detectado (aunque no se haya parseado completamente)
    // - O si tiene VISA + PERMANENCIA (indicadores claros de cédula de extranjero válida)
    const hasMRZ = backFields.hasMRZ && backFields.mrz && backFields.mrz.length > 20;
    const hasMRZWithRut = hasMRZ && backFields.rut && validateRut(backFields.rut);
    const hasQRCode = backFields.hasQRCode;
    const hasFingerprint = textUpperFinal.includes('HUELLA') || textUpperFinal.includes('FINGERPRINT');
    const hasIECHL = textUpperFinal.includes('IECHL'); // Prefijo del MRZ de cédulas chilenas
    // Búsqueda más flexible para VISA y PERMANENCIA (el OCR puede tener errores)
    const hasVisa = textUpperFinal.includes('VISA') || textUpperFinal.includes('VIS A') || textUpperFinal.match(/VIS\s*A/i);
    const hasPermanencia = textUpperFinal.includes('PERMANENCIA') || 
                          textUpperFinal.includes('PERMANENCI') || 
                          textUpperFinal.includes('PERMANEN') ||
                          textUpperFinal.match(/PERMANENCI[A-Z]*/i);
    const hasVisaAndPermanencia = hasVisa && hasPermanencia; // Indicador muy fuerte de cédula válida
    
    // También buscar "DEFINITIVA" que suele aparecer junto a PERMANENCIA
    const hasDefinitiva = textUpperFinal.includes('DEFINITIVA') || textUpperFinal.includes('DEFINITIV');
    const hasPermanenciaOrDefinitiva = hasPermanencia || hasDefinitiva;
    
    // Validación más flexible: aceptar si tiene VISA + (PERMANENCIA o DEFINITIVA)
    const hasVisaWithPermanencia = hasVisa && hasPermanenciaOrDefinitiva;
    
    // Si tiene MRZ con RUT válido, es definitivamente válido
    if (hasMRZWithRut) {
      console.log('MRZ válido con RUT extraído:', backFields.rut);
    } else if (hasMRZ || hasIECHL) {
      // Si tiene MRZ o IECHL, también es válido (aunque no se haya extraído RUT)
      console.log('MRZ detectado, validando estructura...');
    } else if (hasVisaAndPermanencia || hasVisaWithPermanencia) {
      // Si tiene VISA y PERMANENCIA/DEFINITIVA, es una cédula de extranjero válida
      console.log('Cédula de extranjero detectada (VISA + PERMANENCIA/DEFINITIVA)');
    }
    
    // Validación muy flexible: aceptar si hay cualquier indicador de cédula válida
    // También considerar que si hay texto significativo + elementos visuales, es probablemente válido
    const hasSignificantText = text.length > 50; // Al menos 50 caracteres de texto
    const hasVisualElements = hasQRCode || hasFingerprint; // QR o huella visible
    
    const isValid = hasMRZWithRut || 
                    hasMRZ || 
                    hasIECHL ||
                    hasVisaAndPermanencia || // VISA + PERMANENCIA
                    hasVisaWithPermanencia || // VISA + (PERMANENCIA o DEFINITIVA)
                    (hasVisa && hasDefinitiva) || // VISA + DEFINITIVA
                    hasVisa || // Solo VISA (muy común en cédulas de extranjeros)
                    hasPermanenciaOrDefinitiva || // Solo PERMANENCIA/DEFINITIVA
                    (foundKeywords.length >= 1 && (hasQRCode || hasFingerprint)) ||
                    foundKeywords.length >= 2 ||
                    (hasVisa && foundKeywords.length >= 1) || // VISA + cualquier keyword
                    (hasPermanenciaOrDefinitiva && foundKeywords.length >= 1) || // PERMANENCIA/DEFINITIVA + cualquier keyword
                    (hasQRCode && foundKeywords.length >= 1) || // QR + cualquier keyword
                    (hasFingerprint && foundKeywords.length >= 1) || // Huella + cualquier keyword
                    (hasQRCode && hasFingerprint) || // QR + Huella (indicadores visuales fuertes)
                    (hasSignificantText && hasVisualElements && foundKeywords.length >= 1) || // Texto + elementos visuales + keyword
                    (hasSignificantText && hasQRCode && hasFingerprint); // Texto + QR + Huella (muy fuerte)
    
    // Log detallado para debugging
    console.log('Estado de validación del reverso:', {
      hasMRZ,
      hasMRZWithRut,
      hasIECHL,
      hasQRCode,
      hasFingerprint,
      hasVisa,
      hasPermanencia,
      hasDefinitiva,
      hasPermanenciaOrDefinitiva,
      hasVisaAndPermanencia,
      hasVisaWithPermanencia,
      foundKeywords,
      foundKeywordsCount: foundKeywords.length,
      mrzLength: backFields.mrz?.length,
      mrzPreview: backFields.mrz?.substring(0, 50),
      textPreview: text.substring(0, 300),
      isValid
    });
    
    if (!isValid) {
      console.log('Validación fallida - detalles:', {
        hasMRZ,
        hasMRZWithRut,
        hasIECHL,
        hasQRCode,
        hasFingerprint,
        hasVisa,
        hasPermanencia,
        hasDefinitiva,
        hasPermanenciaOrDefinitiva,
        hasVisaAndPermanencia,
        hasVisaWithPermanencia,
        foundKeywords,
        foundKeywordsCount: foundKeywords.length,
        mrzLength: backFields.mrz?.length,
        mrzPreview: backFields.mrz?.substring(0, 50),
        textPreview: text.substring(0, 300),
        textLength: text.length,
        textLines: text.split('\n').length
      });
      
      verification.status = 'REJECTED_DOC';
      await verification.save();
      return res.status(400).json({
        success: false,
        status: 'REJECTED_DOC',
        error: 'DOCUMENT_MISMATCH',
        message: 'El reverso de la cédula no contiene los elementos esperados de una cédula chilena válida. Asegúrate de que el MRZ (código de barras inferior con letras y números) sea completamente visible y legible.'
      });
    }
    
    console.log('Reverso validado exitosamente:', {
      hasMRZ,
      hasMRZWithRut,
      rut: backFields.rut,
      mrzLength: backFields.mrz?.length
    });

    verification.status = 'PENDING_LIVENESS';
    verification.updatedAt = new Date();
    await verification.save();

    res.status(200).json({
      success: true,
      nextStep: 'LIVENESS',
      status: verification.status
    });
  } catch (error) {
    console.error('Error processing back ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el reverso de la cédula',
      error: error.message
    });
  }
};

// Procesar selfie con liveness
export const processSelfie = async (req, res) => {
  try {
    const { verificationId, livenessScore, faceMatchScore, selfieEmbedding } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió la selfie'
      });
    }

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Sesión de verificación no encontrada'
      });
    }

    if (!verification.embeddings.idCardFront || verification.embeddings.idCardFront.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró embedding facial de la cédula. Por favor, vuelve a capturar la cédula frontal.'
      });
    }

    // Guardar selfie
    const imagePath = file.path;
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    
    verification.docData.selfieUrl = imageUrl;
    
    // Validar y sanitizar scores del frontend (seguridad)
    const incomingLivenessScore = parseFloat(livenessScore) || 0;
    const incomingFaceMatchScore = parseFloat(faceMatchScore);
    
    // Validar rangos (0-1 para ambos scores)
    if (incomingLivenessScore < 0 || incomingLivenessScore > 1) {
      return res.status(400).json({
        success: false,
        message: 'Score de liveness inválido. Debe estar entre 0 y 1.'
      });
    }
    
    if (incomingFaceMatchScore < 0 || incomingFaceMatchScore > 1) {
      return res.status(400).json({
        success: false,
        message: 'Score de similitud facial inválido. Debe estar entre 0 y 1.'
      });
    }
    
    verification.scores.liveness = incomingLivenessScore;

    // Si el frontend ya calculó el embedding y score, validarlos
    // Si no, intentar calcular en el backend (fallback)
    let calculatedFaceMatchScore = incomingFaceMatchScore;
    let selfieEmbeddingArray = null;

    if (selfieEmbedding) {
      try {
        selfieEmbeddingArray = JSON.parse(selfieEmbedding);
        
        // Validar estructura del embedding
        if (!Array.isArray(selfieEmbeddingArray)) {
          return res.status(400).json({
            success: false,
            message: 'Formato de embedding inválido. Debe ser un array.'
          });
        }
        
        // Validar longitud del embedding (típicamente 128 o 512 dimensiones)
        if (selfieEmbeddingArray.length < 64 || selfieEmbeddingArray.length > 1024) {
          return res.status(400).json({
            success: false,
            message: 'Dimensión del embedding inválida.'
          });
        }
        
        // Validar que todos los valores son números
        if (!selfieEmbeddingArray.every(val => typeof val === 'number' && !isNaN(val))) {
          return res.status(400).json({
            success: false,
            message: 'Embedding contiene valores inválidos.'
          });
        }
        
        verification.embeddings.selfie = selfieEmbeddingArray;
      } catch (parseError) {
        console.warn('Error parseando embedding del frontend:', parseError);
        return res.status(400).json({
          success: false,
          message: 'Error al procesar el embedding del frontend.'
        });
      }
    }

    // Si no se recibió el score del frontend, intentar calcular en backend (fallback opcional)
    // Nota: Esto solo funciona si Human está disponible en el backend
    if (!calculatedFaceMatchScore || isNaN(calculatedFaceMatchScore)) {
      // Intentar cargar Human si no se ha intentado
      if (!humanLoadAttempted) {
        await loadHuman();
      }
      
      if (Human) {
        try {
          const human = await initHuman();
          if (human) {
            const imageBuffer = await fs.readFile(imagePath);
            const result = await human.detect(imageBuffer);
            
            if (result && result.face && result.face.length > 0) {
              const face = result.face[0];
              const embedding = face.embedding || face.description;
              if (embedding && Array.isArray(embedding) && embedding.length > 0) {
                if (!selfieEmbeddingArray) {
                  verification.embeddings.selfie = Array.from(embedding);
                }
                
                // Calcular similitud si tenemos ambos embeddings
                if (verification.embeddings.idCardFront && verification.embeddings.idCardFront.length > 0) {
                  calculatedFaceMatchScore = cosineSimilarity(
                    verification.embeddings.idCardFront,
                    verification.embeddings.selfie || embedding
                  );
                }
              }
            }
          }
        } catch (humanError) {
          console.warn('Error usando Human en backend (normal). Usando datos del frontend.');
        }
      } else {
        console.warn('Human no disponible en backend. Se requiere que el frontend envíe faceMatchScore.');
      }
    }

    // Validar que tenemos un score válido
    if (!calculatedFaceMatchScore || isNaN(calculatedFaceMatchScore) || calculatedFaceMatchScore < 0 || calculatedFaceMatchScore > 1) {
      verification.status = 'REJECTED_LIVENESS';
      await verification.save();
      return res.status(400).json({
        success: false,
        status: 'REJECTED_LIVENESS',
        error: 'NO_FACE_MATCH',
        message: 'No se pudo calcular o validar la similitud facial'
      });
    }

    // Verificación adicional: Si tenemos ambos embeddings, recalcular score para validar
    // (doble verificación de seguridad)
    if (verification.embeddings.idCardFront && 
        verification.embeddings.idCardFront.length > 0 && 
        verification.embeddings.selfie && 
        verification.embeddings.selfie.length > 0) {
      
      const backendCalculatedScore = cosineSimilarity(
        verification.embeddings.idCardFront,
        verification.embeddings.selfie
      );
      
      // Si el score del frontend difiere mucho del backend (más de 0.15), es sospechoso
      const scoreDifference = Math.abs(calculatedFaceMatchScore - backendCalculatedScore);
      if (scoreDifference > 0.15) {
        console.warn(`⚠️ Diferencia significativa entre scores: Frontend=${calculatedFaceMatchScore.toFixed(3)}, Backend=${backendCalculatedScore.toFixed(3)}, Diff=${scoreDifference.toFixed(3)}`);
        // Usar el score del backend (más confiable) pero marcar para revisión
        calculatedFaceMatchScore = backendCalculatedScore;
        verification.status = 'PENDING_REVIEW'; // Marcar para revisión manual
      }
    }

    verification.scores.faceMatch = calculatedFaceMatchScore;

    // Aplicar reglas de decisión
    const liveness = parseFloat(livenessScore) || 0;
    
    if (liveness >= 0.7 && calculatedFaceMatchScore >= 0.8) {
      verification.status = 'VERIFIED';
    } else if (liveness < 0.4) {
      verification.status = 'REJECTED_LIVENESS';
    } else if (calculatedFaceMatchScore < 0.5) {
      verification.status = 'REJECTED_FACE_MISMATCH';
    } else {
      verification.status = 'PENDING_REVIEW';
    }

    verification.updatedAt = new Date();
    await verification.save();

    res.status(200).json({
      success: true,
      status: verification.status,
      scores: {
        liveness: verification.scores.liveness,
        faceMatch: verification.scores.faceMatch
      }
    });
  } catch (error) {
    console.error('Error processing selfie:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la selfie',
      error: error.message
    });
  }
};

// Obtener estado de verificación
export const getVerificationStatus = async (req, res) => {
  try {
    const { verificationId } = req.params;

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Sesión de verificación no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      verification: {
        id: verification._id,
        status: verification.status,
        scores: verification.scores,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt
      }
    });
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el estado de verificación',
      error: error.message
    });
  }
};

