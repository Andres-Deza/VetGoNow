import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit } from 'react-icons/fa';

const PetHeader = ({ pet, onEdit }) => {
  const navigate = useNavigate();

  if (!pet) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">Por favor selecciona una mascota</p>
        <button
          onClick={() => navigate('/mypets?continue=true&from=emergency')}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Agregar mascota
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Foto de la mascota */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {pet.image ? (
            <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl md:text-2xl">
              🐾
            </div>
          )}
        </div>

        {/* Información de la mascota */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">{pet.name}</h3>
              <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                {pet.species || 'N/A'} • {pet.breed} • {pet.gender === 'Male' || pet.gender === 'Macho' ? 'Macho' : 'Hembra'}
                {pet.weight && ` • ${pet.weight} kg`}
                {pet.ageYears && ` • ${pet.ageYears} años`}
              </p>
              {pet.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pet.description}</p>
              )}
            </div>
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800 p-2 flex-shrink-0"
              title="Editar mascota"
            >
              <FaEdit className="text-sm md:text-base" />
            </button>
          </div>

          {/* Badges de alerta (si aplica) */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {/* Estos badges se pueden obtener del historial médico de la mascota */}
            {/* Por ahora solo mostramos ejemplos */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetHeader;

