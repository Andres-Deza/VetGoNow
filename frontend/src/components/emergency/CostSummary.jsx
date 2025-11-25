import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount);

const CostSummary = ({ pricing }) => {
  if (!pricing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <p className="text-gray-500 text-center py-4">Calculando costos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
        Servicios
      </h3>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Base urgencia</span>
          <span className="text-gray-900 font-medium">
            {pricing.baseBeforeCritical != null && !isNaN(pricing.baseBeforeCritical)
              ? formatCurrency(pricing.baseBeforeCritical)
              : pricing.base != null && !isNaN(pricing.base)
              ? formatCurrency(pricing.base)
              : 'Calculando...'}
          </span>
        </div>

        {pricing.timeSurcharge > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Recargo horario</span>
            <span className="text-gray-900 font-medium">{formatCurrency(pricing.timeSurcharge)}</span>
          </div>
        )}

        {(pricing.criticalSurcharge > 0 || pricing.isCritical) && (
          <div className="flex justify-between text-gray-700">
            <span>Recargo por signos críticos (20%)</span>
            <span className="text-gray-900 font-medium">
              {formatCurrency(pricing.criticalSurcharge || 0)}
            </span>
          </div>
        )}

        {pricing.travelFee > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Recargo fijo de trayecto</span>
            <span className="text-gray-900 font-medium">{formatCurrency(pricing.travelFee)}</span>
          </div>
        )}

        {pricing.clinicSurcharge > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Recargo de clínica</span>
            <span className="text-gray-900 font-medium">{formatCurrency(pricing.clinicSurcharge)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900 text-lg">Total</span>
            <span className="font-bold text-blue-600 text-xl">
              {pricing.total != null && !isNaN(pricing.total) 
                ? formatCurrency(pricing.total) 
                : 'Calculando...'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            El costo incluye la atención de urgencia veterinaria y el desplazamiento del equipo. El precio base ya considera la distancia de traslado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CostSummary;

