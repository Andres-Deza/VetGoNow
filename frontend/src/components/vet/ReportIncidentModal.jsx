import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const INCIDENT_REASONS = [
  { code: 'accident', label: 'Accidente o emergencia personal' },
  { code: 'vehicle_breakdown', label: 'Vehículo descompuesto' },
  { code: 'medical_emergency', label: 'Emergencia médica propia' },
  { code: 'unexpected_delay', label: 'Retraso inesperado en otra atención' },
  { code: 'clinic_overflow', label: 'Clínica colapsada / Sin capacidad' },
  { code: 'more_urgent_case', label: 'Llegó una urgencia más grave' },
  { code: 'other', label: 'Otro motivo' }
];

const ReportIncidentModal = ({ emergency, isOpen, onClose, onSuccess }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  const handleReport = async () => {
    if (!selectedReason) {
      setError('Por favor selecciona un motivo del incidente');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      setError('Por favor especifica el motivo');
      return;
    }

    // Confirmación adicional por ser un incidente grave
    const confirmed = window.confirm(
      '⚠️ REPORTAR INCIDENTE\n\n' +
      'Estás reportando un incidente grave. Esto:\n' +
      '• Afectará tu reputación en la plataforma\n' +
      '• Disparará una búsqueda inmediata de otro veterinario\n' +
      '• Se notificará al tutor\n\n' +
      '¿Estás seguro de que no puedes atender esta urgencia?'
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/api/appointments/${emergency._id}/report-incident`,
        {
          reason: selectedReason === 'other' 
            ? customReason 
            : INCIDENT_REASONS.find(r => r.code === selectedReason)?.label,
          requiresReassignment: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error reporting incident:', err);
      setError(err.response?.data?.message || 'Error al reportar el incidente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !emergency) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reportar Incidente</h2>

        {/* Advertencia */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-yellow-900 mb-1">⚠️ Incidente Grave</p>
              <p className="text-sm text-yellow-800">
                Esta urgencia ya fue aceptada. Reportar un incidente:
              </p>
              <ul className="text-xs text-yellow-800 mt-2 list-disc list-inside space-y-1">
                <li>Afectará tu reputación en la plataforma</li>
                <li>Disparará búsqueda inmediata de otro veterinario</li>
                <li>Se notificará al tutor del problema</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Información de la urgencia */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">
            Mascota: <span className="font-semibold">{emergency.petId?.name || 'Mascota'}</span>
          </p>
          <p className="text-sm text-gray-600">
            Tutor: <span className="font-semibold">{emergency.userId?.name || 'Tutor'}</span>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Motivo del incidente <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">Selecciona un motivo</option>
            {INCIDENT_REASONS.map((reason) => (
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
              placeholder="Describe el motivo del incidente..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleReport}
            disabled={loading || !selectedReason}
            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Reportando...' : 'Reportar Incidente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportIncidentModal;

