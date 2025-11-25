import multer from 'multer';
import { analyzeBreed, analyzeHealth, fileToBase64 } from '../services/imageAnalysisService.js';

// Configurar multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

export const uploadMiddleware = upload.array('images', 3); // Máximo 3 imágenes

/**
 * Analiza solo la RAZA de una mascota desde una o múltiples imágenes
 * POST /api/image-analysis/breed
 * Acepta hasta 3 imágenes para mejor precisión
 */
export const analyzeBreedImage = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    if (files.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 3 imágenes permitidas'
      });
    }

    const { species, petId } = req.body;
    const context = {
      species: species || null,
      petId: petId || null
    };

    // Analizar todas las imágenes
    const analysisResults = [];
    for (const file of files) {
      const imageBase64 = fileToBase64(file);
      
      if (!imageBase64) {
        console.warn(`Error al procesar imagen ${file.originalname}`);
        continue;
      }

      const result = await analyzeBreed(
        null,
        imageBase64,
        file.mimetype,
        context
      );

      if (result.success) {
        analysisResults.push(result.data);
      } else {
        console.warn(`Error al analizar imagen ${file.originalname}:`, result.message);
      }
    }

    if (analysisResults.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo analizar ninguna imagen'
      });
    }

    // Combinar resultados de múltiples imágenes
    const combinedResult = combineBreedResults(analysisResults);

    res.json({
      success: true,
      data: combinedResult,
      message: `Análisis de raza completado exitosamente (${analysisResults.length} imagen${analysisResults.length > 1 ? 'es' : ''} analizada${analysisResults.length > 1 ? 's' : ''})`
    });
  } catch (error) {
    console.error('Error en analyzeBreedImage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar la imagen',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Combina resultados de múltiples análisis de raza
 */
function combineBreedResults(results) {
  if (results.length === 1) {
    return results[0];
  }

  // Agrupar por raza principal
  const breedCounts = {};
  const allCharacteristics = [];
  const allSecondaryBreeds = [];
  let totalConfidence = 0;
  let isMixedCount = 0;

  results.forEach(result => {
    if (result.primaryBreed) {
      const breedName = result.primaryBreed.name;
      if (!breedCounts[breedName]) {
        breedCounts[breedName] = {
          count: 0,
          totalConfidence: 0,
          characteristics: [],
          size: result.primaryBreed.size,
          sizeRange: result.primaryBreed.sizeRange
        };
      }
      breedCounts[breedName].count++;
      breedCounts[breedName].totalConfidence += result.primaryBreed.confidence || 0;
      if (result.primaryBreed.characteristics && Array.isArray(result.primaryBreed.characteristics)) {
        breedCounts[breedName].characteristics.push(...result.primaryBreed.characteristics);
      }
    }

    if (result.primaryBreed?.characteristics && Array.isArray(result.primaryBreed.characteristics)) {
      allCharacteristics.push(...result.primaryBreed.characteristics);
    }

    if (result.secondaryBreeds) {
      allSecondaryBreeds.push(...result.secondaryBreeds);
    }

    totalConfidence += result.primaryBreed?.confidence || 0;
    if (result.isMixed) isMixedCount++;
  });

  // Encontrar la raza más común
  let mostCommonBreed = null;
  let maxCount = 0;
  for (const [breedName, data] of Object.entries(breedCounts)) {
    if (data.count > maxCount) {
      maxCount = data.count;
      mostCommonBreed = {
        name: breedName,
        confidence: Math.round(data.totalConfidence / data.count),
        size: data.size,
        sizeRange: data.sizeRange,
        characteristics: [...new Set(data.characteristics)] // Eliminar duplicados
      };
    }
  }

  // Determinar si es mestizo basado en la mayoría
  const isMixed = isMixedCount > results.length / 2;

  // Calcular nivel de confianza promedio
  const avgConfidence = Math.round(totalConfidence / results.length);
  let confidenceLevel = 'Media';
  if (avgConfidence >= 80) confidenceLevel = 'Alta';
  else if (avgConfidence < 50) confidenceLevel = 'Baja';

  return {
    species: results[0]?.species || 'Desconocido',
    primaryBreed: mostCommonBreed || results[0]?.primaryBreed,
    secondaryBreeds: allSecondaryBreeds.length > 0 ? [...new Set(allSecondaryBreeds.map(b => b.name))].slice(0, 3).map(name => ({
      name,
      confidence: 30,
      reason: 'Identificado en múltiples análisis'
    })) : results[0]?.secondaryBreeds || [],
    isMixed,
    estimatedSize: mostCommonBreed?.size || results[0]?.estimatedSize,
    confidenceLevel,
    morphologicalNotes: results.map(r => r.morphologicalNotes).filter(Boolean).join(' '),
    notes: `Análisis combinado de ${results.length} imagen${results.length > 1 ? 'es' : ''}. ${results[0]?.notes || ''}`,
    preventiveCare: results.find(r => r.preventiveCare)?.preventiveCare || results[0]?.preventiveCare
  };
}

/**
 * Analiza solo PROBLEMAS DE SALUD visibles en una o múltiples imágenes de mascota
 * POST /api/image-analysis/health
 * Acepta hasta 3 imágenes para mejor precisión
 */
export const analyzeHealthImage = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    if (files.length > 3) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 3 imágenes permitidas'
      });
    }

    const { species, petId, context: userContext } = req.body;
    const context = {
      species: species || null,
      petId: petId || null,
      userContext: userContext || null
    };

    // Analizar todas las imágenes
    const analysisResults = [];
    for (const file of files) {
      const imageBase64 = fileToBase64(file);
      
      if (!imageBase64) {
        console.warn(`Error al procesar imagen ${file.originalname}`);
        continue;
      }

      const result = await analyzeHealth(
        null,
        imageBase64,
        file.mimetype,
        context
      );

      if (result.success) {
        analysisResults.push(result.data);
      } else {
        console.warn(`Error al analizar imagen ${file.originalname}:`, result.message);
      }
    }

    if (analysisResults.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo analizar ninguna imagen'
      });
    }

    // Combinar resultados de múltiples imágenes
    const combinedResult = combineHealthResults(analysisResults);

    res.json({
      success: true,
      data: combinedResult,
      message: `Análisis de salud completado exitosamente (${analysisResults.length} imagen${analysisResults.length > 1 ? 'es' : ''} analizada${analysisResults.length > 1 ? 's' : ''})`
    });
  } catch (error) {
    console.error('Error en analyzeHealthImage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar la imagen',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Combina resultados de múltiples análisis de salud
 */
function combineHealthResults(results) {
  if (results.length === 1) {
    return results[0];
  }

  // Combinar todos los issues de todas las imágenes
  const allIssues = [];
  const issueMap = new Map(); // Para agrupar issues similares

  results.forEach((result, imageIndex) => {
    if (result.issues && Array.isArray(result.issues)) {
      result.issues.forEach(issue => {
        const key = `${issue.type}-${issue.location}`;
        if (issueMap.has(key)) {
          // Si ya existe un issue similar, aumentar confianza y combinar información
          const existing = issueMap.get(key);
          existing.confidence = Math.min(100, Math.round((existing.confidence + issue.confidence) / 2) + 10);
          existing.description = `${existing.description} (también visible en imagen ${imageIndex + 2})`;
        } else {
          issueMap.set(key, {
            ...issue,
            description: `${issue.description} (imagen ${imageIndex + 1})`
          });
        }
      });
    }
  });

  allIssues.push(...Array.from(issueMap.values()));

  // Determinar estado general de salud
  const hasIssues = allIssues.length > 0;
  let overallHealth = 'bueno';
  let maxUrgency = 'bajo';
  
  if (hasIssues) {
    const urgencies = allIssues.map(i => i.urgency);
    if (urgencies.includes('urgente')) maxUrgency = 'urgente';
    else if (urgencies.includes('alto')) maxUrgency = 'alto';
    else if (urgencies.includes('medio')) maxUrgency = 'medio';

    if (maxUrgency === 'urgente' || maxUrgency === 'alto') {
      overallHealth = 'urgente';
    } else if (maxUrgency === 'medio') {
      overallHealth = 'atención_requerida';
    } else {
      overallHealth = 'revisar';
    }
  }

  // Combinar notas clínicas
  const allClinicalNotes = results.map(r => r.clinicalNotes).filter(Boolean).join('\n\n');
  const allNotes = results.map(r => r.notes).filter(Boolean).join(' ');
  const allLimitations = results.map(r => r.limitations).filter(Boolean).join(' ');

  // Determinar recomendación general
  const shouldSeeVet = allIssues.some(i => i.requiresImmediateAttention) || maxUrgency === 'urgente' || maxUrgency === 'alto';
  const recommendation = results.find(r => r.recommendation)?.recommendation || {
    shouldSeeVet,
    urgencyLevel: maxUrgency,
    recommendedAction: shouldSeeVet 
      ? 'Se recomienda consulta veterinaria basada en el análisis de múltiples imágenes'
      : 'Monitoreo y observación continua recomendada',
    timeframe: maxUrgency === 'urgente' ? 'Inmediatamente (<2 horas)' :
                maxUrgency === 'alto' ? 'Dentro de 24 horas' :
                maxUrgency === 'medio' ? 'Consulta programada en 2-7 días' :
                'Consulta programada',
    suggestedDiagnosticTests: [...new Set(results.flatMap(r => r.recommendation?.suggestedDiagnosticTests || []))]
  };

  return {
    hasIssues,
    issues: allIssues,
    overallHealth,
    notes: `Análisis combinado de ${results.length} imagen${results.length > 1 ? 'es' : ''}. ${allNotes}`,
    clinicalNotes: allClinicalNotes || results[0]?.clinicalNotes,
    limitations: allLimitations || results[0]?.limitations,
    recommendation
  };
}

