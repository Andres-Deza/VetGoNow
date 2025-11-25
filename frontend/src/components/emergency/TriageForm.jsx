import React, { useState } from 'react';
import {
  FaExclamationTriangle,
  FaCamera,
  FaAmbulance,
  FaTint,
  FaBolt,
  FaLungs,
  FaStethoscope,
  FaSkullCrossbones,
  FaThermometerHalf,
  FaWater,
  FaHeartbeat,
  FaQuestionCircle
} from 'react-icons/fa';

const REASON_OPTIONS = [
  {
    value: 'trauma',
    label: 'Golpe/Trauma',
    description: 'Caídas, atropellos, golpes fuertes',
    icon: FaAmbulance
  },
  {
    value: 'bleeding',
    label: 'Sangrado',
    description: 'Heridas visibles o sangrado interno',
    icon: FaTint
  },
  {
    value: 'seizures',
    label: 'Convulsión',
    description: 'Movimientos involuntarios o pérdida de control',
    icon: FaBolt
  },
  {
    value: 'choking',
    label: 'Ahogo',
    description: 'Dificultad para respirar o tragar',
    icon: FaLungs
  },
  {
    value: 'vomiting',
    label: 'Vómitos persistentes',
    description: 'Vómitos repetidos o con sangre',
    icon: FaStethoscope
  },
  {
    value: 'poisoning',
    label: 'Envenenamiento',
    description: 'Ingesta de tóxicos o sustancias peligrosas',
    icon: FaSkullCrossbones
  },
  {
    value: 'fever',
    label: 'Fiebre alta',
    description: 'Temperatura corporal elevada o caliente al tacto',
    icon: FaThermometerHalf
  },
  {
    value: 'urination',
    label: 'Retención urinaria',
    description: 'Dificultad o incapacidad para orinar',
    icon: FaWater
  },
  {
    value: 'pain',
    label: 'Dolor intenso',
    description: 'Quejidos, jadeos o dolor evidente',
    icon: FaHeartbeat
  },
  {
    value: 'other',
    label: 'Otro',
    description: 'No se ajusta a las categorías anteriores',
    icon: FaQuestionCircle
  }
];

const CRITICAL_FLAGS = [
  { value: 'breathing', label: 'Dificultad respiratoria' },
  { value: 'active_bleeding', label: 'Sangrado activo' },
  { value: 'unconscious', label: 'Pérdida de conciencia' },
  { value: 'seizures', label: 'Convulsiones' },
  { value: 'cannot_stand', label: 'Incapacidad para ponerse de pie' }
];

const TriageForm = ({ triage, onChange }) => {
  const [localTriage, setLocalTriage] = useState(() => {
    const initialTriage = triage || {};
    return {
      mainReason: initialTriage.mainReason || '',
      criticalFlags: Array.isArray(initialTriage.criticalFlags) ? initialTriage.criticalFlags : [],
      notes: initialTriage.notes || '',
      attachments: Array.isArray(initialTriage.attachments) ? initialTriage.attachments : [],
    };
  });

  const handleChange = (field, value) => {
    const updated = { ...localTriage, [field]: value };
    setLocalTriage(updated);
    onChange(updated);
  };

  const handleReasonChange = (value) => {
    const updated = {
      ...localTriage,
      mainReason: value,
    };
    setLocalTriage(updated);
    onChange(updated);
  };

  const toggleCriticalFlag = (flag) => {
    const currentFlags = Array.isArray(localTriage.criticalFlags) ? localTriage.criticalFlags : [];
    const flags = currentFlags.includes(flag)
      ? currentFlags.filter(f => f !== flag)
      : [...currentFlags, flag];
    handleChange('criticalFlags', flags);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    // En producción, aquí subirías las imágenes a Firebase Storage o similar
    const fileUrls = files.map(file => URL.createObjectURL(file));
    const currentAttachments = Array.isArray(localTriage.attachments) ? localTriage.attachments : [];
    handleChange('attachments', [...currentAttachments, ...fileUrls]);
  };

  const currentCriticalFlags = Array.isArray(localTriage.criticalFlags) ? localTriage.criticalFlags : [];
  const hasCriticalFlags = currentCriticalFlags.length > 0;

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
        Motivo y triaje rápido <span className="text-red-500">*</span>
      </h3>

      {/* Motivo principal */}
      <div className="mb-4 md:mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs md:text-sm font-medium text-gray-700">
            Motivo principal <span className="text-red-500">*</span>
          </label>
          {localTriage.mainReason && (
            <button
              type="button"
              onClick={() => handleReasonChange('')}
              className="text-xs md:text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
            >
              Cambiar selección
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Selecciona la opción que mejor describe la urgencia. Esto nos ayuda a priorizar la atención.
        </p>
        <div
          role="radiogroup"
          className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3"
        >
          {REASON_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = localTriage.mainReason === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-pressed={isSelected}
                tabIndex={0}
                onClick={() => handleReasonChange(option.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleReasonChange(option.value);
                  }
                }}
                className={`group flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                }`}
              >
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white'
                  }`}
                  aria-hidden="true"
                >
                  <Icon />
                </span>
                <div className="flex-1">
                  <p className="text-sm md:text-base font-semibold text-gray-900">
                    {option.label}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    {option.description}
                  </p>
                  {isSelected && (
                    <p className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700">
                      Seleccionado
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {!localTriage.mainReason && (
          <p className="mt-2 text-xs text-red-500">
            Debes elegir un motivo para continuar con la solicitud.
          </p>
        )}
      </div>

      {/* Signos críticos */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Signos críticos (marca si aplica)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CRITICAL_FLAGS.map(flag => (
            <button
              key={flag.value}
              type="button"
              onClick={() => toggleCriticalFlag(flag.value)}
              className={`
                px-3 py-2 rounded-md text-sm border-2 transition-all
                ${currentCriticalFlags.includes(flag.value)
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>
      {/* Banner de prioridad alta */}
      {hasCriticalFlags && (
        <div className="bg-red-50 border-l-4 border-red-500 p-2 md:p-3 mb-4 rounded">
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs md:text-sm text-red-800 font-medium">
              Prioridad alta – se asignará el recurso más cercano
            </p>
          </div>
        </div>
      )}

      {/* Foto/video */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Foto/video (opcional)
        </label>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
            <FaCamera className="mr-2" />
            Subir imagen
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {Array.isArray(localTriage.attachments) && localTriage.attachments.length > 0 && (
            <span className="text-sm text-gray-600">
              {localTriage.attachments.length} archivo(s) seleccionado(s)
            </span>
          )}
        </div>
        {Array.isArray(localTriage.attachments) && localTriage.attachments.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {localTriage.attachments.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded overflow-hidden">
                <img src={url} alt={`Adjunto ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones adicionales
        </label>
        <textarea
          value={localTriage.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Describe brevemente el estado de tu mascota..."
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default TriageForm;

