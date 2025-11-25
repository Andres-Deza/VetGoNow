import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaStar, FaMapMarkerAlt, FaClock, FaCheckCircle, FaHospital, FaUserMd } from 'react-icons/fa';

const VetAssignment = ({ mode, location, assignment, onChange, onVetSelect }) => {
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVetId, setSelectedVetId] = useState(assignment?.preferredVetId || null);
  const [autoAssign, setAutoAssign] = useState(assignment?.strategy !== 'manual');
  const lastManualVetIdRef = useRef(assignment?.preferredVetId || null);

  useEffect(() => {
    const isAuto = assignment?.strategy !== 'manual';
    setAutoAssign(isAuto);

    const incomingId = assignment?.preferredVetId || null;
    setSelectedVetId(incomingId);

    if (!isAuto && incomingId) {
      lastManualVetIdRef.current = incomingId;
    }
  }, [assignment?.preferredVetId, assignment?.strategy]);

  useEffect(() => {
    if (location?.lat && location?.lng && !autoAssign) {
      fetchNearbyVets();
    }
  }, [location?.lat, location?.lng, autoAssign]);

  const fetchNearbyVets = async () => {
    if (!location?.lat || !location?.lng) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
      const response = await axios.get(
        `${API_BASE}/api/emergency/nearby-vets?lat=${location.lat}&lng=${location.lng}&maxDistance=10`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setVets(response.data.vets || []);
      }
    } catch (error) {
      console.error('Error fetching nearby vets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssignChange = (value) => {
    setAutoAssign(value);

    if (value) {
      if (selectedVetId) {
        lastManualVetIdRef.current = selectedVetId;
      }
      setSelectedVetId(null);
      if (onVetSelect) {
        onVetSelect(null);
      }
      onChange((prev) => ({
        ...(typeof prev === 'object' && prev !== null ? prev : {}),
        strategy: 'auto',
        preferredVetId: null
      }));
      return;
    }

    const manualVetId =
      lastManualVetIdRef.current ||
      assignment?.preferredVetId ||
      selectedVetId ||
      null;

    setSelectedVetId(manualVetId);

    onChange((prev) => ({
      ...(typeof prev === 'object' && prev !== null ? prev : {}),
      strategy: 'manual',
      preferredVetId: manualVetId
    }));

    if (manualVetId && onVetSelect) {
      const vet = vets.find((v) => v._id === manualVetId);
      if (vet) {
        onVetSelect(vet);
      }
    }
  };

  const handleVetSelect = (vetId) => {
    setSelectedVetId(vetId);
    setAutoAssign(false);
    lastManualVetIdRef.current = vetId;
    onChange((prev) => ({
      ...(typeof prev === 'object' && prev !== null ? prev : {}),
      strategy: 'manual',
      preferredVetId: vetId
    }));
    if (onVetSelect) {
      const vet = vets.find(v => v._id === vetId);
      onVetSelect(vet);
    }
  };

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
        Veterinario/Asignación
      </h3>

      {/* Opción de asignación automática */}
      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoAssign}
            onChange={(e) => handleAutoAssignChange(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-700 font-medium">
            Asignación automática (recomendado)
          </span>
        </label>
        <p className="text-sm text-gray-500 mt-1 ml-8">
          Te asignaremos el veterinario más cercano disponible automáticamente
        </p>
      </div>

      {/* Selección manual de veterinario */}
      {!autoAssign && (
        <div>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Buscando veterinarios cercanos...</p>
            </div>
          ) : vets.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                No se encontraron veterinarios disponibles en tu área. 
                Intenta con asignación automática o selecciona otra ubicación.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Elige un profesional:
              </p>
              {vets.map((vet) => (
                <button
                  key={vet._id}
                  type="button"
                  onClick={() => handleVetSelect(vet._id)}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all text-left
                    ${selectedVetId === vet._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Foto del veterinario */}
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {vet.profileImage ? (
                        <img
                          src={vet.profileImage}
                          alt={vet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg md:text-xl">
                          👨‍⚕️
                        </div>
                      )}
                    </div>

                    {/* Información del veterinario */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">{vet.name}</h4>
                        {selectedVetId === vet._id && (
                          <FaCheckCircle className="text-blue-500 text-lg md:text-xl flex-shrink-0 ml-2" />
                        )}
                      </div>
                      {vet.specialization && (
                        <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2 truncate">{vet.specialization}</p>
                      )}
                      
                      {/* Tipo de veterinario */}
                      <div className="mb-1.5 md:mb-2 flex flex-wrap items-center gap-1.5">
                        {vet.vetType === 'clinic' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            <FaHospital className="text-xs" />
                            <span>Clínica</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            <FaUserMd className="text-xs" />
                            <span>Independiente</span>
                          </span>
                        )}
                        {vet.vetType === 'independent' && (
                          <span className="text-xs text-green-700 font-medium">
                            💰 Más económico
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 flex-wrap">
                        {vet.rating && vet.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <FaStar className="text-yellow-400 text-xs md:text-sm" />
                            <span>{vet.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Nuevo
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <FaMapMarkerAlt className="text-xs" />
                          <span>{vet.distance?.toFixed(1) || 'N/A'} km</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaClock className="text-xs" />
                          <span>~{vet.eta || 0} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VetAssignment;

