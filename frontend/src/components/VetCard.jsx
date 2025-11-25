import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StarRating from './StarRating';

const serviceLabels = {
  'consultas': 'Consultas',
  'video-consultas': 'Video consultas',
  'a-domicilio': 'A domicilio'
};

const VetCard = ({ vet }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const onBook = () => navigate(`/appointment/${vet._id}${location.search || ''}`);

  // Determinar si mostrar "Nuevo" o el promedio
  const shouldShowAverage = vet?.ratings?.showAverage && vet?.ratings?.total >= 5;
  const isNew = !vet?.ratings || vet?.ratings?.total === 0 || vet?.ratings?.total < 5;

  return (
    <div className="border rounded-xl shadow-sm p-4 bg-white flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <img
          src={vet.avatar || '/default-vet-image.jpg'}
          alt={vet.name}
          className="w-14 h-14 rounded-full object-cover border"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold truncate">{vet.name}</h3>
          <p className="text-sm text-gray-600 truncate">{vet.specialization || 'Veterinario(a)'}</p>
          <p className="text-xs text-gray-500 truncate">{vet.region} {vet.comuna ? `- ${vet.comuna}` : ''}</p>
            </div>
            {/* Rating o Badge Nuevo */}
            <div className="flex-shrink-0">
              {isNew ? (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                  Nuevo
                </span>
              ) : shouldShowAverage && vet?.ratings?.average > 0 ? (
                <div className="flex flex-col items-end gap-0.5">
                  <StarRating rating={vet.ratings.average} readonly={true} size="sm" />
                  <span className="text-xs text-gray-500">({vet.ratings.total})</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs mb-3">
        {(vet.services || []).map((s) => (
          <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
            {serviceLabels[s] || s}
          </span>
        ))}
        {vet.supportsEmergency && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">
            Atiende urgencias
          </span>
        )}
        {typeof vet.distancia === 'number' && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
            ~{(vet.distancia / 1000).toFixed(1)} km
          </span>
        )}
        {vet.availableNow && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
            Disponible ahora
          </span>
        )}
      </div>

      <button
        onClick={onBook}
        className="mt-auto bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-md"
      >
        Agendar
      </button>
    </div>
  );
};

export default VetCard;
