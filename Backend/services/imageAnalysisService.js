import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY no está configurada. El análisis de imágenes estará deshabilitado.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Función auxiliar para leer imagen y convertir a base64
 */
const prepareImage = (imagePath, imageBase64) => {
  let imageData;
  if (imageBase64) {
    imageData = Buffer.from(imageBase64, 'base64');
  } else if (imagePath && fs.existsSync(imagePath)) {
    imageData = fs.readFileSync(imagePath);
  } else {
    return null;
  }
  return imageData.toString('base64');
};

/**
 * Analiza solo la RAZA de una mascota desde una imagen
 * 
 * @param {String} imagePath - Ruta al archivo de imagen
 * @param {String} imageBase64 - Imagen en base64 (alternativa a imagePath)
 * @param {String} mimeType - Tipo MIME de la imagen
 * @param {Object} context - Contexto adicional (especie conocida, etc.)
 * @returns {Promise<Object>} Resultado del análisis de raza
 */
export const analyzeBreed = async (imagePath, imageBase64 = null, mimeType = 'image/jpeg', context = {}) => {
  if (!genAI) {
    return {
      success: false,
      message: 'Servicio de IA no disponible. Configure GEMINI_API_KEY en las variables de entorno.'
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const base64Image = prepareImage(imagePath, imageBase64);
    if (!base64Image) {
      return {
        success: false,
        message: 'No se proporcionó una imagen válida'
      };
    }

    const speciesContext = context.species ? `La especie es: ${context.species}.` : '';
    const prompt = `Eres un experto veterinario certificado en identificación de razas caninas y felinas, con conocimiento profundo de:
- Estándares de raza según FCI (Federación Cinológica Internacional), AKC (American Kennel Club), y estándares chilenos
- Características morfológicas, fenotípicas y genotípicas distintivas
- Genética de razas y herencia de características
- Clasificación según tamaño, estructura corporal, tipo de pelaje, forma de cabeza, proporciones corporales
- Razas reconocidas internacionalmente y sus variantes regionales
- Medicina preventiva específica por raza: predisposiciones genéticas, problemas de salud comunes, cuidados preventivos recomendados
- Protocolos de vacunación y desparasitación adaptados a razas específicas
- Manejo y cuidados especiales según características raciales

${speciesContext}

Analiza esta imagen con rigor científico y proporciona SOLO información sobre la RAZA:

**METODOLOGÍA DE IDENTIFICACIÓN:**

1. **ANÁLISIS MORFOLÓGICO:**
   - Estructura corporal: proporciones (braquimorfo, mesomorfo, dolichomorfo), altura a la cruz, longitud corporal
   - Cabeza: forma (braquicefálica, mesocefálica, dolicocefálica), stop, hocico, orejas (posición, forma, tamaño)
   - Pelaje: tipo (corto, largo, rizado, doble manto), textura, patrón de color, distribución
   - Extremidades: longitud, angulación, estructura ósea
   - Cola: longitud, posición, forma (cola de zorro, curvada, anillada, etc.)

2. **CARACTERÍSTICAS FENOTÍPICAS DISTINTIVAS:**
   - Marcas características de la raza (máscara, patrón de color, marcas blancas)
   - Tipo de pelaje específico (pelo duro, sedoso, lanoso, etc.)
   - Características faciales únicas (expresión, forma de ojos, tamaño de orejas)

3. **CLASIFICACIÓN:**
   - Tamaño según estándares veterinarios: Toy (<10kg), Pequeño (10-25kg), Mediano (25-40kg), Grande (40-65kg), Gigante (>65kg) para perros
   - Tamaño para gatos: Pequeño (<3kg), Mediano (3-6kg), Grande (>6kg)
   - Grupo racial según FCI (perros de compañía, sabuesos, terriers, etc.)

4. **IDENTIFICACIÓN DE MESTIZOS:**
   - Analiza características dominantes y recesivas
   - Identifica patrones de herencia visible
   - Estima porcentajes basados en características morfológicas observables

5. **CUIDADOS PREVENTIVOS ESPECÍFICOS POR RAZA:**
   - Proporciona problemas de salud comunes documentados para la raza identificada
   - Incluye recomendaciones preventivas específicas basadas en características raciales
   - Lista protocolos de vacunación estándar y vacunas adicionales recomendadas
   - Menciona cuidados especiales requeridos (ej: limpieza de pliegues, cuidados dentales, ejercicio específico)
   - Basa la información en medicina veterinaria actual y conocimiento científico

**CRITERIOS DE CONFIANZA:**
- Alta confianza (80-100%): Características muy distintivas y únicas de una raza específica, imagen clara
- Media confianza (50-79%): Varias características coinciden, pero algunas variaciones o imagen parcial
- Baja confianza (30-49%): Pocas características distintivas o imagen de baja calidad
- Mestizo identificado: Mezcla clara de características de múltiples razas

**IMPORTANTE:**
- Usa nomenclatura científica y estándares profesionales (ej: "Dachshund" no "Perro salchicha" en identificación técnica, pero adapta al español para presentación)
- Sé conservador con los porcentajes: la certeza absoluta solo es posible con pruebas genéticas
- Si la imagen no permite identificación precisa, indica limitaciones específicas
- Considera variaciones dentro de las razas (p. ej., variedades de color en Labrador, tipos de Bulldog)
- Para cuidados preventivos, proporciona información específica y práctica basada en medicina veterinaria actual, incluyendo:
  * Problemas de salud comunes documentados para esa raza
  * Recomendaciones preventivas específicas (ejercicio, dieta, cuidados especiales)
  * Protocolos de vacunación estándar y vacunas adicionales recomendadas según la raza
  * Cuidados especiales según características raciales (ej: limpieza de pliegues, cuidados dentales, etc.)
- Responde EN ESPAÑOL, usando terminología profesional pero accesible, adaptada al contexto veterinario chileno

**RESPUESTA EN FORMATO JSON:**
{
  "species": "Perro" | "Gato",
  "primaryBreed": {
    "name": "Nombre de la raza en español (nombre oficial si es conocido)",
    "confidence": 85,
    "size": "Toy" | "Pequeño" | "Mediano" | "Grande" | "Gigante",
    "characteristics": [
      "Característica morfológica específica 1 (ej: 'Cabeza braquicefálica, stop pronunciado')",
      "Característica del pelaje (ej: 'Doble manto, subpelo denso')",
      "Característica distintiva única (ej: 'Orejas erguidas triangulares, cola enroscada sobre la espalda')"
    ],
    "sizeRange": "Rango de peso típico en kg (ej: '5-8 kg')"
  },
  "secondaryBreeds": [
    {
      "name": "Raza secundaria probable",
      "confidence": 25,
      "reason": "Razón por la que se identifica esta raza (característica observada)"
    }
  ],
  "isMixed": true/false,
  "estimatedSize": "Toy" | "Pequeño" | "Mediano" | "Grande" | "Gigante",
  "confidenceLevel": "Alta" | "Media" | "Baja",
  "morphologicalNotes": "Descripción técnica de características morfológicas observadas",
  "notes": "Observaciones sobre identificación, limitaciones de la imagen, o características inusuales observadas",
  "preventiveCare": {
    "commonIssues": [
      "Problema de salud común 1 específico de la raza (ej: 'Displasia de cadera en razas grandes')",
      "Problema común 2 (ej: 'Problemas oculares en razas braquicefálicas')",
      "Problema común 3 si aplica"
    ],
    "recommendations": [
      "Recomendación preventiva específica 1 (ej: 'Control de peso regular para prevenir problemas articulares')",
      "Recomendación 2 (ej: 'Limpieza periódica de pliegues faciales para prevenir dermatitis')",
      "Recomendación 3 (ej: 'Ejercicio moderado y controlado')"
    ],
    "vaccines": [
      "Óctuple anual",
      "Antirrábica obligatoria",
      "Vacunas adicionales específicas si aplica (ej: 'Tos de las perreras' para razas de guardia)"
    ],
    "specialCare": [
      "Cuidado especial 1 si aplica (ej: 'Requiere cepillado diario por pelaje largo')",
      "Cuidado especial 2 si aplica (ej: 'Evitar ejercicio intenso en climas cálidos')"
    ]
  }
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      const parsedResponse = JSON.parse(jsonText);

      return {
        success: true,
        data: parsedResponse,
        rawText: text
      };
    } catch (parseError) {
      console.warn('Error al parsear respuesta de análisis de raza:', parseError.message);
      return {
        success: true,
        data: {
          species: 'Desconocido',
          primaryBreed: { name: 'No identificado', confidence: 0 },
          isMixed: false,
          notes: 'No se pudo identificar con certeza'
        },
        rawText: text,
        parseError: process.env.NODE_ENV === 'development' ? parseError.message : undefined
      };
    }
  } catch (error) {
    console.error('Error al analizar raza:', error);
    
    if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
      return {
        success: false,
        message: 'Se ha alcanzado el límite de cuota de la API. Intenta más tarde.',
        code: 'QUOTA_EXCEEDED'
      };
    }

    return {
      success: false,
      message: error.message || 'Error al analizar la raza',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * Analiza solo PROBLEMAS DE SALUD visibles en una imagen de mascota
 * 
 * @param {String} imagePath - Ruta al archivo de imagen
 * @param {String} imageBase64 - Imagen en base64 (alternativa a imagePath)
 * @param {String} mimeType - Tipo MIME de la imagen
 * @param {Object} context - Contexto adicional (especie conocida, etc.)
 * @returns {Promise<Object>} Resultado del análisis de salud
 */
export const analyzeHealth = async (imagePath, imageBase64 = null, mimeType = 'image/jpeg', context = {}) => {
  if (!genAI) {
    return {
      success: false,
      message: 'Servicio de IA no disponible. Configure GEMINI_API_KEY en las variables de entorno.'
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const base64Image = prepareImage(imagePath, imageBase64);
    if (!base64Image) {
      return {
        success: false,
        message: 'No se proporcionó una imagen válida'
      };
    }

    const speciesContext = context.species ? `La especie identificada es: ${context.species}.` : '';
    const userContextInfo = context.userContext ? `
    
**HISTORIA CLÍNICA PROPORCIONADA POR EL TUTOR:**
${context.userContext}

**ANÁLISIS INTEGRADO:** Combina la información visual de la imagen con la historia clínica proporcionada:
- Correlaciona síntomas mencionados con hallazgos visuales
- Ajusta probabilidades diagnósticas según la evolución temporal reportada
- Prioriza hallazgos que coinciden con el contexto (ej: si menciona "crecimiento reciente", enfócate en masas o protuberancias)
- Considera la cronología: problemas agudos vs. crónicos según duración reportada
- Evalúa urgencia considerando tanto signos visuales como síntomas descritos
` : '';
    
    const prompt = `Eres un veterinario clínico certificado con especialización en dermatología, oftalmología, oncología y medicina de emergencia. Tienes experiencia extensa en diagnóstico diferencial y semiología veterinaria.

**ESPECIALIDADES:** Dermatología canina/felina, Oncología, Oftalmología, Cirugía, Medicina de urgencias veterinarias.

${speciesContext}${userContextInfo}

**METODOLOGÍA DE ANÁLISIS CLÍNICO:**

Analiza esta imagen aplicando protocolos de diagnóstico visual veterinario profesional. Utiliza terminología médica precisa y realiza un diagnóstico diferencial basado en signos clínicos visibles.

**1. SISTEMA DE EVALUACIÓN POR SISTEMAS:**

**A. DERMATOLOGÍA Y TEGUMENTO:**
   - Lesiones cutáneas primarias: pápulas, pústulas, vesículas, nódulos, tumores, úlceras, erosiones
   - Lesiones secundarias: costras, escamas, liquenificación, hiperpigmentación, alopecia (patrón: simétrico, focal, multifocal, difuso)
   - Características de masas: tamaño, forma, color, superficie, bordes, ulceración, pigmentación
   - Signos de inflamación: eritema, edema, calor (si se puede inferir), dolor (postura/protección)
   - Cambios de pigmentación: hipopigmentación, hiperpigmentación, despigmentación

**B. OFTALMOLOGÍA:**
   - Córnea: opacidades, úlceras, vascularización, edema
   - Conjuntiva: hiperemia, quimosis, secreciones (serosa, mucoide, purulenta, hemorrágica)
   - Iris: cambios de color, pupilas (anisocoria, midriasis, miosis)
   - Tercer párpado: protrusión, hiperemia, masas
   - Signos de dolor ocular: blefaroespasmo, epífora, fotofobia

**C. SISTEMA MUSCULOESQUELÉTICO:**
   - Postura anormal: cojera, parálisis parcial, decúbito anormal
   - Atrofia muscular visible
   - Deformidades articulares o óseas
   - Inflamación articular o periarticular

**D. SIGNOS VITALES Y ESTADO GENERAL:**
   - Postura: alerta, depresión, letargia, decúbito
   - Condición corporal: caquexia, obesidad, estado general
   - Expresión facial: dolor, malestar, alerta
   - Respiración: disnea visible, postura ortopnéica

**E. ORIFICIOS NATURALES:**
   - Oídos: eritema, secreciones, lesiones, masas
   - Cavidad oral: color de mucosas, lesiones, masas
   - Región perianal: lesiones, masas, secreciones

**2. DIAGNÓSTICO DIFERENCIAL PROFESIONAL:**

Para cada hallazgo, proporciona:
- **Diagnóstico presuntivo:** Condición más probable basada en signos clínicos
- **Diagnósticos diferenciales:** Otras condiciones que podrían presentar signos similares
- **Probabilidad diagnóstica:** Basada en especificidad de los signos visuales
- **Signos patognomónicos:** Características que son altamente específicas de una condición

**3. ESCALA DE URGENCIA VETERINARIA PROFESIONAL:**

**URGENCIA MÉDICA INMEDIATA (atención en <2 horas):**
- Signos de shock, dificultad respiratoria severa
- Hemorragia activa significativa
- Trauma mayor evidente
- Síntomas neurológicos agudos
- Dolor severo evidente

**URGENCIA ALTA (atención en 24 horas):**
- Masas que crecen rápidamente o ulceradas
- Heridas profundas o infectadas
- Signos de infección sistémica
- Problemas oculares agudos
- Dolor moderado-severo

**URGENCIA MEDIA (atención en 2-7 días):**
- Lesiones cutáneas que progresan
- Masas estables pero monitoreables
- Problemas crónicos que se agravan

**URGENCIA BAJA (consulta programada):**
- Lesiones estables, no progresivas
- Condiciones crónicas estables

**4. CRITERIOS DE SEVERIDAD:**

**ALTA SEVERIDAD:**
- Compromiso de función vital (respiratoria, neurológica, cardiovascular)
- Dolor severo
- Progresión rápida
- Riesgo de complicaciones serias

**MEDIA SEVERIDAD:**
- Compromiso funcional moderado
- Dolor moderado
- Progresión lenta pero presente
- Potencial de complicaciones

**BAJA SEVERIDAD:**
- Compromiso funcional mínimo
- Dolor leve o ausente
- Estable o mejorando
- Riesgo bajo de complicaciones

**5. LIMITACIONES Y CONSIDERACIONES:**

- Un diagnóstico definitivo requiere examen físico completo, historia clínica detallada, y posiblemente pruebas diagnósticas
- Las imágenes pueden no mostrar el alcance completo de una condición
- La ausencia de signos visuales no descarta condiciones internas o sistémicas
- Algunas condiciones requieren diagnóstico histopatológico o de laboratorio
- Considera variaciones normales (pigmentación, cicatrices antiguas, características raciales)

**IMPORTANTE:**
- Usa terminología veterinaria precisa (ej: "alopecia areata" no solo "caída de pelo", "pioderma superficial" no solo "infección de piel")
- Sé conservador con porcentajes de certeza: diagnóstico visual tiene limitaciones inherentes
- Indica claramente cuando los hallazgos son sugestivos pero no diagnósticos
- Proporciona diagnóstico diferencial cuando sea apropiado
- Responde EN ESPAÑOL, usando terminología profesional adaptada al contexto veterinario chileno

**RESPUESTA EN FORMATO JSON:**
{
  "hasIssues": true/false,
  "issues": [
    {
      "type": "Tipo de lesión usando terminología veterinaria (ej: 'Nódulo subcutáneo', 'Alopecia simétrica bilateral', 'Úlcera corneal')",
      "possibleCondition": "Diagnóstico presuntivo (nombre de la condición en terminología veterinaria, ej: 'Mastocitoma cutáneo', 'Dermatitis alérgica por pulgas', 'Queratitis ulcerativa')",
      "differentialDiagnoses": ["Diagnóstico diferencial 1", "Diagnóstico diferencial 2"],
      "confidence": 75,
      "location": "Ubicación anatómica precisa (ej: 'Región dorsolateral izquierda, T10-L2', 'Córnea izquierda', 'Pliegue auricular izquierdo')",
      "description": "Descripción detallada de lo observado (compatible con frontend - versión accesible)",
      "clinicalDescription": "Descripción técnica detallada de signos clínicos observados usando terminología veterinaria profesional",
      "severity": "bajo" | "medio" | "alto",
      "urgency": "bajo" | "medio" | "alto" | "urgente",
      "requiresImmediateAttention": true/false,
      "pathognomonicSigns": ["Signo específico 1 si aplica", "Signo específico 2 si aplica"]
    }
  ],
  "overallHealth": "bueno" | "revisar" | "atención_requerida" | "urgente",
  "notes": "Observaciones generales sobre el estado de salud visual (compatibilidad con frontend)",
  "clinicalNotes": "Observaciones clínicas profesionales detalladas sobre el estado general y hallazgos específicos",
  "limitations": "Limitaciones del análisis visual (ej: 'No se puede evaluar función, solo morfología', 'Se requiere palpación para evaluar consistencia de masa')",
  "recommendation": {
    "shouldSeeVet": true/false,
    "urgencyLevel": "bajo" | "medio" | "alto" | "urgente",
    "recommendedAction": "Acción específica recomendada basada en protocolos veterinarios",
    "timeframe": "Tiempo específico según urgencia (ej: 'Inmediatamente (<2 horas)', 'Dentro de 24 horas', 'Consulta programada en 3-7 días')",
    "suggestedDiagnosticTests": ["Prueba diagnóstica sugerida 1 si aplica", "Prueba diagnóstica sugerida 2 si aplica"]
  }
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      const parsedResponse = JSON.parse(jsonText);

      return {
        success: true,
        data: parsedResponse,
        rawText: text
      };
    } catch (parseError) {
      console.warn('Error al parsear respuesta de análisis de salud:', parseError.message);
      return {
        success: true,
        data: {
          hasIssues: false,
          issues: [],
          overallHealth: 'bueno',
          notes: 'No se pudo realizar análisis detallado'
        },
        rawText: text,
        parseError: process.env.NODE_ENV === 'development' ? parseError.message : undefined
      };
    }
  } catch (error) {
    console.error('Error al analizar salud:', error);
    
    if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
      return {
        success: false,
        message: 'Se ha alcanzado el límite de cuota de la API. Intenta más tarde.',
        code: 'QUOTA_EXCEEDED'
      };
    }

    return {
      success: false,
      message: error.message || 'Error al analizar la salud',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * Función legacy - mantiene compatibilidad pero ya no se usa
 * @deprecated Usar analyzeBreed o analyzeHealth según corresponda
 */
export const analyzePetImage = async (imagePath, imageBase64 = null, mimeType = 'image/jpeg', context = {}) => {
  const breedResult = await analyzeBreed(imagePath, imageBase64, mimeType, context);
  const healthResult = await analyzeHealth(imagePath, imageBase64, mimeType, context);

  if (!breedResult.success || !healthResult.success) {
    return {
      success: false,
      message: breedResult.message || healthResult.message
    };
  }

  return {
    success: true,
    data: {
      breedAnalysis: breedResult.data,
      healthAnalysis: healthResult.data
    }
  };
};

/**
 * Convierte un archivo subido a base64
 */
export const fileToBase64 = (file) => {
  if (file.buffer) {
    return file.buffer.toString('base64');
  }
  if (file.data) {
    return Buffer.from(file.data).toString('base64');
  }
  return null;
};
