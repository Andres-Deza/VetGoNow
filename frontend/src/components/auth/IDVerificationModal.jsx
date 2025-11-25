import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import Tesseract from 'tesseract.js';

const VERIFICATION_STEPS = {
  FRONT_ID: {
    key: 'front',
    title: 'Captura la parte frontal de tu cédula',
    instruction: 'Coloca tu cédula dentro del marco. Asegúrate de que esté bien iluminada y se vea nítida.',
    icon: '📄'
  },
  BACK_ID: {
    key: 'back',
    title: 'Captura la parte posterior de tu cédula',
    instruction: 'Ahora voltea tu cédula y captura el reverso. Verifica que todos los datos sean legibles.',
    icon: '📄'
  },
  SELFIE: {
    key: 'selfie',
    title: 'Toma una selfie',
    instruction: 'Mira directamente a la cámara. Asegúrate de tener buena iluminación y que tu rostro esté completamente visible.',
    icon: '📷'
  },
  VERIFYING: {
    key: 'verifying',
    title: 'Verificando identidad...',
    instruction: 'Estamos comparando tu selfie con la foto de tu cédula.',
    icon: '🔍'
  }
};

const IDVerificationModal = ({ open, onClose, onComplete, nationalId }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(VERIFICATION_STEPS.FRONT_ID.key);
  const [captures, setCaptures] = useState({
    frontId: null,
    backId: null,
    selfie: null
  });
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [rutValidationStatus, setRutValidationStatus] = useState(null); // 'validating', 'valid', 'invalid', null
  const [backIdValidationStatus, setBackIdValidationStatus] = useState(null); // 'validating', 'valid', 'invalid', null

  // Cargar modelos de face-api.js
  useEffect(() => {
    if (!open) return;

    const loadModels = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Intentar cargar desde public/models primero, luego desde CDN como fallback
        const LOCAL_MODEL_URL = '/models';
        const CDN_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        
        let modelUrl = LOCAL_MODEL_URL;
        let useCDN = false;
        
        // Verificar si los modelos locales existen
        try {
          const testResponse = await fetch(`${LOCAL_MODEL_URL}/tiny_face_detector_model-weights_manifest.json`);
          if (!testResponse.ok || testResponse.headers.get('content-type')?.includes('text/html')) {
            // Si no están disponibles localmente, usar CDN
            modelUrl = CDN_MODEL_URL;
            useCDN = true;
          }
        } catch {
          // Si falla la verificación, usar CDN
          modelUrl = CDN_MODEL_URL;
          useCDN = true;
        }
        
        // Cargar modelos más precisos: SSD Mobilenet en lugar de TinyFaceDetector
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl), // Más preciso que TinyFaceDetector
          faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);
        
        setModelsLoaded(true);
        setLoading(false);
        
        if (useCDN) {
          console.warn('Modelos cargados desde CDN. Para mejor rendimiento, descarga los modelos localmente siguiendo las instrucciones en public/README-FACE-API-MODELS.md');
        }
      } catch (err) {
        console.error('Error cargando modelos:', err);
        setError('No se pudieron cargar los modelos de reconocimiento facial. Por favor, verifica tu conexión a internet o descarga los modelos localmente siguiendo las instrucciones en public/README-FACE-API-MODELS.md');
        setLoading(false);
        setModelsLoaded(false);
      }
    };

    loadModels();
  }, [open]);

  // Inicializar cámara cuando el usuario da permiso
  const startCamera = async () => {
    try {
      setError('');
      setLoading(true);
      
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentStep === VERIFICATION_STEPS.SELFIE.key ? 'user' : { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 }, // Mayor resolución para mejor detección
          height: { ideal: 1080, min: 720 },
          focusMode: 'continuous' // Auto-enfoque continuo
        },
        audio: false
      });
      
      setStream(s);
      setCameraReady(true);
      setLoading(false);
      
      if (webcamRef.current) {
        webcamRef.current.srcObject = s;
      }
    } catch (e) {
      setError('No fue posible acceder a tu cámara. Por favor, permite el acceso a la cámara en la configuración de tu navegador.');
      console.error('Error accediendo a la cámara:', e);
      setLoading(false);
      setCameraReady(false);
    }
  };

  // Reiniciar cámara cuando cambia el paso (solo si ya se dio permiso)
  useEffect(() => {
    if (!cameraReady || !stream || currentStep === VERIFICATION_STEPS.VERIFYING.key) return;

    const restartCamera = async () => {
      // Detener stream actual
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: currentStep === VERIFICATION_STEPS.SELFIE.key ? 'user' : { ideal: 'environment' },
            width: { ideal: 1920, min: 1280 }, // Mayor resolución
            height: { ideal: 1080, min: 720 },
            focusMode: 'continuous'
          },
          audio: false
        });
        setStream(s);
        if (webcamRef.current) {
          webcamRef.current.srcObject = s;
        }
      } catch (e) {
        setError('Error al cambiar de cámara. Por favor, intenta nuevamente.');
        console.error('Error reiniciando cámara:', e);
        setCameraReady(false);
      }
    };

    restartCamera();
  }, [currentStep, cameraReady]);

  // Limpiar stream al cerrar o desmontar
  useEffect(() => {
    if (!open) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraReady(false);
      setStream(null);
      setCurrentStep(VERIFICATION_STEPS.FRONT_ID.key);
      setCaptures({ frontId: null, backId: null, selfie: null });
      setError('');
      setVerificationResult(null);
      setRutValidationStatus(null);
    }
  }, [open]);

  const capturePhoto = () => {
    if (!webcamRef.current) return;

    // Capturar con mayor resolución y calidad para mejor detección
    const imageSrc = webcamRef.current.getScreenshot({
      width: 1920, // Mayor resolución para mejor detección
      height: 1080,
      screenshotFormat: 'image/jpeg',
      screenshotQuality: 0.95 // Mayor calidad
    });

    return imageSrc;
  };

  // Función para normalizar RUT (remover puntos y guiones, convertir a mayúscula)
  const normalizeRut = (rut) => {
    if (!rut) return '';
    return rut.toString().toUpperCase().replace(/[^0-9K]/g, '');
  };

  // Función para extraer RUT del texto OCR
  const extractRutFromText = (text) => {
    // Patrones comunes de RUT en cédulas chilenas:
    // - XX.XXX.XXX-X
    // - XXXXXXXX-X
    // - XXXXXXXX-X (sin puntos)
    const rutPatterns = [
      /(\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9K])/gi, // Formato con o sin puntos
      /(\d{7,8}[-]?[0-9K])/gi, // Formato sin puntos
    ];

    for (const pattern of rutPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        // Tomar el primer match y normalizarlo
        return normalizeRut(matches[0]);
      }
    }
    return null;
  };

  // Función para verificar medidas de seguridad básicas de la cédula chilena
  const verifySecurityFeatures = async (imageBase64) => {
    const results = {
      passed: 0,
      total: 0,
      details: []
    };

    try {
      // Crear imagen para análisis
      const img = new Image();
      img.src = imageBase64;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Crear canvas para análisis de píxeles
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // 1. Verificar formato y proporciones (Nivel 1)
      results.total++;
      const aspectRatio = canvas.width / canvas.height;
      // Cédula chilena tiene proporción aproximada de 1.6:1 (85.6mm x 53.98mm)
      const expectedRatio = 1.585;
      const ratioTolerance = 0.2;
      if (Math.abs(aspectRatio - expectedRatio) < ratioTolerance) {
        results.passed++;
        results.details.push({ check: 'Formato y proporciones', status: 'pass' });
      } else {
        results.details.push({ check: 'Formato y proporciones', status: 'warning', message: 'Las proporciones no coinciden exactamente' });
      }

      // 2. Verificar presencia de texto legible (Nivel 1)
      results.total++;
      const { data: { text } } = await Tesseract.recognize(imageBase64, 'spa');
      if (text && text.length > 20) {
        results.passed++;
        results.details.push({ check: 'Texto legible', status: 'pass' });
      } else {
        results.details.push({ check: 'Texto legible', status: 'fail', message: 'No se detectó suficiente texto' });
      }

      // 3. Verificar presencia de RUT (Nivel 1)
      results.total++;
      const extractedRut = extractRutFromText(text);
      if (extractedRut) {
        results.passed++;
        results.details.push({ check: 'RUT presente', status: 'pass' });
      } else {
        results.details.push({ check: 'RUT presente', status: 'fail', message: 'No se pudo leer el RUT' });
      }

      // 4. Verificar presencia de foto (detección de rostro) (Nivel 1)
      results.total++;
      const frontIdImg = await faceapi.fetchImage(imageBase64);
      // Usar SSD Mobilenet con opciones más permisivas para mejor detección
      const faceDetection = await faceapi
        .detectSingleFace(frontIdImg, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.3, // Threshold más bajo para detectar mejor
          maxResults: 1 
        }))
        .withFaceLandmarks();
      if (faceDetection) {
        results.passed++;
        results.details.push({ check: 'Foto presente', status: 'pass' });
      } else {
        results.details.push({ check: 'Foto presente', status: 'fail', message: 'No se detectó un rostro' });
      }

      // 5. Verificar elementos de color (detección de variación de color) (Nivel 1)
      results.total++;
      let colorVariation = 0;
      const sampleSize = 1000;
      const colorSamples = [];
      for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        const idx = (y * canvas.width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        colorSamples.push({ r, g, b });
      }
      
      // Calcular variación de color
      let totalVariation = 0;
      for (let i = 0; i < colorSamples.length - 1; i++) {
        const diff = Math.abs(colorSamples[i].r - colorSamples[i + 1].r) +
                     Math.abs(colorSamples[i].g - colorSamples[i + 1].g) +
                     Math.abs(colorSamples[i].b - colorSamples[i + 1].b);
        totalVariation += diff;
      }
      const avgVariation = totalVariation / (colorSamples.length - 1);
      
      // Cédulas reales tienen variación de color significativa
      if (avgVariation > 30) {
        results.passed++;
        results.details.push({ check: 'Variación de color', status: 'pass' });
      } else {
        results.details.push({ check: 'Variación de color', status: 'warning', message: 'Poca variación de color detectada' });
      }

      // 6. Verificar presencia de códigos de barras/QR (Nivel 1)
      results.total++;
      // Buscar patrones de barras (líneas verticales repetidas)
      let barcodePatterns = 0;
      for (let y = 0; y < canvas.height; y += 10) {
        let consecutiveLines = 0;
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          if (brightness < 128) {
            consecutiveLines++;
          } else {
            if (consecutiveLines > 2 && consecutiveLines < 20) {
              barcodePatterns++;
            }
            consecutiveLines = 0;
          }
        }
      }
      if (barcodePatterns > 5) {
        results.passed++;
        results.details.push({ check: 'Códigos de barras', status: 'pass' });
      } else {
        results.details.push({ check: 'Códigos de barras', status: 'warning', message: 'No se detectaron códigos de barras claros' });
      }

      // 7. Verificar resolución y nitidez (Nivel 1)
      results.total++;
      if (canvas.width >= 800 && canvas.height >= 500) {
        results.passed++;
        results.details.push({ check: 'Resolución adecuada', status: 'pass' });
      } else {
        results.details.push({ check: 'Resolución adecuada', status: 'warning', message: 'Resolución baja, puede afectar otras verificaciones' });
      }

      // 8. Verificar microtexto (parcial, Nivel 2)
      results.total++;
      // Buscar texto muy pequeño (menos de 10 píxeles de altura)
      const smallTextPattern = /[A-Z0-9]{5,}/g;
      const smallTextMatches = text.match(smallTextPattern);
      if (smallTextMatches && smallTextMatches.length > 3) {
        results.passed++;
        results.details.push({ check: 'Microtexto', status: 'pass' });
      } else {
        results.details.push({ check: 'Microtexto', status: 'warning', message: 'Microtexto no detectado claramente' });
      }

      return results;
    } catch (err) {
      console.error('Error en verificación de seguridad:', err);
      return results;
    }
  };

  // Función para validar la parte trasera de la cédula
  const validateBackId = async (imageBase64) => {
    try {
      setError('');

      // 1. Verificar medidas de seguridad básicas
      const securityResults = await verifySecurityFeatures(imageBase64);
      console.log('Verificación de seguridad (reverso):', securityResults);

      // 2. Usar OCR para extraer texto
      const { data: { text } } = await Tesseract.recognize(imageBase64, 'spa');

      // 3. Verificar elementos específicos del reverso de cédula chilena
      const validations = {
        isValid: true,
        error: null,
        details: []
      };

      // Verificar presencia de texto (debe haber información en el reverso)
      if (!text || text.length < 10) {
        validations.isValid = false;
        validations.error = 'No se pudo leer información del reverso de la cédula. Asegúrate de que esté bien iluminada y nítida.';
        validations.details.push({ check: 'Texto legible en reverso', status: 'fail' });
        return validations;
      }
      validations.details.push({ check: 'Texto legible en reverso', status: 'pass' });

      // Verificar palabras clave comunes en el reverso de cédula chilena
      const backIdKeywords = [
        'REPUBLICA', 'CHILE', 'IDENTIDAD', 'NACIONALIDAD', 'FECHA',
        'NACIMIENTO', 'SEXO', 'ESTADO', 'CIVIL', 'DOMICILIO',
        'COMUNA', 'REGION', 'FOLIO', 'SERIE'
      ];
      
      const textUpper = text.toUpperCase();
      const foundKeywords = backIdKeywords.filter(keyword => textUpper.includes(keyword));
      
      if (foundKeywords.length < 2) {
        validations.details.push({ 
          check: 'Elementos de cédula chilena', 
          status: 'warning', 
          message: `Solo se encontraron ${foundKeywords.length} elementos esperados` 
        });
      } else {
        validations.details.push({ 
          check: 'Elementos de cédula chilena', 
          status: 'pass',
          message: `Encontrados: ${foundKeywords.join(', ')}`
        });
      }

      // Verificar formato y proporciones (igual que el frente)
      const img = new Image();
      img.src = imageBase64;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const aspectRatio = canvas.width / canvas.height;
      const expectedRatio = 1.585;
      const ratioTolerance = 0.2;
      
      if (Math.abs(aspectRatio - expectedRatio) < ratioTolerance) {
        validations.details.push({ check: 'Formato del reverso', status: 'pass' });
      } else {
        validations.details.push({ check: 'Formato del reverso', status: 'warning', message: 'Las proporciones no coinciden exactamente' });
      }

      // Verificar variación de color (debe tener elementos impresos)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const sampleSize = 500;
      const colorSamples = [];
      
      for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        const idx = (y * canvas.width + x) * 4;
        colorSamples.push({ 
          r: pixels[idx], 
          g: pixels[idx + 1], 
          b: pixels[idx + 2] 
        });
      }
      
      let totalVariation = 0;
      for (let i = 0; i < colorSamples.length - 1; i++) {
        const diff = Math.abs(colorSamples[i].r - colorSamples[i + 1].r) +
                     Math.abs(colorSamples[i].g - colorSamples[i + 1].g) +
                     Math.abs(colorSamples[i].b - colorSamples[i + 1].b);
        totalVariation += diff;
      }
      const avgVariation = totalVariation / (colorSamples.length - 1);
      
      if (avgVariation > 25) {
        validations.details.push({ check: 'Variación de color (reverso)', status: 'pass' });
      } else {
        validations.details.push({ check: 'Variación de color (reverso)', status: 'warning', message: 'Poca variación de color' });
      }

      console.log('Validación reverso completada:', validations);
      return validations;
    } catch (err) {
      console.error('Error validando reverso:', err);
      return {
        isValid: false,
        error: 'Error al validar el reverso de la cédula. Por favor, intenta nuevamente.',
        details: []
      };
    }
  };

  // Función para validar RUT en la cédula usando OCR
  const validateRutInId = async (imageBase64) => {
    try {
      setRutValidationStatus('validating');
      setError('');

      // Verificar medidas de seguridad básicas
      const securityResults = await verifySecurityFeatures(imageBase64);
      console.log('Verificación de seguridad:', securityResults);

      // Usar Tesseract.js para extraer texto de la imagen
      const { data: { text } } = await Tesseract.recognize(imageBase64, 'spa', {
        logger: (m) => {
          // Opcional: mostrar progreso
          if (m.status === 'recognizing text') {
            // console.log(`Progreso OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // Extraer RUT del texto
      const extractedRut = extractRutFromText(text);
      
      if (!extractedRut) {
        setRutValidationStatus('invalid');
        setError('No se pudo leer el RUT de la cédula. Asegúrate de que la cédula esté bien iluminada y nítida.');
        return false;
      }

      // Normalizar el RUT ingresado
      const normalizedInputRut = normalizeRut(nationalId);

      // Comparar RUTs (permitir pequeñas variaciones por errores de OCR)
      if (extractedRut === normalizedInputRut) {
        setRutValidationStatus('valid');
        return true;
      } else {
        // Intentar comparación más flexible (últimos 8-9 dígitos)
        const extractedLastDigits = extractedRut.slice(-9);
        const inputLastDigits = normalizedInputRut.slice(-9);
        
        if (extractedLastDigits === inputLastDigits) {
          setRutValidationStatus('valid');
          return true;
        } else {
          setRutValidationStatus('invalid');
          setError(`El RUT de la cédula (${extractedRut.slice(0, -1)}-${extractedRut.slice(-1)}) no coincide con el RUT ingresado (${normalizedInputRut.slice(0, -1)}-${normalizedInputRut.slice(-1)}). Por favor, verifica que estés usando la cédula correcta.`);
          return false;
        }
      }
    } catch (err) {
      console.error('Error en validación OCR:', err);
      setRutValidationStatus('invalid');
      setError('Error al leer la cédula. Por favor, intenta nuevamente con mejor iluminación.');
      return false;
    }
  };

  const handleCapture = async () => {
    const photo = capturePhoto();
    if (!photo) return;

    if (currentStep === VERIFICATION_STEPS.FRONT_ID.key) {
      // Validar RUT antes de continuar
      setLoading(true);
      const isValid = await validateRutInId(photo);
      setLoading(false);
      
      if (!isValid) {
        // No avanzar si el RUT no es válido
        return;
      }

      setCaptures(prev => ({ ...prev, frontId: photo }));
      setCurrentStep(VERIFICATION_STEPS.BACK_ID.key);
    } else if (currentStep === VERIFICATION_STEPS.BACK_ID.key) {
      // Validar parte trasera de la cédula
      setBackIdValidationStatus('validating');
      setLoading(true);
      setError('');
      
      const backValidation = await validateBackId(photo);
      setLoading(false);
      
      if (!backValidation.isValid) {
        setBackIdValidationStatus('invalid');
        setError(backValidation.error || 'La parte trasera de la cédula no pasó la validación. Por favor, intenta nuevamente.');
        return;
      }

      setBackIdValidationStatus('valid');
      setCaptures(prev => ({ ...prev, backId: photo }));
      // Pequeño delay para mostrar el estado de validación
      setTimeout(() => {
        setCurrentStep(VERIFICATION_STEPS.SELFIE.key);
        setBackIdValidationStatus(null);
      }, 1000);
    } else if (currentStep === VERIFICATION_STEPS.SELFIE.key) {
      setCaptures(prev => ({ ...prev, selfie: photo }));
      setCurrentStep(VERIFICATION_STEPS.VERIFYING.key);
      await verifyIdentity(photo);
    }
  };

  const verifyIdentity = async (selfieBlob) => {
    try {
      setLoading(true);
      setError('');

      // Convertir base64 a imágenes
      const frontIdImg = await faceapi.fetchImage(captures.frontId);
      const selfieImg = await faceapi.fetchImage(selfieBlob);

      // Detectar y obtener descriptores faciales con modelo más preciso
      // Usar SSD Mobilenet con opciones optimizadas para mejor detección
      const frontIdDetection = await faceapi
        .detectSingleFace(frontIdImg, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.3, // Threshold más bajo para mejor detección
          maxResults: 1 
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const selfieDetection = await faceapi
        .detectSingleFace(selfieImg, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.3,
          maxResults: 1 
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!frontIdDetection || !selfieDetection) {
        setError('No se pudo detectar un rostro en una o ambas imágenes. Por favor, intenta nuevamente con mejor iluminación.');
        setCurrentStep(VERIFICATION_STEPS.SELFIE.key);
        setLoading(false);
        return;
      }

      // Calcular distancia entre descriptores (menor = más similar)
      const distance = faceapi.euclideanDistance(
        frontIdDetection.descriptor,
        selfieDetection.descriptor
      );

      // Umbral de similitud (ajustable: 0.4-0.6 es típico)
      // 0.4 = 60% de similitud (recomendado para verificación de identidad)
      // 0.35 = 65% de similitud (mayor seguridad)
      // 0.3 = 70% de similitud (máxima seguridad, puede ser muy restrictivo)
      const THRESHOLD = 0.4; // 60% de similitud mínima requerida
      const isMatch = distance < THRESHOLD;
      const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));

      setVerificationResult({
        isMatch,
        similarity: similarity.toFixed(1),
        distance: distance.toFixed(3)
      });

      if (isMatch) {
        // Éxito: pasar todas las capturas al componente padre
        onComplete({
          frontId: captures.frontId,
          backId: captures.backId,
          selfie: selfieBlob,
          verificationData: {
            isMatch,
            similarity,
            distance
          }
        });
      } else {
        setError(`La verificación facial no fue exitosa (similitud: ${similarity}%). Por favor, intenta nuevamente.`);
        setCurrentStep(VERIFICATION_STEPS.SELFIE.key);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error en verificación:', err);
      setError('Error al verificar la identidad. Por favor, intenta nuevamente.');
      setCurrentStep(VERIFICATION_STEPS.SELFIE.key);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (currentStep === VERIFICATION_STEPS.FRONT_ID.key) {
      setCaptures(prev => ({ ...prev, frontId: null }));
      setRutValidationStatus(null);
    } else if (currentStep === VERIFICATION_STEPS.BACK_ID.key) {
      setCaptures(prev => ({ ...prev, backId: null }));
      setBackIdValidationStatus(null);
    } else if (currentStep === VERIFICATION_STEPS.SELFIE.key) {
      setCaptures(prev => ({ ...prev, selfie: null }));
    }
    setError('');
    setVerificationResult(null);
  };

  const handleBack = () => {
    if (currentStep === VERIFICATION_STEPS.BACK_ID.key) {
      setCurrentStep(VERIFICATION_STEPS.FRONT_ID.key);
      setCaptures(prev => ({ ...prev, backId: null }));
    } else if (currentStep === VERIFICATION_STEPS.SELFIE.key) {
      setCurrentStep(VERIFICATION_STEPS.BACK_ID.key);
      setCaptures(prev => ({ ...prev, selfie: null }));
    }
    setError('');
    setVerificationResult(null);
  };

  if (!open) return null;

  const currentStepInfo = Object.values(VERIFICATION_STEPS).find(s => s.key === currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span>{currentStepInfo?.icon}</span>
                {currentStepInfo?.title}
              </h2>
              <p className="text-violet-100 mt-1 text-sm">{currentStepInfo?.instruction}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {Object.values(VERIFICATION_STEPS).slice(0, 3).map((step, index) => {
              const isActive = currentStep === step.key;
              const isCompleted = 
                (step.key === VERIFICATION_STEPS.FRONT_ID.key && captures.frontId) ||
                (step.key === VERIFICATION_STEPS.BACK_ID.key && captures.backId) ||
                (step.key === VERIFICATION_STEPS.SELFIE.key && captures.selfie);
              
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        isActive
                          ? 'bg-violet-600 text-white scale-110'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted && !isActive ? '✓' : index + 1}
                    </div>
                    <p className={`text-xs mt-2 text-center ${isActive ? 'font-semibold text-violet-600' : 'text-gray-500'}`}>
                      {step.key === 'front' ? 'Frente' : step.key === 'back' ? 'Reverso' : 'Selfie'}
                    </p>
                  </div>
                  {index < 2 && (
                    <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && currentStep === VERIFICATION_STEPS.VERIFYING.key ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-600 mb-4"></div>
              <p className="text-gray-600">Verificando identidad...</p>
            </div>
          ) : (
            <>
              {/* Camera View */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                {!modelsLoaded ? (
                  <div className="flex flex-col items-center justify-center h-full text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                    <p>Cargando modelos de reconocimiento facial...</p>
                  </div>
                ) : !cameraReady ? (
                  <div className="flex flex-col items-center justify-center h-full text-white p-6">
                    <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-center mb-4">Necesitamos acceso a tu cámara para continuar con la verificación</p>
                    <button
                      onClick={startCamera}
                      disabled={loading}
                      className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Solicitando permisos...' : 'Permitir acceso a la cámara'}
                    </button>
                  </div>
                ) : stream ? (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: currentStep === VERIFICATION_STEPS.SELFIE.key ? 'user' : { ideal: 'environment' },
                        width: { ideal: 1920, min: 1280 },
                        height: { ideal: 1080, min: 720 },
                        focusMode: 'continuous'
                      }}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay frame para guiar al usuario */}
                    {(currentStep === VERIFICATION_STEPS.FRONT_ID.key || currentStep === VERIFICATION_STEPS.BACK_ID.key) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-4 border-yellow-400 rounded-lg" style={{ width: '80%', aspectRatio: '1.6/1' }}>
                          <div className="absolute top-2 left-2 text-yellow-400 text-xs font-bold">
                            Coloca tu cédula aquí
                          </div>
                        </div>
                      </div>
                    )}
                    {currentStep === VERIFICATION_STEPS.SELFIE.key && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-4 border-blue-400 rounded-full" style={{ width: '60%', aspectRatio: '1/1' }}>
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-blue-400 text-xs font-bold whitespace-nowrap">
                            Coloca tu rostro aquí
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-white">
                    Inicializando cámara...
                  </div>
                )}
              </div>

              {/* RUT Validation Status (Frente) */}
              {currentStep === VERIFICATION_STEPS.FRONT_ID.key && rutValidationStatus === 'validating' && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-blue-800 text-sm">Validando cédula frontal: leyendo RUT y verificando medidas de seguridad...</p>
                  </div>
                </div>
              )}
              {currentStep === VERIFICATION_STEPS.FRONT_ID.key && rutValidationStatus === 'valid' && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Cédula frontal validada: RUT correcto y medidas de seguridad verificadas
                  </p>
                </div>
              )}

              {/* Back ID Validation Status (Reverso) */}
              {currentStep === VERIFICATION_STEPS.BACK_ID.key && backIdValidationStatus === 'validating' && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-blue-800 text-sm">Validando reverso de la cédula: verificando elementos y medidas de seguridad...</p>
                  </div>
                </div>
              )}
              {currentStep === VERIFICATION_STEPS.BACK_ID.key && backIdValidationStatus === 'valid' && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Reverso de la cédula validado correctamente
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Verification Result */}
              {verificationResult && (
                <div className={`mb-4 p-4 rounded-lg ${
                  verificationResult.isMatch 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-semibold ${
                    verificationResult.isMatch ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {verificationResult.isMatch 
                      ? `✓ Verificación exitosa (${verificationResult.similarity}% de similitud)`
                      : `✗ Verificación fallida (${verificationResult.similarity}% de similitud)`
                    }
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {currentStep !== VERIFICATION_STEPS.FRONT_ID.key && currentStep !== VERIFICATION_STEPS.VERIFYING.key && (
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    ← Atrás
                  </button>
                )}
                {currentStep !== VERIFICATION_STEPS.VERIFYING.key && cameraReady && (
                  <button
                    onClick={handleCapture}
                    disabled={!stream || !modelsLoaded || loading}
                    className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentStep === VERIFICATION_STEPS.SELFIE.key ? 'Verificar identidad' : 'Capturar'}
                  </button>
                )}
                {error && currentStep !== VERIFICATION_STEPS.VERIFYING.key && (
                  <button
                    onClick={handleRetry}
                    className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IDVerificationModal;

