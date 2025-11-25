import React, { useEffect, useRef, useState } from 'react';

const PROMPTS = [
  { key: 'center', text: 'Mira al centro' },
  { key: 'blink', text: 'Parpadea suavemente' },
  { key: 'turn', text: 'Gira un poco tu cabeza a la derecha' },
];

const SelfieCaptureModal = ({ open, onClose, onComplete }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [step, setStep] = useState(0);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      if (!open) return;
      setError('');
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!mounted) return;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e) {
        setError('No fue posible acceder a tu cámara. Revisa permisos del navegador.');
      }
    };
    start();
    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setStream(null);
      setSnapshots([]);
      setStep(0);
      setLoading(false);
    };
  }, [open]); // eslint-disable-line

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  };

  // Liveness muy básico: diferencia promedio de píxeles entre dos capturas consecutivas
  const computeDiff = async (blobA, blobB) => {
    const imgA = await createImageBitmap(blobA);
    const imgB = await createImageBitmap(blobB);
    const c = document.createElement('canvas');
    c.width = Math.min(imgA.width, imgB.width);
    c.height = Math.min(imgA.height, imgB.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(imgA, 0, 0, c.width, c.height);
    const aData = ctx.getImageData(0, 0, c.width, c.height).data;
    ctx.drawImage(imgB, 0, 0, c.width, c.height);
    const bData = ctx.getImageData(0, 0, c.width, c.height).data;
    let diffSum = 0;
    const total = c.width * c.height * 4;
    for (let i = 0; i < total; i += 4) {
      const dr = Math.abs(aData[i] - bData[i]);
      const dg = Math.abs(aData[i + 1] - bData[i + 1]);
      const db = Math.abs(aData[i + 2] - bData[i + 2]);
      diffSum += (dr + dg + db) / 3;
    }
    const avg = diffSum / (total / 4);
    return avg; // 0-255
  };

  const handleTake = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const shot = await captureFrame();
      if (!shot) throw new Error('No se pudo capturar la imagen.');
      const next = [...snapshots, shot];
      setSnapshots(next);

      // Verificación de movimiento mínimo entre frames (si hay 2 o más)
      if (next.length >= 2) {
        const diff = await computeDiff(next[next.length - 2], next[next.length - 1]);
        // Umbral mínimo empírico (ajustable)
        if (diff < 3) {
          setLoading(false);
          setError('No detectamos movimiento suficiente. Vuelve a intentarlo siguiendo la instrucción.');
          // eliminar la última si no hubo movimiento
          setSnapshots((arr) => arr.slice(0, -1));
          return;
        }
      }

      if (step < PROMPTS.length - 1) {
        setStep((s) => s + 1);
        setLoading(false);
      } else {
        // Completar: enviar evidencia al backend con score básico
        const API_BASE = import.meta.env?.VITE_API_BASE || '';
        try {
          const form = new FormData();
          // score aproximado = promedio de diffs entre pares consecutivos
          let total = 0;
          for (let i = 1; i < next.length; i++) {
            // recalcular rápidamente (sin repetir cálculos previos en este else)
            const d = await computeDiff(next[i - 1], next[i]);
            total += d;
          }
          const score = total / Math.max(1, next.length - 1);
          form.append('score', String(score));
          next.forEach((blob, idx) => {
            form.append('frames', new File([blob], `frame_${idx + 1}.jpg`, { type: 'image/jpeg' }));
          });
          await fetch(`${API_BASE}/api/vets/verify-selfie`, {
            method: 'POST',
            body: form
          });
        } catch (e) {
          // si falla, seguimos, ya que esto es best-effort
          console.warn('No se pudo enviar evidencia de selfie:', e);
        }
        setLoading(false);
        onComplete?.(next[0], next);
        onClose?.();
      }
    } catch (e) {
      setLoading(false);
      setError(e.message || 'Ocurrió un error al capturar la selfie.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Verificación facial en tiempo real</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Cerrar</button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">{error}</div>}
          <div className="aspect-video bg-black/5 rounded-lg overflow-hidden flex items-center justify-center">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-3 py-2 text-sm">
            Paso {step + 1} de {PROMPTS.length}: <span className="font-medium">{PROMPTS[step].text}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Asegúrate de tener buena luz y el rostro centrado.</div>
            <button
              onClick={handleTake}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {loading ? 'Procesando...' : 'Capturar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfieCaptureModal;


