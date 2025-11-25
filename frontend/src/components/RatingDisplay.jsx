import React from 'react';
import StarRating from './StarRating';

const RatingDisplay = ({ rating, showDetails = true, size = 'md' }) => {
  if (!rating) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
      {/* Header con usuario y fecha */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {rating.userId?.image ? (
            <img
              src={rating.userId.image}
              alt={rating.userId.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-violet-600 font-semibold text-sm">
                {rating.userId?.name?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{rating.userId?.name || 'Usuario'}</p>
            {rating.petId?.name && (
              <p className="text-xs text-gray-500">Mascota: {rating.petId.name}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{formatDate(rating.createdAt)}</p>
          {rating.isEmergency && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
              Urgencia
            </span>
          )}
        </div>
      </div>

      {/* Calificación */}
      <div className="mb-3">
        <StarRating rating={rating.rating} readonly={true} size={size} />
      </div>

      {/* Categorías detalladas */}
      {showDetails && rating.categories && Object.values(rating.categories).some(v => v > 0) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-2">Calificaciones Detalladas:</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {rating.categories.punctuality > 0 && (
              <div>
                <p className="text-gray-600 mb-1">Puntualidad</p>
                <StarRating rating={rating.categories.punctuality} readonly={true} size="sm" />
              </div>
            )}
            {rating.categories.professionalism > 0 && (
              <div>
                <p className="text-gray-600 mb-1">Profesionalismo</p>
                <StarRating rating={rating.categories.professionalism} readonly={true} size="sm" />
              </div>
            )}
            {rating.categories.communication > 0 && (
              <div>
                <p className="text-gray-600 mb-1">Comunicación</p>
                <StarRating rating={rating.categories.communication} readonly={true} size="sm" />
              </div>
            )}
            {rating.categories.care > 0 && (
              <div>
                <p className="text-gray-600 mb-1">Cuidado</p>
                <StarRating rating={rating.categories.care} readonly={true} size="sm" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comentario */}
      {rating.comment && (
        <div className="pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{rating.comment}</p>
        </div>
      )}
    </div>
  );
};

export default RatingDisplay;

