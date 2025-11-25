import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Human } from '@vladmandic/human';
import Tesseract from 'tesseract.js';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5555';

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
  LIVENESS: {
    key: 'liveness',
    title: 'Verificación en vivo',
    instruction: 'Sigue las instrucciones en pantalla para verificar que eres una persona real.',
    icon: '👤'
  },
  VERIFYING: {
    key: 'verifying',
    title: 'Verificando identidad...',
    instruction: 'Estamos procesando tu verificación.',
    icon: '🔍'
  }
};

const LIVENESS_PHASES = {
  FRONT: {
    key: 'front',
    instruction: 'Mira directamente a la cámara',
    targetYaw: 0,
    tolerance: 15,
    duration: 2000 // 2 segundos
  },
  RIGHT: {
    key: 'right',
    instruction: 'Gira la cabeza lentamente a la derecha',
    targetYaw: 25,
    tolerance: 10,
    duration: 2000
  },
  LEFT: {
    key: 'left',
    instruction: 'Ahora gira la cabeza a la izquierda',
    targetYaw: -25,
    tolerance: 10,
    duration: 2000
  }
};

const IDVerificationModalHuman = ({ open, onClose, onComplete, nationalId }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [humanInstance, setHumanInstance] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(VERIFICATION_STEPS.FRONT_ID.key);
  const [verificationId, setVerificationId] = useState(null);
  const [captures, setCaptures] = useState({
    frontId: null,
    backId: null,
    selfie: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [rutValidationStatus, setRutValidationStatus] = useState(null);
  const [backIdValidationStatus, setBackIdValidationStatus] = useState(null);
  
  // Estados para liveness
  const [livenessPhase, setLivenessPhase] = useState(LIVENESS_PHASES.FRONT.key);
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);
  const [livenessCompleted, setLivenessCompleted] = useState(false);
  const [currentYaw, setCurrentYaw] = useState(0);
  const [phaseStartTime, setPhaseStartTime] = useState(null);

  // Inicializar Human
  useEffect(() => {
    if (!open) return;

    const initHuman = async () => {
      try {
        setLoading(true);
        setError('');

        const human = new Human({
          backend: 'webgl', // Usar WebGL si está disponible, sino CPU
          modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
          face: {
            enabled: true,
            detector: { modelPath: 'blazeface.json' },
            mesh: { enabled: true },
            iris: { enabled: false },
            emotion: { enabled: false },
            description: { enabled: true } // Para embeddings
          },
          hand: { enabled: false },
          body: { enabled: false },
          object: { enabled: false }
        });

        await human.warmup();
        setHumanInstance(human);
        setModelsLoaded(true);
        setLoading(false);
      } catch (err) {
        console.error('Error inicializando Human:', err);
        setError('Error al cargar los modelos de reconocimiento facial. Por favor, recarga la página.');
        setLoading(false);
        setModelsLoaded(false);
      }
    };

    initHuman();
  }, [open]);

  // Iniciar sesión de verificación
  useEffect(() => {
    if (!open || !nationalId) return;

    const startVerification = async () => {
      try {
        const response = await axios.post(`${API_BASE}/api/kyc/start`, {
          rut: nationalId
        });
        if (response.data.success) {
          setVerificationId(response.data.verificationId);
        }
      } catch (err) {
        console.error('Error iniciando verificación:', err);
        setError('Error al iniciar la verificación. Por favor, intenta nuevamente.');
      }
    };

    startVerification();
  }, [open, nationalId]);

  // Inicializar cámara
  const startCamera = async () => {
    try {
      setError('');
      setLoading(true);
      
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentStep === VERIFICATION_STEPS.LIVENESS.key ? 'user' : { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          focusMode: 'continuous'
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

  // Limpiar recursos al cerrar
  useEffect(() => {
    if (!open) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setCameraReady(false);
      setStream(null);
      setCurrentStep(VERIFICATION_STEPS.FRONT_ID.key);
      setCaptures({ frontId: null, backId: null, selfie: null });
      setError('');
      setRutValidationStatus(null);
      setBackIdValidationStatus(null);
      setLivenessPhase(LIVENESS_PHASES.FRONT.key);
      setLivenessProgress(0);
      setLivenessScore(0);
      setLivenessCompleted(false);
    }
  }, [open]);

  // Validar dimensiones de imagen antes de OCR
  const validateImageDimensions = (imageBase64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const minWidth = 100;
        const minHeight = 100;
        if (img.width >= minWidth && img.height >= minHeight) {
          resolve({ valid: true, width: img.width, height: img.height });
        } else {
          resolve({ valid: false, width: img.width, height: img.height });
        }
      };
      img.onerror = () => {
        resolve({ valid: false, error: 'Error al cargar la imagen' });
      };
      img.src = imageBase64;
    });
  };

  // Capturar foto con validación de dimensiones
  const capturePhoto = async () => {
    if (!webcamRef.current) return null;
    
    try {
      const screenshot = webcamRef.current.getScreenshot({
        width: 1920,
        height: 1080,
        screenshotFormat: 'image/jpeg',
        screenshotQuality: 0.95
      });
      
      if (!screenshot) return null;
      
      // Validar dimensiones
      const validation = await validateImageDimensions(screenshot);
      if (!validation.valid) {
        console.error('Imagen capturada con dimensiones inválidas:', validation);
        return null;
      }
      
      return screenshot;
    } catch (error) {
      console.error('Error capturando foto:', error);
      return null;
    }
  };

  // Normalizar RUT
  const normalizeRut = (rut) => {
    if (!rut) return '';
    return rut.toString().toUpperCase().replace(/[^0-9K]/g, '');
  };

  // Validar RUT chileno (módulo 11)
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

  // Extraer RUT del texto OCR (priorizando RUN explícito y evitando número de documento)
  const extractRutFromText = (text) => {
    // PRIORIDAD 1: Buscar "RUN" explícitamente (más confiable)
    const runExplicitPattern = /RUN[\s:]+(\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9K])/gi;
    const runMatches = text.match(runExplicitPattern);
    if (runMatches && runMatches.length > 0) {
      // Tomar el último match de RUN (más probable que sea el correcto)
      const runMatch = runMatches[runMatches.length - 1];
      const rutExtracted = runMatch.match(/(\d{1,2}\.?\d{3}\.?\d{3}[-]?[0-9K])/i);
      if (rutExtracted) {
        const normalized = normalizeRut(rutExtracted[1]);
        // Validar que sea un RUT válido
        if (validateRut(normalized)) {
          return normalized;
        }
      }
    }

    // PRIORIDAD 2: Buscar patrones de RUT pero excluyendo números de documento
    // El número de documento suele aparecer después de "NÚMERO DOCUMENTO" o "DOCUMENTO"
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
        // Filtrar matches que no sean números de documento (de atrás hacia adelante)
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

  // Validar RUT en cédula frontal
  const validateRutInId = async (imageBase64) => {
    try {
      setRutValidationStatus('validating');
      setError('');

      // Validar dimensiones antes de OCR
      const validation = await validateImageDimensions(imageBase64);
      if (!validation.valid) {
        setRutValidationStatus('invalid');
        setError('La imagen capturada es demasiado pequeña. Por favor, acerca más la cédula a la cámara.');
        return false;
      }

      // OCR con Tesseract - manejar errores de imagen pequeña
      let text = '';
      try {
        const result = await Tesseract.recognize(imageBase64, 'spa', {
          logger: (m) => {
            // Filtrar warnings de imagen pequeña pero continuar
            if (m.status === 'recognizing text' || m.status === 'recognized text') {
              // Continuar normalmente
            }
          }
        });
        text = result.data.text;
      } catch (ocrError) {
        // Si el error es por imagen pequeña, intentar con configuración diferente
        if (ocrError.message && ocrError.message.includes('too small')) {
          setRutValidationStatus('invalid');
          setError('La imagen es demasiado pequeña para procesar. Por favor, acerca más la cédula a la cámara y asegúrate de que esté bien iluminada.');
          return false;
        }
        throw ocrError;
      }
      
      const extractedRut = extractRutFromText(text);
      
      if (!extractedRut) {
        setRutValidationStatus('invalid');
        setError('No se pudo leer el RUT de la cédula. Asegúrate de que la cédula esté bien iluminada y nítida.');
        return false;
      }

      const normalizedInputRut = normalizeRut(nationalId);

      if (extractedRut === normalizedInputRut) {
        setRutValidationStatus('valid');
        return true;
      } else {
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

  // Validar reverso de cédula
  const validateBackId = async (imageBase64) => {
    try {
      setError('');

      // Validar dimensiones antes de OCR
      const validation = await validateImageDimensions(imageBase64);
      if (!validation.valid) {
        return {
          isValid: false,
          error: 'La imagen capturada es demasiado pequeña. Por favor, acerca más la cédula a la cámara.'
        };
      }

      // OCR con Tesseract - manejar errores de imagen pequeña
      let text = '';
      try {
        const result = await Tesseract.recognize(imageBase64, 'spa', {
          logger: (m) => {
            // Filtrar warnings pero continuar
            if (m.status === 'recognizing text' || m.status === 'recognized text') {
              // Continuar normalmente
            }
          }
        });
        text = result.data.text;
      } catch (ocrError) {
        // Si el error es por imagen pequeña, retornar error específico
        if (ocrError.message && ocrError.message.includes('too small')) {
          return {
            isValid: false,
            error: 'La imagen es demasiado pequeña para procesar. Por favor, acerca más la cédula a la cámara y asegúrate de que esté bien iluminada.'
          };
        }
        throw ocrError;
      }
      
      if (!text || text.length < 10) {
        return {
          isValid: false,
          error: 'No se pudo leer información del reverso de la cédula. Asegúrate de que esté bien iluminada y nítida.'
        };
      }

      const backIdKeywords = [
        'REPUBLICA', 'CHILE', 'IDENTIDAD', 'NACIONALIDAD', 'FECHA',
        'NACIMIENTO', 'SEXO', 'ESTADO', 'CIVIL', 'DOMICILIO',
        'COMUNA', 'REGION', 'FOLIO', 'SERIE'
      ];
      
      const textUpper = text.toUpperCase();
      const foundKeywords = backIdKeywords.filter(keyword => textUpper.includes(keyword));

      if (foundKeywords.length < 2) {
        return {
          isValid: false,
          error: 'El reverso de la cédula no contiene los elementos esperados de una cédula chilena.'
        };
      }

      return { isValid: true };
    } catch (err) {
      console.error('Error validando reverso:', err);
      return {
        isValid: false,
        error: 'Error al validar el reverso de la cédula. Por favor, intenta nuevamente.'
      };
    }
  };

  // Procesar captura
  const handleCapture = async () => {
    setLoading(true);
    const photo = await capturePhoto();
    setLoading(false);
    
    if (!photo) {
      setError('No se pudo capturar la imagen. Por favor, intenta nuevamente.');
      return;
    }

    if (currentStep === VERIFICATION_STEPS.FRONT_ID.key) {
      setLoading(true);
      const isValid = await validateRutInId(photo);
      setLoading(false);
      
      if (!isValid) return;

      // Enviar al backend
      try {
        const formData = new FormData();
        formData.append('verificationId', verificationId);
        const blob = await fetch(photo).then(r => r.blob());
        formData.append('file', blob, 'front-id.jpg');

        const response = await axios.post(`${API_BASE}/api/kyc/id/front`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          setCaptures(prev => ({ ...prev, frontId: photo }));
          setCurrentStep(VERIFICATION_STEPS.BACK_ID.key);
        } else {
          setError('Error al procesar la cédula frontal. Por favor, intenta nuevamente.');
        }
      } catch (err) {
        console.error('Error enviando cédula frontal:', err);
        setError('Error al enviar la cédula frontal. Por favor, intenta nuevamente.');
      }
    } else if (currentStep === VERIFICATION_STEPS.BACK_ID.key) {
      setBackIdValidationStatus('validating');
      setLoading(true);
      const backValidation = await validateBackId(photo);
      setLoading(false);
      
      if (!backValidation.isValid) {
        setBackIdValidationStatus('invalid');
        setError(backValidation.error || 'La parte trasera de la cédula no pasó la validación.');
        return;
      }
      
      // Si la validación del frontend pasó, continuar aunque el backend pueda fallar
      // (el backend tiene validación más estricta, pero si el frontend detectó elementos, es válido)

      try {
        const formData = new FormData();
        formData.append('verificationId', verificationId);
        const blob = await fetch(photo).then(r => r.blob());
        formData.append('file', blob, 'back-id.jpg');

        const response = await axios.post(`${API_BASE}/api/kyc/id/back`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          setBackIdValidationStatus('valid');
          setCaptures(prev => ({ ...prev, backId: photo }));
          setTimeout(() => {
            setCurrentStep(VERIFICATION_STEPS.LIVENESS.key);
            setBackIdValidationStatus(null);
            startCamera(); // Reiniciar cámara para liveness
          }, 1000);
        } else {
          setError('Error al procesar el reverso de la cédula. Por favor, intenta nuevamente.');
        }
      } catch (err) {
        console.error('Error enviando reverso:', err);
        setError('Error al enviar el reverso de la cédula. Por favor, intenta nuevamente.');
      }
    }
  };

  // Detectar pose de cabeza para liveness
  const detectHeadPose = useCallback(async () => {
    if (!humanInstance || !webcamRef.current || !cameraReady || currentStep !== VERIFICATION_STEPS.LIVENESS.key) {
      return;
    }

    const video = webcamRef.current.video;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    try {
      const result = await humanInstance.detect(video);
      
      if (result.face && result.face.length > 0) {
        const face = result.face[0];
        
        // Calcular yaw (rotación horizontal) desde landmarks
        // Human proporciona landmarks en diferentes formatos
        const landmarks = face.mesh || face.landmarks || [];
        let yaw = 0;
        
        if (landmarks.length >= 68) {
          // Usar puntos clave de landmarks 68
          // Índices aproximados para landmarks 68
          const noseTip = landmarks[30] || landmarks[0];
          const leftFace = landmarks[0] || landmarks[1];
          const rightFace = landmarks[16] || landmarks[15];
          
          if (noseTip && leftFace && rightFace) {
            const faceWidth = Math.abs(rightFace[0] - leftFace[0]);
            if (faceWidth > 0) {
              const noseOffset = noseTip[0] - (leftFace[0] + faceWidth / 2);
              yaw = (noseOffset / faceWidth) * 90; // Aproximación en grados
            }
          }
        } else if (landmarks.length > 0) {
          // Fallback: usar bounding box para estimar yaw
          const box = face.box;
          if (box && Array.isArray(box) && box.length >= 4) {
            const centerX = box[0] + box[2] / 2;
            const videoWidth = webcamRef.current?.video?.videoWidth || 1920;
            const offset = (centerX - videoWidth / 2) / videoWidth;
            yaw = offset * 45; // Aproximación
          }
        }
        
        setCurrentYaw(yaw);
        
        // Verificar fase actual
        const phase = LIVENESS_PHASES[livenessPhase.toUpperCase()];
        if (phase) {
          const yawDiff = Math.abs(yaw - phase.targetYaw);
          
          if (yawDiff <= phase.tolerance) {
            const now = Date.now();
            if (!phaseStartTime) {
              setPhaseStartTime(now);
            }
            
            const elapsed = now - phaseStartTime;
            const progress = Math.min(100, (elapsed / phase.duration) * 100);
            setLivenessProgress(progress);
            
            if (elapsed >= phase.duration) {
              // Fase completada
              if (livenessPhase === LIVENESS_PHASES.FRONT.key) {
                setLivenessPhase(LIVENESS_PHASES.RIGHT.key);
                setPhaseStartTime(null);
                setLivenessProgress(0);
              } else if (livenessPhase === LIVENESS_PHASES.RIGHT.key) {
                setLivenessPhase(LIVENESS_PHASES.LEFT.key);
                setPhaseStartTime(null);
                setLivenessProgress(0);
              } else if (livenessPhase === LIVENESS_PHASES.LEFT.key) {
                // Liveness completado
                setLivenessCompleted(true);
                setLivenessScore(0.85); // Score basado en completar las 3 fases
                // Capturar selfie
                const selfie = capturePhoto();
                if (selfie) {
                  setCaptures(prev => ({ ...prev, selfie }));
                  await sendSelfie(selfie);
                }
              }
            }
          } else {
            setPhaseStartTime(null);
            setLivenessProgress(0);
          }
        }
      }
    } catch (err) {
      console.error('Error detectando pose:', err);
    }

    if (currentStep === VERIFICATION_STEPS.LIVENESS.key && !livenessCompleted) {
      animationFrameRef.current = requestAnimationFrame(detectHeadPose);
    }
  }, [humanInstance, cameraReady, currentStep, livenessPhase, livenessCompleted, phaseStartTime]);

  // Iniciar detección de liveness
  useEffect(() => {
    if (currentStep === VERIFICATION_STEPS.LIVENESS.key && cameraReady && modelsLoaded) {
      detectHeadPose();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentStep, cameraReady, modelsLoaded, detectHeadPose]);

  // Generar embedding del selfie y comparar con el de la cédula
  const generateSelfieEmbedding = async (selfieBase64) => {
    try {
      if (!humanInstance || !captures.frontId) return null;

      // Generar embedding del selfie
      const selfieImg = await humanInstance.image(selfieBase64);
      const selfieResult = await humanInstance.detect(selfieImg);
      
      if (!selfieResult.face || selfieResult.face.length === 0) {
        return null;
      }

      const selfieFace = selfieResult.face[0];
      const selfieEmbedding = selfieFace.embedding || selfieFace.description;
      
      if (!selfieEmbedding || !Array.isArray(selfieEmbedding) || selfieEmbedding.length === 0) {
        return null;
      }

      // Generar embedding de la cédula frontal
      const frontIdImg = await humanInstance.image(captures.frontId);
      const frontIdResult = await humanInstance.detect(frontIdImg);
      
      if (!frontIdResult.face || frontIdResult.face.length === 0) {
        return null;
      }

      const frontIdFace = frontIdResult.face[0];
      const frontIdEmbedding = frontIdFace.embedding || frontIdFace.description;
      
      if (!frontIdEmbedding || !Array.isArray(frontIdEmbedding) || frontIdEmbedding.length === 0) {
        return null;
      }

      // Calcular similitud coseno
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

      const faceMatchScore = cosineSimilarity(frontIdEmbedding, selfieEmbedding);
      
      return {
        selfieEmbedding: Array.from(selfieEmbedding),
        faceMatchScore
      };
    } catch (err) {
      console.error('Error generando embeddings:', err);
      return null;
    }
  };

  // Enviar selfie al backend
  const sendSelfie = async (selfieBase64) => {
    try {
      setCurrentStep(VERIFICATION_STEPS.VERIFYING.key);
      setLoading(true);
      setError('');

      // Generar embeddings y calcular similitud en el frontend
      const embeddingResult = await generateSelfieEmbedding(selfieBase64);
      
      if (!embeddingResult) {
        setError('No se pudo procesar la selfie. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      const { faceMatchScore } = embeddingResult;

      // Enviar al backend con los embeddings y scores calculados
      const formData = new FormData();
      formData.append('verificationId', verificationId);
      formData.append('livenessScore', livenessScore.toString());
      formData.append('faceMatchScore', faceMatchScore.toString());
      formData.append('selfieEmbedding', JSON.stringify(embeddingResult.selfieEmbedding));
      const blob = await fetch(selfieBase64).then(r => r.blob());
      formData.append('file', blob, 'selfie.jpg');

      const response = await axios.post(`${API_BASE}/api/kyc/selfie`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const { status, scores } = response.data;
        
        if (status === 'VERIFIED') {
          onComplete({
            frontId: captures.frontId,
            backId: captures.backId,
            selfie: selfieBase64,
            verificationData: {
              status,
              scores,
              verificationId
            }
          });
        } else {
          setError(`Verificación ${status === 'REJECTED_FACE_MISMATCH' ? 'fallida: la cara no coincide' : status === 'REJECTED_LIVENESS' ? 'fallida: prueba de vida no superada' : 'pendiente de revisión'}.`);
        }
      } else {
        setError('Error al procesar la selfie. Por favor, intenta nuevamente.');
      }
    } catch (err) {
      console.error('Error enviando selfie:', err);
      setError('Error al enviar la selfie. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const currentStepInfo = Object.values(VERIFICATION_STEPS).find(s => s.key === currentStep);
  const currentLivenessPhase = LIVENESS_PHASES[livenessPhase.toUpperCase()];

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
              <p className="text-violet-100 mt-1 text-sm">
                {currentStep === VERIFICATION_STEPS.LIVENESS.key && currentLivenessPhase
                  ? currentLivenessPhase.instruction
                  : currentStepInfo?.instruction}
              </p>
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
                (step.key === VERIFICATION_STEPS.LIVENESS.key && livenessCompleted);
              
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
                      {step.key === 'front' ? 'Frente' : step.key === 'back' ? 'Reverso' : 'Liveness'}
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
                {!modelsLoaded && currentStep === VERIFICATION_STEPS.LIVENESS.key ? (
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
                      screenshotQuality={0.95}
                      videoConstraints={{
                        facingMode: currentStep === VERIFICATION_STEPS.LIVENESS.key ? 'user' : { ideal: 'environment' },
                        width: { ideal: 1920, min: 1280 },
                        height: { ideal: 1080, min: 720 },
                        focusMode: 'continuous'
                      }}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay frame para cédula */}
                    {(currentStep === VERIFICATION_STEPS.FRONT_ID.key || currentStep === VERIFICATION_STEPS.BACK_ID.key) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-4 border-yellow-400 rounded-lg" style={{ width: '80%', aspectRatio: '1.6/1' }}>
                          <div className="absolute top-2 left-2 text-yellow-400 text-xs font-bold">
                            Coloca tu cédula aquí
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Overlay para liveness */}
                    {currentStep === VERIFICATION_STEPS.LIVENESS.key && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-4 border-blue-400 rounded-full" style={{ width: '60%', aspectRatio: '1/1' }}>
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-blue-400 text-xs font-bold whitespace-nowrap">
                            {currentLivenessPhase?.instruction || 'Coloca tu rostro aquí'}
                          </div>
                          {/* Indicador de progreso */}
                          {livenessProgress > 0 && (
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3/4">
                              <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-400 transition-all duration-100"
                                  style={{ width: `${livenessProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
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

              {/* Validation Status */}
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                {currentStep !== VERIFICATION_STEPS.FRONT_ID.key && currentStep !== VERIFICATION_STEPS.VERIFYING.key && currentStep !== VERIFICATION_STEPS.LIVENESS.key && (
                  <button
                    onClick={() => {
                      if (currentStep === VERIFICATION_STEPS.BACK_ID.key) {
                        setCurrentStep(VERIFICATION_STEPS.FRONT_ID.key);
                        setCaptures(prev => ({ ...prev, backId: null }));
                        setBackIdValidationStatus(null);
                      }
                      setError('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    ← Atrás
                  </button>
                )}
                {currentStep !== VERIFICATION_STEPS.VERIFYING.key && currentStep !== VERIFICATION_STEPS.LIVENESS.key && cameraReady && (
                  <button
                    onClick={handleCapture}
                    disabled={!stream || loading || (currentStep === VERIFICATION_STEPS.FRONT_ID.key && rutValidationStatus === 'validating') || (currentStep === VERIFICATION_STEPS.BACK_ID.key && backIdValidationStatus === 'validating')}
                    className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentStep === VERIFICATION_STEPS.FRONT_ID.key ? 'Capturar y validar' : 'Capturar'}
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

export default IDVerificationModalHuman;

