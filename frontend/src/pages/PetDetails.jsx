import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PetDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pet = location.state?.pet;

  if (!pet) {
    return <p className="p-6">No se proporcionaron datos de la mascota.</p>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <button
        className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full text-sm shadow"
        onClick={() => navigate(-1)}
      >
        ← Volver
      </button>
  
      <div className="bg-white p-6 rounded shadow-md max-w-xl mx-auto">
        <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-full border">
          <img
            src={pet.image || "/default-pet.jpg"}
            alt={pet.name}
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-xl font-semibold text-center mb-2">{pet.name}</h2>
        <p className="text-center text-gray-600">{pet.breed}</p>
        <p className="text-center text-gray-600">Género: {pet.gender}</p>
        <p className="text-center text-gray-600">Color: {pet.color}</p>
        <p className="mt-4 text-gray-700 text-center">
          {pet.description || "No hay descripción disponible."}
        </p>
      </div>
    </div>
  );
  
};

export default PetDetails;
