import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const STATUS_LABELS = {
  pending: 'Buscando veterinario',
  'vet-assigned': 'Veterinario asignado',
  accepted: 'Veterinario asignado',
  'on-way': 'En camino',
  'in-service': 'En progreso',
  arrived: 'Veterinario en tu ubicación'
};

const REASON_LABELS = {
  trauma: 'Golpe / Trauma',
  bleeding: 'Sangrado',
  seizures: 'Convulsiones',
  choking: 'Ahogo',
  vomiting: 'Vómitos persistentes',
  poisoning: 'Envenenamiento',
  fever: 'Fiebre alta',
  urination: 'Retención urinaria',
  pain: 'Dolor intenso',
  other: 'Otro'
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(value ?? 0);

const formatReason = (reason) =>
  REASON_LABELS[reason] ||
  reason?.replace(/[_-]/g, ' ')?.replace(/\b\w/g, (char) => char.toUpperCase());

const UserActiveEmergencies = () => {
  const navigate = useNavigate();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmergencies = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get(`${API_BASE}/api/emergency/user-active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmergencies(data.emergencies || []);
      } catch (err) {
        console.error('Error fetching user emergencies:', err);
        setError('No pudimos cargar tus urgencias. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencies();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus urgencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mis urgencias</h1>
          <p className="text-sm text-gray-600 mt-2">
            Revisa y continúa el seguimiento de tus solicitudes en curso.
          </p>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {emergencies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-600">
            <p>No tienes urgencias activas. Si necesitas atención, inicia una nueva solicitud.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {emergencies.map((emergency) => (
              <div
                key={emergency.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">
                      {STATUS_LABELS[emergency.status] || emergency.status}
                    </p>
                    <h2 className="text-xl font-semibold text-gray-900 mt-1">
                      {emergency.pet?.name || 'Mascota'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/emergency/${emergency.id}/tracking`)}
                      className="px-4 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition"
                    >
                      Ver seguimiento
                    </button>
                    {emergency.conversationId && (
                      <button
                        onClick={() => navigate(`/conversations/${emergency.conversationId}`)}
                        className="px-4 py-2 bg-white border border-violet-200 text-violet-700 rounded-xl font-semibold hover:bg-violet-50 transition"
                      >
                        Abrir chat
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Motivo</p>
                    <p className="mt-1 font-medium">
                      {formatReason(emergency.triage?.mainReason) || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha</p>
                    <p className="mt-1 font-medium">
                      {new Date(emergency.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ubicación</p>
                    <p className="mt-1 font-medium">
                      {emergency.location?.address || 'Sin dirección registrada'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Pago estimado</p>
                    <p className="mt-1 font-medium text-violet-700">
                      {formatCurrency(emergency.pricing?.total || 0)}
                    </p>
                  </div>
                </div>

                {emergency.vet && (
                  <div className="mt-4 bg-violet-50 text-violet-900 px-4 py-3 rounded-xl text-sm">
                    Veterinario asignado: <strong>{emergency.vet.name}</strong>{' '}
                    {emergency.vet.phoneNumber && (
                      <span className="ml-2 text-xs text-violet-700">
                        Tel: {emergency.vet.phoneNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActiveEmergencies;


