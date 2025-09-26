import React from 'react';
import VetMap from '../components/VetMap';

const VetMapPage = () => {
  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-4">Mapa de Veterinarios</h1>
      <p className="text-sm text-gray-600 mb-4">Filtra y visualiza veterinarios cercanos según los servicios ofrecidos.</p>
      <VetMap />
    </div>
  );
};

export default VetMapPage;
