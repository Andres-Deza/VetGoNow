import React, { useState } from 'react';
import { FaCamera, FaExclamationTriangle } from 'react-icons/fa';

const REASON_OPTIONS = [
  {
    value: 'trauma',
    label: 'Golpe/Trauma',
    description: 'Caídas, atropellos, golpes fuertes',
    icon: '🚑'
  },
  {
    value: 'bleeding',
    label: 'Sangrado',
    description: 'Heridas visibles o sangrado interno',
    icon: '🩸'
  },
  {
    value: 'seizures',
    label: 'Convulsión',
    description: 'Movimientos involuntarios o pérdida de control',
    icon: '⚡'
  },
  {
    value: 'choking',
    label: 'Ahogo',
    description: 'Dificultad para respirar o tragar',
    icon: '😰'
  },
  {
    value: 'vomiting',
    label: 'Vómitos persistentes',
    description: 'Vómitos repetidos o con sangre',
    icon: '🤮'
  },
  {
    value: 'poisoning',
    label: 'Envenenamiento',
    description: 'Ingesta de tóxicos o sustancias peligrosas',
    icon: '☠️'
  },
  {
    value: 'fever',
    label: 'Fiebre alta',
    description: 'Temperatura corporal elevada o caliente al tacto',
    icon: '🌡️'
  },
  {
    value: 'urination',
    label: 'Retención urinaria',
    description: 'Dificultad o incapacidad para orinar',
    icon: '💧'
  },
  {
    value: 'pain',
    label: 'Dolor intenso',
    description: 'Quejidos, jadeos o dolor evidente',
    icon: '😣'
  },
  {
    value: 'other',
    label: 'Otro',
    description: 'No se ajusta a las categorías anteriores',
    icon: '❓'
  }
];

const AdditionalDetailsForm = ({ triage, onChange, clinic }) => {
  const [localTriage, setLocalTriage] = useState(triage || {
    mainReason: '',
    criticalFlags: [],
    notes: '',
    attachments: []
  });

  const handleChange = (field, value) => {
    const updated = { ...localTriage, [field]: value };
    setLocalTriage(updated);
    onChange(updated);
  };

  const handleReasonChange = (value) => {
    const updated = {
      ...localTriage,
      mainReason: value
    };
    setLocalTriage(updated);
    onChange(updated);
  };

  const toggleCriticalFlag = (flag) => {
    const flags = localTriage.criticalFlags.includes(flag)
      ? localTriage.criticalFlags.filter(f => f !== flag)
      : [...localTriage.criticalFlags, flag];
    handleChange('criticalFlags', flags);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const fileUrls = files.map(file => URL.createObjectURL(file));
    handleChange('attachments', [...localTriage.attachments, ...fileUrls]);
  };

  const removeAttachment = (index) => {
    const updated = localTriage.attachments.filter((_, i) => i !== index);
    handleChange('attachments', updated);
  };

  const hasCriticalFlags = localTriage.criticalFlags.length > 0;

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
          Detalles adicionales de la urgencia
        </h3>
        {clinic && (
          <p className="text-sm text-gray-600">
            Clínica seleccionada: <span className="font-semibold">{clinic.name}</span>
          </p>
        )}
      </div>

      {/* Motivo principal */}
      <div className="mb-4">
        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
          Categoría del malestar <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Selecciona la opción que mejor describe la urgencia de tu mascota.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
          {REASON_OPTIONS.map((option) => {
            const isSelected = localTriage.mainReason === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleReasonChange(option.value)}
                className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <p className="text-xs md:text-sm font-semibold text-gray-900">
                    {option.label}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-600 mt-1">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {!localTriage.mainReason && (
          <p className="mt-2 text-xs text-red-500">
            Debes elegir una categoría para continuar.
          </p>
        )}
      </div>

      {/* Signos críticos */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Signos críticos (marca si aplica)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { value: 'breathing', label: 'Dificultad respiratoria' },
            { value: 'active_bleeding', label: 'Sangrado activo' },
            { value: 'unconscious', label: 'Pérdida de conciencia' },
            { value: 'seizures', label: 'Convulsiones' },
            { value: 'cannot_stand', label: 'Incapacidad para ponerse de pie' }
          ].map(flag => (
            <button
              key={flag.value}
              type="button"
              onClick={() => toggleCriticalFlag(flag.value)}
              className={`
                px-3 py-2 rounded-md text-xs md:text-sm border-2 transition-all
                ${localTriage.criticalFlags.includes(flag.value)
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
          {localTriage.attachments.length > 0 && (
            <span className="text-sm text-gray-600">
              {localTriage.attachments.length} archivo(s) seleccionado(s)
            </span>
          )}
        </div>
        {localTriage.attachments.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {localTriage.attachments.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded overflow-hidden border border-gray-200">
                <img src={url} alt={`Adjunto ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones adicionales (opcional)
        </label>
        <textarea
          value={localTriage.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Describe brevemente el estado de tu mascota, síntomas, cuándo comenzaron, etc..."
          rows="4"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default AdditionalDetailsForm;

