import React from 'react';
import { FaHome, FaHospital } from 'react-icons/fa';

const AttentionTypeSelector = ({ mode, onChange, disabled }) => {
  const options = [
    { value: 'home', label: 'A domicilio', icon: FaHome, description: 'El veterinario va a tu ubicación' },
    { value: 'clinic', label: 'En clínica', icon: FaHospital, description: 'Visita una clínica cercana' }
  ];

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <label className="block text-sm md:text-base font-medium text-gray-700 mb-2 md:mb-3">
        Tipo de atención <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = mode === option.value;
          const isDisabled = disabled || option.disabled;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              className={`
                relative p-3 md:p-4 rounded-lg md:rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
              `}
            >
              <div className="flex flex-col items-center text-center">
                <Icon
                  className={`text-xl md:text-2xl mb-1 md:mb-2 ${
                    isSelected ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-sm md:text-base font-medium ${
                    isSelected ? 'text-blue-900' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </span>
                <span
                  className={`text-xs mt-0.5 md:mt-1 hidden md:block ${
                    isSelected ? 'text-blue-700' : 'text-gray-500'
                  }`}
                >
                  {option.description}
                </span>
              </div>
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AttentionTypeSelector;

