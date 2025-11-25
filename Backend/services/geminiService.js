import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY no está configurada. Las funciones de IA estarán deshabilitadas.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Modelo a usar según documentación oficial: https://ai.google.dev/gemini-api/docs?hl=es-419
// gemini-2.5-flash: Modelo más equilibrado recomendado por Google
// Alternativas: 'gemini-2.5-pro', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'
// Nota: Para la mayoría de modelos puedes comenzar con nivel gratuito sin facturación
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Genera recomendaciones personalizadas para una mascota usando Gemini AI
 * @param {Object} petData - Datos de la mascota (especie, raza, edad, peso, etc.)
 * @param {Array} vaccines - Historial de vacunas
 * @param {Array} dewormings - Historial de desparasitaciones
 * @param {Array} medicalRecords - Historial médico
 * @param {String} context - Contexto adicional (ej: "vacunas", "nutrición", "peso")
 * @returns {Promise<Object>} Recomendaciones generadas por IA
 */
export const generatePreventiveCareRecommendations = async (petData, vaccines = [], dewormings = [], medicalRecords = [], context = 'general') => {
  if (!genAI) {
    return {
      success: false,
      message: 'Servicio de IA no disponible. Configure GEMINI_API_KEY en las variables de entorno.'
    };
  }

  try {
    // Validar que los arrays sean realmente arrays
    const validVaccines = Array.isArray(vaccines) ? vaccines : [];
    const validDewormings = Array.isArray(dewormings) ? dewormings : [];
    const validMedicalRecords = Array.isArray(medicalRecords) ? medicalRecords : [];
    
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Asegurarse de que petData sea un objeto plano y no un documento de Mongoose
    const pet = petData && typeof petData === 'object' 
      ? (petData.toObject ? petData.toObject() : petData)
      : {};

    // Validar y preparar valores seguros
    const petName = pet?.name || 'N/A';
    const petSpecies = pet?.species || 'N/A';
    const petBreed = pet?.breed || 'N/A';
    const petAgeYears = pet?.ageYears !== undefined && pet?.ageYears !== null ? pet.ageYears : 0;
    const petAgeMonths = pet?.ageMonths !== undefined && pet?.ageMonths !== null ? pet.ageMonths : 0;
    const petWeight = pet?.weight !== undefined && pet?.weight !== null ? pet.weight : 'No registrado';
    const petGender = pet?.gender || 'N/A';

    // Preparar el contexto de la mascota
    const petInfo = `
Mascota:
- Nombre: ${petName}
- Especie: ${petSpecies}
- Raza: ${petBreed}
- Edad: ${petAgeYears} años, ${petAgeMonths} meses
- Peso actual: ${petWeight} kg
- Género: ${petGender}
`;

    // Preparar historial de vacunas (ya están convertidos a objetos planos, pero verificamos por seguridad)
    const vaccinesInfo = validVaccines.length > 0 
      ? validVaccines.map(v => {
          try {
            const vaccine = v.toObject ? v.toObject() : v;
            let appDate = 'Fecha no disponible';
            if (vaccine.applicationDate) {
              try {
                const date = new Date(vaccine.applicationDate);
                if (!isNaN(date.getTime())) {
                  appDate = date.toLocaleDateString('es-CL');
                }
              } catch (e) {
                console.warn('Error formateando fecha de aplicación:', e);
              }
            }
            let expDate = '';
            if (vaccine.expirationDate) {
              try {
                const date = new Date(vaccine.expirationDate);
                if (!isNaN(date.getTime())) {
                  expDate = `, Vence el ${date.toLocaleDateString('es-CL')}`;
                }
              } catch (e) {
                console.warn('Error formateando fecha de expiración:', e);
              }
            }
            return `- ${vaccine.name || 'Sin nombre'} (${vaccine.type || 'N/A'}): Aplicada el ${appDate}${expDate}`;
          } catch (e) {
            console.warn('Error procesando vacuna:', e);
            return null;
          }
        }).filter(Boolean).join('\n')
      : 'No hay vacunas registradas';

    // Preparar historial de desparasitaciones (ya están convertidos a objetos planos)
    const dewormingsInfo = validDewormings.length > 0
      ? validDewormings.map(d => {
          try {
            const deworm = d.toObject ? d.toObject() : d;
            let appDate = 'Fecha no disponible';
            if (deworm.applicationDate) {
              try {
                const date = new Date(deworm.applicationDate);
                if (!isNaN(date.getTime())) {
                  appDate = date.toLocaleDateString('es-CL');
                }
              } catch (e) {
                console.warn('Error formateando fecha de aplicación:', e);
              }
            }
            let nextDate = '';
            if (deworm.nextApplicationDate) {
              try {
                const date = new Date(deworm.nextApplicationDate);
                if (!isNaN(date.getTime())) {
                  nextDate = `, Próxima el ${date.toLocaleDateString('es-CL')}`;
                }
              } catch (e) {
                console.warn('Error formateando fecha próxima aplicación:', e);
              }
            }
            return `- ${deworm.name || 'Sin nombre'} (${deworm.type || 'N/A'}): Aplicada el ${appDate}${nextDate}`;
          } catch (e) {
            console.warn('Error procesando desparasitación:', e);
            return null;
          }
        }).filter(Boolean).join('\n')
      : 'No hay desparasitaciones registradas';

    // Preparar historial médico (diagnósticos/patologías) - ya están convertidos a objetos planos
    const medicalHistoryInfo = validMedicalRecords.length > 0
      ? validMedicalRecords.map(r => {
          try {
            const record = r.toObject ? r.toObject() : r;
            let recordDate = 'Fecha no disponible';
            if (record.date) {
              try {
                const date = new Date(record.date);
                if (!isNaN(date.getTime())) {
                  recordDate = date.toLocaleDateString('es-CL');
                }
              } catch (e) {
                console.warn('Error formateando fecha del registro médico:', e);
              }
            }
            const diagnosis = Array.isArray(record.diagnosis) ? record.diagnosis.join(', ') : (record.diagnosis || 'Sin diagnóstico específico');
            return `- ${record.title || 'Sin título'} (${recordDate}): ${diagnosis}`;
          } catch (e) {
            console.warn('Error procesando registro médico:', e);
            return null;
          }
        }).filter(Boolean).join('\n')
      : 'No hay historial médico registrado';

    // Prompt según el contexto
    let prompt = '';
    switch (context) {
      case 'vaccines':
        prompt = `Eres un veterinario experto en medicina preventiva y vacunación. Analiza el historial de vacunación y proporciona recomendaciones específicas:

${petInfo}

Historial de Vacunas:
${vaccinesInfo}

Historial Médico Relevante:
${medicalHistoryInfo}

IMPORTANTE: 
- Identifica vacunas vencidas o próximas a vencer
- Recomienda vacunas según el esquema adecuado para la especie, raza y edad
- Si no hay historial de vacunación, proporciona el esquema completo desde el inicio
- Considera el protocolo de vacunación para Chile

Por favor, proporciona:
1. Análisis crítico del estado actual de vacunación (qué está al día, qué falta, qué está por vencer)
2. Lista específica de vacunas pendientes o próximas a vencerse con fechas sugeridas
3. Recomendaciones de vacunas adicionales según la especie, raza y edad específica
4. Calendario mensual de vacunación para los próximos 12 meses con fechas específicas
5. Explicaciones claras y comprensibles para el tutor sobre por qué cada vacuna es importante

Responde en español, en formato JSON con esta estructura (responde SOLO con JSON válido):
{
  "analysis": "Análisis detallado del estado actual de vacunación",
  "pendingVaccines": ["Vacuna específica pendiente 1", "Vacuna específica pendiente 2"],
  "upcomingVaccines": ["Vacuna próxima a vencer con fecha", "Otra vacuna próxima"],
  "recommendations": ["Recomendación específica 1", "Recomendación específica 2"],
  "calendar": [
    {
      "month": "Mes y año (ej: 'Enero 2024')",
      "vaccines": ["Vacuna específica con fecha", "Otra vacuna si aplica"]
    }
  ],
  "friendlyText": "Texto amigable y claro explicando el estado de vacunación y qué acciones tomar"
}`;
        break;

      case 'nutrition':
        prompt = `Eres un veterinario nutricionista experto. Analiza la información de la mascota y genera recomendaciones de nutrición específicas y prácticas:

${petInfo}

Historial Médico:
${medicalHistoryInfo}

IMPORTANTE: 
- Si el peso actual está disponible, compara con el rango ideal para la especie y raza específica
- Si el peso está dentro del rango normal (entre el mínimo y máximo ideal), indica claramente "El peso está dentro del rango saludable"
- Proporciona recomendaciones específicas basadas en la edad, actividad y condición física
- Si no hay suficiente información, indica qué datos adicionales serían útiles (nivel de actividad, tipo de alimentación actual, etc.)

Por favor, proporciona:
1. Análisis detallado del peso actual comparado con el rango ideal para esta especie y raza específica
2. Recomendaciones de alimentación diaria específicas (cantidad en gramos/tazas, frecuencia de comidas)
3. Tipo de alimento recomendado basado en edad, peso y condición (seco premium, húmedo, dieta especial, etc.)
4. Consideraciones especiales según patologías previas o condiciones de salud
5. Tips prácticos de nutrición para mantener un peso saludable

Responde en español, en formato JSON con esta estructura (responde SOLO con JSON válido):
{
  "currentWeight": "Peso actual en kg o 'No disponible'",
  "idealWeight": "Peso ideal estimado en kg o 'No calculable'",
  "weightRange": "Rango ideal (ej: '3-6 kg' o '25-35 kg')",
  "weightStatus": "normal|bajo|sobrepeso|no_evaluable",
  "weightAnalysis": "Análisis detallado del peso actual vs ideal",
  "dailyRecommendations": {
    "amount": "Cantidad específica recomendada (ej: '200-250 gramos diarios' o '2 tazas mediana')",
    "frequency": "Frecuencia específica (ej: '2 veces al día' o '3 comidas pequeñas')",
    "foodType": "Tipo de alimento recomendado (ej: 'Alimento seco premium para perros adultos' o 'Dieta húmeda para gatos')"
  },
  "nutritionTips": ["Tip práctico 1", "Tip práctico 2"],
  "specialConsiderations": ["Consideración especial si aplica"],
  "friendlyText": "Texto amigable explicando el análisis de peso y las recomendaciones nutricionales de forma clara y comprensible"
}`;
        break;

      case 'weight':
        const weightHistory = validMedicalRecords
          .filter(r => r && r.weightAtTime && r.date)
          .map(r => {
            try {
              const record = r.toObject ? r.toObject() : r;
              let date = 'Fecha no disponible';
              if (record.date) {
                try {
                  const dateObj = new Date(record.date);
                  if (!isNaN(dateObj.getTime())) {
                    date = dateObj.toLocaleDateString('es-CL');
                  }
                } catch (e) {
                  console.warn('Error formateando fecha del registro de peso:', e);
                }
              }
              return `- ${date}: ${record.weightAtTime} kg`;
            } catch (e) {
              console.warn('Error procesando registro de peso:', e);
              return null;
            }
          })
          .filter(Boolean)
          .join('\n') || 'No hay registros de peso previos';

        prompt = `Eres un asistente veterinario. Analiza el peso de la mascota y proporciona recomendaciones:

${petInfo}

Historial de Peso (de registros médicos):
${weightHistory}

Por favor, proporciona:
1. Evaluación del peso actual
2. Peso objetivo recomendado
3. Plan de acción para alcanzar el peso ideal (si aplica)
4. Recomendaciones de ejercicio y alimentación

Responde en español, en formato JSON.`;
        break;

      default:
        prompt = `Eres un asistente veterinario experto con amplia experiencia en medicina preventiva. Basándote en la siguiente información completa de la mascota, genera un plan de cuidado preventivo personalizado, específico y accionable:

${petInfo}

Historial de Vacunas:
${vaccinesInfo}

Historial de Desparasitaciones:
${dewormingsInfo}

Historial Médico:
${medicalHistoryInfo}

IMPORTANTE: Analiza críticamente la información disponible y proporciona recomendaciones específicas y útiles. Si falta información (como peso, edad exacta, o historial médico), indica claramente qué datos adicionales serían útiles.

Por favor, proporciona:
1. Un resumen conciso del estado de salud actual basado en la información disponible
2. Recomendaciones preventivas prioritarias específicas y accionables (máximo 5)
3. Calendario de cuidado preventivo mensual para los próximos 6 meses con tareas concretas
4. Recomendaciones específicas de nutrición basadas en especie, raza y edad (si hay suficiente información)
5. Recomendaciones de peso si el peso actual está disponible
6. Tips generales de cuidado apropiados para la especie y edad

Si el peso actual está dentro del rango normal, indícalo claramente. Si está fuera del rango ideal, proporciona recomendaciones específicas.

Responde en español, en formato JSON con esta estructura (responde SOLO con JSON válido, sin texto adicional antes o después):
{
  "healthSummary": "Resumen del estado de salud actual basado en la información disponible",
  "priorityRecommendations": ["Recomendación específica 1", "Recomendación específica 2"],
  "preventiveCalendar": [
    {
      "month": "Mes (ej: Enero 2024)",
      "tasks": ["Tarea concreta 1", "Tarea concreta 2"]
    }
  ],
  "nutritionRecommendations": "Recomendaciones específicas de nutrición basadas en especie, raza, edad y peso",
  "weightRecommendations": "Análisis del peso actual y recomendaciones si aplica",
  "generalTips": ["Tip específico 1", "Tip específico 2"],
  "friendlyText": "Texto amigable y claro que resume el estado de la mascota y las acciones más importantes que el tutor debe tomar"
}`;
    }

    console.log('Generando contenido con Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response) {
      console.error('Gemini API no retornó respuesta');
      return {
        success: false,
        message: 'La API de Gemini no retornó una respuesta válida'
      };
    }
    
    const text = response.text();
    console.log('Respuesta de Gemini recibida, longitud:', text.length);

    // Intentar parsear el JSON de la respuesta
    try {
      // Extraer JSON del texto (puede venir con markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      
      if (!jsonText || jsonText.trim().length === 0) {
        console.warn('No se encontró JSON en la respuesta de Gemini');
        return {
          success: true,
          data: {
            friendlyText: text || 'No se pudo generar recomendaciones específicas en este momento.',
            rawResponse: text
          },
          rawText: text
        };
      }
      
      const parsedResponse = JSON.parse(jsonText);
      console.log('JSON parseado correctamente');

      return {
        success: true,
        data: parsedResponse,
        rawText: text
      };
    } catch (parseError) {
      // Si no se puede parsear, retornar el texto raw
      console.warn('No se pudo parsear JSON de Gemini:', parseError.message);
      console.warn('Texto recibido (primeros 500 caracteres):', text.substring(0, 500));
      
      // Intentar construir una respuesta estructurada básica desde el texto
      return {
        success: true,
        data: {
          friendlyText: text || 'No se pudieron generar recomendaciones específicas en este momento. Por favor, intenta nuevamente.',
          rawResponse: text,
          parseError: process.env.NODE_ENV === 'development' ? parseError.message : undefined
        },
        rawText: text
      };
    }
  } catch (error) {
    console.error('Error al generar recomendaciones con Gemini:', error);
    console.error('Error tipo:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Manejar errores específicos de la API de Gemini
    if (error.message && error.message.includes('API key')) {
      return {
        success: false,
        message: 'La API key de Gemini no es válida. Verifica GEMINI_API_KEY en las variables de entorno.'
      };
    }
    
    // Manejar error de cuota (429) o límite alcanzado
    if (error.message && (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('429') || error.message.includes('Too Many Requests'))) {
      return {
        success: false,
        message: 'Se ha alcanzado el límite de cuota de la API de Gemini. Por favor, espera unos minutos e intenta nuevamente.',
        code: 'QUOTA_EXCEEDED'
      };
    }
    
    return {
      success: false,
      message: error.message || 'Error al generar recomendaciones con la IA',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * Genera un texto amigable para recordatorios usando Gemini
 */
export const generateFriendlyReminderText = async (reminderType, petName, details) => {
  if (!genAI) {
    return `Recordatorio: ${details.title || 'Tarea pendiente'} para ${petName}`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `Genera un mensaje amigable y cálido para un recordatorio de cuidado de mascota. 

Tipo: ${reminderType}
Mascota: ${petName}
Detalles: ${JSON.stringify(details)}

El mensaje debe ser:
- Amigable y positivo
- Claro sobre qué hacer
- Breve (máximo 2 oraciones)
- En español

Solo responde con el texto del recordatorio, sin JSON ni formato adicional.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error al generar texto de recordatorio:', error);
    return `Recordatorio: ${details.title || 'Tarea pendiente'} para ${petName}`;
  }
};

