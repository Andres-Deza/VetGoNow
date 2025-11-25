import React, { useState, useMemo } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Ventanas de cancelación (en horas)
const CANCEL_WINDOWS = {
  'clinic visit': 6,
  'home visit': 12,
  'online consultation': 4
};

const HARD_LIMIT_MINUTES = 60;

// Motivos de cancelación
const CANCELLATION_REASONS = [
  { code: 'schedule_conflict', label: 'Conflicto de agenda' },
  { code: 'sick', label: 'Enfermedad' },
  { code: 'booking_error', label: 'Error de agendamiento' },
  { code: 'emergency', label: 'Emergencia personal' },
  { code: 'other', label: 'Otro' }
];

const CancelAppointmentModal = ({ appointment, isOpen, onClose, onSuccess }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  // Calcular tiempo restante y tipo de cancelación
  const cancellationInfo = useMemo(() => {
    if (!appointment) return null;

    const [hours, minutes] = appointment.scheduledTime.split(':').map(Number);
    const appointmentDateTime = new Date(appointment.appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const timeDiffMs = appointmentDateTime - now;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    const timeDiffMinutes = timeDiffMs / (1000 * 60);

    const cancelWindow = CANCEL_WINDOWS[appointment.appointmentType] || 6;
    const isOnTime = timeDiffHours >= cancelWindow;
    const isLate = timeDiffHours < cancelWindow && timeDiffMinutes >= HARD_LIMIT_MINUTES;
    const isHardLimit = timeDiffMinutes < HARD_LIMIT_MINUTES;

    return {
      timeDiffHours,
      timeDiffMinutes,
      isOnTime,
      isLate,
      isHardLimit,
      cancelWindow,
      appointmentDateTime
    };
  }, [appointment]);

  const handleCancel = async () => {
    if (!selectedReason) {
      setError('Por favor selecciona un motivo de cancelación');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      setError('Por favor especifica el motivo');
      return;
    }

    if (cancellationInfo?.isHardLimit) {
      setError('No puedes cancelar esta cita desde la app. Contacta a Soporte VetGoNow.');
      return;
    }

    // Si es cancelación tardía, pedir confirmación antes de enviar
    if (cancellationInfo?.isLate) {
      const confirmed = window.confirm(
        'Estás cancelando con poca anticipación. Esto afectará tu reputación en la plataforma. ¿Confirmas?'
      );
      
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/api/appointments/${appointment._id}/cancel-by-vet`,
        {
          reason: selectedReason === 'other' ? customReason : CANCELLATION_REASONS.find(r => r.code === selectedReason)?.label,
          reasonCode: selectedReason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.requiresSupport) {
        setError(response.data.message);
        setLoading(false);
        return;
      }

      // La cancelación ya se procesó
      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error canceling appointment:', err);
      if (err.response?.data?.requiresSupport) {
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || 'Error al cancelar la cita');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment || !cancellationInfo) return null;

  const { isOnTime, isLate, isHardLimit, timeDiffHours, timeDiffMinutes, cancelWindow } = cancellationInfo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancelar Cita</h2>

        {/* Información de la cita */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Mascota: <span className="font-semibold">{appointment.petName}</span></p>
          <p className="text-sm text-gray-600 mb-1">Tutor: <span className="font-semibold">{appointment.userName}</span></p>
          <p className="text-sm text-gray-600">
            Fecha: {new Date(appointment.appointmentDate).toLocaleDateString('es-CL')} a las {appointment.scheduledTime}
          </p>
        </div>

        {/* Estado de cancelación */}
        {isHardLimit ? (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">No puedes cancelar desde la app</p>
                <p className="text-sm text-red-800">
                  Esta cita está programada para dentro de menos de {HARD_LIMIT_MINUTES} minutos. 
                  Para cancelar debes contactar a Soporte VetGoNow.
                </p>
              </div>
            </div>
          </div>
        ) : isLate ? (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">Cancelación tardía</p>
                <p className="text-sm text-yellow-800">
                  Estás cancelando con menos de {cancelWindow} horas de anticipación ({Math.round(timeDiffHours * 10) / 10} horas restantes). 
                  Esto afectará tu reputación en la plataforma.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-900 mb-1">Cancelación en plazo</p>
                <p className="text-sm text-green-800">
                  Puedes cancelar sin penalización. Tienes {Math.round(timeDiffHours)} horas de anticipación.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario de cancelación */}
        {!isHardLimit && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Motivo de cancelación <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Selecciona un motivo</option>
                {CANCELLATION_REASONS.map((reason) => (
                  <option key={reason.code} value={reason.code}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedReason === 'other' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Especifica el motivo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe el motivo de la cancelación..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}
          </>
        )}

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
          >
            {isHardLimit ? 'Cerrar' : 'Cancelar'}
          </button>
          {!isHardLimit && (
            <button
              onClick={handleCancel}
              disabled={loading || !selectedReason}
              className={`flex-1 px-4 py-2 rounded-lg transition disabled:opacity-50 ${
                isLate
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {loading ? 'Cancelando...' : isLate ? 'Confirmar cancelación tardía' : 'Cancelar cita'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancelAppointmentModal;

