import React from 'react';
import StarRating from './StarRating';

const VetRatingSummary = ({ vet, showDetails = true }) => {
  if (!vet || !vet.ratings) return null;

  const { average, total, showAverage, breakdown } = vet.ratings;
  const isNew = total === 0 || total < 5;
  const shouldShowAverage = showAverage && total >= 5;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Calificaciones</h3>
          {isNew ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                Nuevo
              </span>
              {total > 0 && (
                <span className="text-sm text-gray-600">
                  ({total} {total === 1 ? 'calificación' : 'calificaciones'} - Se mostrará el promedio después de 5 calificaciones)
                </span>
              )}
            </div>
          ) : shouldShowAverage ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <StarRating rating={average} readonly={true} size="lg" showLabel={true} />
                <span className="text-sm text-gray-600">({total} {total === 1 ? 'calificación' : 'calificaciones'})</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aún no hay calificaciones suficientes</p>
          )}
        </div>
      </div>

      {showDetails && shouldShowAverage && breakdown && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          {breakdown.punctuality > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Puntualidad</p>
              <StarRating rating={breakdown.punctuality} readonly={true} size="sm" />
            </div>
          )}
          {breakdown.professionalism > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Profesionalismo</p>
              <StarRating rating={breakdown.professionalism} readonly={true} size="sm" />
            </div>
          )}
          {breakdown.communication > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Comunicación</p>
              <StarRating rating={breakdown.communication} readonly={true} size="sm" />
            </div>
          )}
          {breakdown.care > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Cuidado</p>
              <StarRating rating={breakdown.care} readonly={true} size="sm" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VetRatingSummary;

