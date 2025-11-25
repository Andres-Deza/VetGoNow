import React from 'react';
import VetCard from './VetCard';

const VetList = ({ vets = [] }) => {
  if (!vets.length) {
    return (
      <div className="w-full text-center text-gray-600 py-10">
        No se encontraron veterinarios con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {vets.map((v) => (
        <VetCard key={v._id} vet={v} />
      ))}
    </div>
  );
};

export default VetList;
