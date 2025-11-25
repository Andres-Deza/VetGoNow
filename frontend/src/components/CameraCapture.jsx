import React, { useState, useRef, useEffect } from 'react';

const CameraCapture = ({ onCapture, onClose }) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' para cámara trasera, 'user' para frontal
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    startCamera();

    // Cleanup: detener la cámara cuando se desmonte el componente
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      
      // Detener stream anterior si existe
      if (stream) {
        stopCamera();
      }

      // Solicitar acceso a la cámara
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);

      // Asignar el stream al elemento video
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Se denegó el permiso para acceder a la cámara. Por favor, permite el acceso en la configuración de tu navegador.'
          : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
          ? 'No se encontró ninguna cámara en tu dispositivo.'
          : 'No se pudo acceder a la cámara. Verifica que tu dispositivo tenga una cámara y que esté disponible.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Establecer el tamaño del canvas igual al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir canvas a blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Crear un File desde el blob
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        // Llamar al callback con el archivo capturado
        onCapture(file);
        
        // Detener la cámara
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleClose = () => {
    stopCamera();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-tutor-text-primary">
            📷 Tomar Foto
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          {error ? (
            <div className="text-center">
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Intentar Nuevamente
              </button>
            </div>
          ) : stream ? (
            <div className="relative w-full max-w-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-black"
                style={{ transform: 'scaleX(-1)' }} // Espejo horizontal para mejor UX
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-tutor-text-secondary">Iniciando cámara...</p>
            </div>
          )}
        </div>

        {/* Controles */}
        {stream && !error && (
          <div className="p-4 border-t flex justify-center gap-4">
            <button
              onClick={switchCamera}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              title="Cambiar cámara"
            >
              🔄 Cambiar
            </button>
            <button
              onClick={capturePhoto}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-lg"
            >
              📸 Capturar
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;

