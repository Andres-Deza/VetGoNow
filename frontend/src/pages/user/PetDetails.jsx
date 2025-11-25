import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PetAvatar from "../../components/PetAvatar";
import axios from "axios";

const dogBreeds = [
  "Mestizo",
  "Labrador Retriever",
  "Golden Retriever",
  "Pastor Alemán",
  "Bulldog Francés",
  "Bulldog Inglés",
  "Beagle",
  "Poodle",
  "Chihuahua",
  "Yorkshire Terrier",
  "Rottweiler",
  "Boxer",
  "Dachshund",
  "Siberian Husky",
  "Shih Tzu",
  "Border Collie",
  "Doberman",
  "Pomeranian",
  "Boston Terrier",
  "Maltés",
  "Cocker Spaniel",
  "Pug",
  "Schnauzer",
  "Dálmata",
  "Basset Hound",
  "Weimaraner",
  "Pointer",
  "Setter Irlandés",
];

const catBreeds = [
  "Doméstico de pelo corto (DSH)",
  "Doméstico de pelo largo (DLH)",
  "Abisinio",
  "American Wirehair",
  "Americano de pelo corto (ASH)",
  "Angora Turco",
  "Australian Mist",
  "Azul Ruso",
  "Bengalí",
  "Bombay",
  "British Shorthair",
  "Chartreux",
  "Cornish Rex",
  "Devon Rex",
  "Egipcio Mau",
  "Europeo de pelo corto",
  "Exótico de pelo corto",
  "Himalayo",
  "Maine Coon",
  "Manx",
  "Noruego de bosque",
  "Oriental",
  "Persa",
  "Ragdoll",
  "Scottish Fold",
  "Siamés",
  "Siberiano",
  "Singapura",
  "Somalí",
  "Sphynx",
];

const PetDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pet = location.state?.pet;
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [breedDropdownOpen, setBreedDropdownOpen] = useState(false);
  const [filteredBreeds, setFilteredBreeds] = useState([]);
  const breedInputRef = useRef(null);
  const breedDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    species: "Perro",
    breed: "",
    gender: "Macho",
    color: "",
    description: "",
    birthDate: "",
    ageYears: "",
    ageMonths: "",
    weight: "",
    image: "",
  });

  useEffect(() => {
    if (pet) {
      // Formatear fecha de nacimiento para el input
      const birthDateFormatted = pet.birthDate 
        ? new Date(pet.birthDate).toISOString().split('T')[0]
        : "";
      
      setFormData({
        name: pet.name || "",
        species: pet.species || "Perro",
        breed: pet.breed || "",
        gender: pet.gender || "Macho",
        color: pet.color || "",
        description: pet.description || "",
        birthDate: birthDateFormatted,
        ageYears: pet.ageYears?.toString() || "",
        ageMonths: pet.ageMonths?.toString() || "",
        weight: pet.weight?.toString() || "",
        image: pet.image || "",
      });

      // Inicializar razas filtradas según la especie
      const availableBreeds = pet.species === "Gato" ? catBreeds : dogBreeds;
      setFilteredBreeds(availableBreeds);
    }
  }, [pet]);

  useEffect(() => {
    const availableBreeds = formData.species === "Gato" ? catBreeds : dogBreeds;
    const searchTerm = formData.breed.trim().toLowerCase();

    if (searchTerm.length === 0) {
      setFilteredBreeds(availableBreeds);
    } else {
      setFilteredBreeds(
        availableBreeds.filter((breed) =>
          breed.toLowerCase().includes(searchTerm)
        )
      );
    }
  }, [formData.breed, formData.species]);

  useEffect(() => {
    if (!breedDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (
        breedDropdownRef.current &&
        !breedDropdownRef.current.contains(event.target) &&
        breedInputRef.current &&
        !breedInputRef.current.contains(event.target)
      ) {
        setBreedDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [breedDropdownOpen]);

  const calculateAgeFromBirthDate = (birthDate) => {
    if (!birthDate) return { years: null, months: null };
    
    const today = new Date();
    const birth = new Date(birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    
    return { years, months };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'birthDate' && value) {
      const { years, months } = calculateAgeFromBirthDate(value);
      setFormData({ 
        ...formData, 
        [name]: value,
        ageYears: years || '',
        ageMonths: months || ''
      });
    } else if (name === "breed") {
      setFormData({ ...formData, [name]: value });
      setBreedDropdownOpen(true);
    } else if ((name === 'ageYears' || name === 'ageMonths') && value) {
      setFormData({ ...formData, [name]: value, birthDate: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSpeciesSelect = (species) => {
    setFormData({
      ...formData,
      species,
      breed: formData.species === species ? formData.breed : "",
    });
    setFilteredBreeds(species === "Gato" ? catBreeds : dogBreeds);
    setBreedDropdownOpen(false);
  };

  const handleBreedSelect = (breed) => {
    setFormData({ ...formData, breed });
    setBreedDropdownOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No estás autenticado. Por favor inicia sesión.");
        setLoading(false);
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE || '';
      
      const petData = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        gender: formData.gender,
        weight: formData.weight && formData.weight.toString().trim() !== '' ? formData.weight : undefined,
        birthDate: formData.birthDate && formData.birthDate.trim() !== '' ? formData.birthDate : undefined,
        // Permitir 0 como valor válido (mascota de menos de un año)
        ageYears: formData.ageYears !== '' && formData.ageYears !== null && formData.ageYears !== undefined 
          ? (formData.ageYears === 0 ? 0 : parseFloat(formData.ageYears)) 
          : undefined,
        ageMonths: formData.ageMonths !== '' && formData.ageMonths !== null && formData.ageMonths !== undefined 
          ? (formData.ageMonths === 0 ? 0 : parseInt(formData.ageMonths)) 
          : undefined,
        ...(formData.image && formData.image.trim() !== '' && { image: formData.image }),
        ...(formData.color && formData.color.trim() !== '' && { color: formData.color }),
        ...(formData.description && formData.description.trim() !== '' && { description: formData.description }),
      };

      const response = await axios.put(
        `${API_BASE}/api/pets/${pet._id}`,
        petData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setIsEditing(false);
        // Actualizar el pet en el estado de navegación
        location.state.pet = response.data.pet;
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error updating pet:", error);
      setError(
        error.response?.data?.message ||
        "Error al actualizar la mascota. Por favor intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta mascota? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No estás autenticado. Por favor inicia sesión.");
        setLoading(false);
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE || '';

      const response = await axios.delete(
        `${API_BASE}/api/pets/${pet._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          // Redirigir a la página de mascotas
          navigate('/mypets');
        }, 1500);
      }
    } catch (error) {
      console.error("Error deleting pet:", error);
      setError(
        error.response?.data?.message ||
        "Error al eliminar la mascota. Por favor intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

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

      <div className="bg-white p-6 rounded shadow-md max-w-2xl mx-auto">
        {/* Mensajes de éxito y error */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            Mascota actualizada correctamente
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Botón de editar/guardar/eliminar */}
        <div className="flex justify-end gap-2 mb-4">
          {!isEditing ? (
            <>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Eliminar
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Editar
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                  // Restaurar datos originales
                  const birthDateFormatted = pet.birthDate 
                    ? new Date(pet.birthDate).toISOString().split('T')[0]
                    : "";
                  setFormData({
                    name: pet.name || "",
                    species: pet.species || "Perro",
                    breed: pet.breed || "",
                    gender: pet.gender || "Macho",
                    color: pet.color || "",
                    description: pet.description || "",
                    birthDate: birthDateFormatted,
                    ageYears: pet.ageYears?.toString() || "",
                    ageMonths: pet.ageMonths?.toString() || "",
                    weight: pet.weight?.toString() || "",
                    image: pet.image || "",
                  });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.name || !formData.species || !formData.breed || !formData.gender}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-32 h-32 mx-auto mb-4 relative group">
          <div className="w-32 h-32 overflow-hidden rounded-full border-2 border-gray-200">
            <PetAvatar
              image={formData.image || pet.image}
              species={formData.species || pet.species}
              name={formData.name || pet.name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Botón de editar foto solo visible en modo edición */}
          {isEditing && (
            <>
              <label
                htmlFor="pet-image-upload"
                className="absolute inset-0 w-32 h-32 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center z-10"
                title="Haz clic para cambiar la foto"
              >
                <div className="bg-white/90 rounded-full p-2 shadow-lg">
                  <svg
                    className="w-6 h-6 text-violet-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>
              </label>
              <input
                id="pet-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
            </>
          )}
        </div>

        {!isEditing ? (
          /* Vista de solo lectura */
          <div>
            <h2 className="text-xl font-semibold text-center mb-2">{pet.name}</h2>
            <p className="text-center text-gray-600">{pet.breed}</p>
            <p className="text-center text-gray-600">Género: {pet.gender}</p>
            {pet.color && <p className="text-center text-gray-600">Color: {pet.color}</p>}
            {pet.weight && <p className="text-center text-gray-600">Peso: {pet.weight} kg</p>}
            {pet.birthDate && (
              <p className="text-center text-gray-600">
                Fecha de nacimiento: {new Date(pet.birthDate).toLocaleDateString('es-ES')}
              </p>
            )}
            {(pet.ageYears !== undefined || pet.ageMonths !== undefined) && (
              <p className="text-center text-gray-600">
                Edad: {(() => {
                  const ageParts = [];
                  if (pet.ageYears !== undefined && pet.ageYears !== null && pet.ageYears > 0) {
                    ageParts.push(`${pet.ageYears} ${pet.ageYears === 1 ? 'año' : 'años'}`);
                  }
                  if (pet.ageMonths !== undefined && pet.ageMonths !== null && pet.ageMonths > 0) {
                    ageParts.push(`${pet.ageMonths} ${pet.ageMonths === 1 ? 'mes' : 'meses'}`);
                  }
                  if (ageParts.length === 0) {
                    return pet.birthDate ? 'Menos de un mes' : 'Edad no disponible';
                  }
                  return ageParts.join(' y ');
                })()}
              </p>
            )}
            <p className="mt-4 text-gray-700 text-center">
              {pet.description || "No hay descripción disponible."}
            </p>
          </div>
        ) : (
          /* Formulario de edición */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

            {/* Especie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Especie *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSpeciesSelect('Perro')}
                  className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                    formData.species === 'Perro'
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                  }`}
                >
                  Perro 🐶
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeciesSelect('Gato')}
                  className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                    formData.species === 'Gato'
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                  }`}
                >
                  Gato 🐱
                </button>
              </div>
            </div>

            {/* Género */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sexo *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, gender: 'Macho'})}
                  className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                    formData.gender === 'Macho'
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                  }`}
                >
                  Macho ♂
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, gender: 'Hembra'})}
                  className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                    formData.gender === 'Hembra'
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                  }`}
                >
                  Hembra ♀
                </button>
              </div>
            </div>

            {/* Raza */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Raza *</label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                onFocus={() => setBreedDropdownOpen(true)}
                required
                ref={breedInputRef}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              {breedDropdownOpen && (
                <div
                  ref={breedDropdownRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredBreeds.length > 0 ? (
                    filteredBreeds.map((breed, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleBreedSelect(breed)}
                        className="w-full px-4 py-2 text-left hover:bg-violet-50 hover:text-violet-700 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        {breed}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No encontramos coincidencias
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

            {/* Peso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (Kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              {formData.birthDate && (
                <p className="text-xs text-green-600 mt-1">
                  Edad calculada: {formData.ageYears || 0} años y {formData.ageMonths || 0} meses
                </p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

          </form>
        )}
      </div>

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar mascota?
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar a <strong>{pet.name}</strong>? Esta acción marcará la mascota como eliminada y no se mostrará en tu lista de mascotas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetDetails;
