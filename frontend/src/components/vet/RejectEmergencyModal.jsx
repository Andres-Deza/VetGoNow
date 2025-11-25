import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const REJECTION_REASONS = [
  { code: 'operating', label: 'Estoy atendiendo otra urgencia' },
  { code: 'too_far', label: 'Estoy muy lejos de la ubicación' },
  { code: 'no_vehicle', label: 'No tengo vehículo disponible' },
  { code: 'unavailable', label: 'No estoy disponible en este momento' },
  { code: 'other', label: 'Otro motivo' }
];

const RejectEmergencyModal = ({ emergency, isOpen, onClose, onSuccess }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  const handleReject = async () => {
    if (!selectedReason) {
      setError('Por favor selecciona un motivo de rechazo');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      setError('Por favor especifica el motivo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/api/appointments/${emergency._id}/reject-emergency`,
        {
          reason: selectedReason === 'other' 
            ? customReason 
            : REJECTION_REASONS.find(r => r.code === selectedReason)?.label
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error rejecting emergency:', err);
      setError(err.response?.data?.message || 'Error al rechazar la urgencia');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !emergency) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Rechazar Urgencia</h2>

        {/* Información de la urgencia */}
        <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">Urgencia pendiente</p>
              <p className="text-sm text-red-800">
                Mascota: <span className="font-semibold">{emergency.petId?.name || 'Mascota'}</span>
              </p>
              <p className="text-sm text-red-800">
                Tutor: <span className="font-semibold">{emergency.userId?.name || 'Tutor'}</span>
              </p>
              <p className="text-xs text-red-700 mt-2">
                Al rechazar, el sistema buscará otro veterinario disponible. Esto no afectará tu reputación.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Motivo de rechazo <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Selecciona un motivo</option>
            {REJECTION_REASONS.map((reason) => (
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
              placeholder="Describe el motivo del rechazo..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
            onClick={handleReject}
            disabled={loading || !selectedReason}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Rechazando...' : 'Rechazar Urgencia'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectEmergencyModal;

