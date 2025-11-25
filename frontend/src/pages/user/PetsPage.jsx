import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import axios from "axios";
import PetAvatar from "../../components/PetAvatar";

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

const PetsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const continueFlow = searchParams.get("continue") === "true";
  const fromEmergency = searchParams.get("from") === "emergency";
  const selectingEmergency = continueFlow || fromEmergency;
  const [user, setUser] = useState(null);
  const [pets, setPets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletePetId, setDeletePetId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(null);
  const [newPet, setNewPet] = useState({ 
    name: "", 
    image: "", 
    species: "Perro", 
    breed: "", 
    gender: "Macho", 
    color: "", 
    description: "",
    birthDate: "",
    ageYears: "",
    ageMonths: "",
    weight: ""
  });
  const [nameTouched, setNameTouched] = useState(false);
  const nameInputRef = useRef(null);
  const breedInputRef = useRef(null);
  const breedDropdownRef = useRef(null);
  const [breedDropdownOpen, setBreedDropdownOpen] = useState(false);
  const [filteredBreeds, setFilteredBreeds] = useState(dogBreeds);
  const [toast, setToast] = useState({ show: false, text: "" });
  const [errors, setErrors] = useState({});

  const redirectToLogin = (message = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.") => {
    setErrors({ general: message });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setTimeout(() => navigate("/login", { replace: true }), 1200);
  };

  const getValidToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      return null;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      if (now >= payload.exp) {
        return null;
      }
      return token;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const getStoredUser = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser || !storedUser.id) {
        return null;
      }
      return storedUser;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      setInitialLoading(false);
      redirectToLogin();
      return;
    }

    const storedUser = getStoredUser();
    if (!storedUser) {
      setInitialLoading(false);
      redirectToLogin("Usuario no encontrado. Por favor inicia sesión nuevamente.");
      return;
    }

    setUser(storedUser);
    fetchPets(storedUser.id);
  }, [navigate]);

  const fetchPets = async (userId) => {
    try {
      const token = getValidToken();
      if (!token) {
        setInitialLoading(false);
        redirectToLogin();
        return;
      }
      if (!userId) {
        console.error("❌ User ID is missing");
        setInitialLoading(false);
        return;
      }
      const res = await axios.get(`http://localhost:5555/api/pets/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPets(res.data);
    } catch (error) {
      console.error("Error fetching pets:", error.response?.data || error.message);
      if (error.response?.status === 401) {
        redirectToLogin();
      } else {
        setErrors({ general: "No pudimos cargar tus mascotas. Intenta nuevamente más tarde." });
      }
    } finally {
      setInitialLoading(false);
    }
  };

  // Autofocus cuando se abre el modal
  useEffect(() => {
    if (isModalOpen && nameInputRef.current) {
      // pequeño delay para asegurar render
      setTimeout(() => nameInputRef.current && nameInputRef.current.focus(), 50);
    }
  }, [isModalOpen]);

  useEffect(() => {
    const availableBreeds = newPet.species === "Gato" ? catBreeds : dogBreeds;
    const searchTerm = newPet.breed.trim().toLowerCase();

    if (searchTerm.length === 0) {
      setFilteredBreeds(availableBreeds);
    } else {
      setFilteredBreeds(
        availableBreeds.filter((breed) =>
          breed.toLowerCase().includes(searchTerm)
        )
      );
    }
  }, [newPet.breed, newPet.species]);

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

  // Cerrar menú de opciones al hacer clic fuera
  useEffect(() => {
    if (!showOptionsMenu) return;

    const handleClickOutside = (event) => {
      // Cerrar el menú si se hace clic fuera de él
      if (!event.target.closest('.options-menu-container')) {
        setShowOptionsMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOptionsMenu]);

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
    
    // Si el día del mes aún no ha llegado, ajustar
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
    if (name === 'name') setNameTouched(true);
    
    // Si cambia la fecha de nacimiento, calcular edad automáticamente
    if (name === 'birthDate' && value) {
      const { years, months } = calculateAgeFromBirthDate(value);
      setNewPet({ 
        ...newPet, 
        [name]: value,
        ageYears: years || '',
        ageMonths: months || ''
      });
    } else if (name === "breed") {
      setNewPet({ ...newPet, [name]: value });
      // NO abrir automáticamente - solo abrir cuando el usuario haga clic/focus
    } else {
      // Si se ingresa edad manualmente, limpiar fecha de nacimiento
      if ((name === 'ageYears' || name === 'ageMonths') && value) {
        setNewPet({ ...newPet, [name]: value, birthDate: '' });
      } else {
        setNewPet({ ...newPet, [name]: value });
      }
    }
  };

  const handleSpeciesSelect = (species) => {
    setNewPet((prev) => ({
      ...prev,
      species,
      breed: prev.species === species ? prev.breed : "",
    }));
    setFilteredBreeds(species === "Gato" ? catBreeds : dogBreeds);
    setBreedDropdownOpen(false);
  };

  const handleBreedInputFocus = () => {
    // NO abrir automáticamente al hacer focus
    // El dropdown solo se abrirá cuando el usuario haga clic explícitamente
  };

  const handleBreedInputClick = (e) => {
    // Solo abrir cuando el usuario hace clic explícitamente en el input
    e.stopPropagation();
    setBreedDropdownOpen(true);
  };

  const handleBreedInputChange = (e) => {
    // Cuando el usuario escribe, actualizar el valor y abrir el dropdown para mostrar resultados
    handleChange(e);
    clearFieldError('breed');
    // Solo abrir el dropdown si hay contenido o si el usuario está interactuando activamente
    if (e.target.value.length > 0) {
      setBreedDropdownOpen(true);
    }
  };

  const handleBreedSelect = (breed) => {
    setNewPet((prev) => ({ ...prev, breed }));
    setBreedDropdownOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPet({ ...newPet, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  // Función para limpiar error específico al cambiar un campo
  const clearFieldError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Función para limpiar todos los errores
  const clearAllErrors = () => {
    setErrors({});
  };

  // Función de validación
  const validateForm = () => {
    const newErrors = {};
    
    if (!newPet.name || newPet.name.trim() === '') {
      newErrors.name = 'El nombre es obligatorio';
    } else if (newPet.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (newPet.name.length > 30) {
      newErrors.name = 'El nombre no puede exceder 30 caracteres';
    }
    
    if (!newPet.species) {
      newErrors.species = 'La especie es obligatoria';
    }
    
    if (!newPet.breed || newPet.breed.trim() === '') {
      newErrors.breed = 'La raza es obligatoria';
    }
    
    if (!newPet.gender) {
      newErrors.gender = 'El género es obligatorio';
    }
    
    if (newPet.weight && (isNaN(newPet.weight) || Number(newPet.weight) <= 0)) {
      newErrors.weight = 'El peso debe ser un número positivo';
    }
    
    if (newPet.ageYears && (isNaN(newPet.ageYears) || Number(newPet.ageYears) < 0)) {
      newErrors.ageYears = 'Los años deben ser un número válido';
    }
    
    if (newPet.ageMonths && (isNaN(newPet.ageMonths) || Number(newPet.ageMonths) < 0 || Number(newPet.ageMonths) > 11)) {
      newErrors.ageMonths = 'Los meses deben estar entre 0 y 11';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPet = async (mode = 'stay') => {
    const token = getValidToken();
    const user = getStoredUser();
    if (!token || !user) {
      redirectToLogin();
      return;
    }

    // Validación de campos
    if (!validateForm()) {
      return;
    }

    try {
      // Filtrar campos opcionales vacíos antes de enviar
      const petData = {
        userId: user.id,
        name: newPet.name,
        species: newPet.species,
        breed: newPet.breed,
        gender: newPet.gender,
        weight: newPet.weight && newPet.weight.toString().trim() !== '' ? newPet.weight : undefined,
        birthDate: newPet.birthDate && newPet.birthDate.trim() !== '' ? newPet.birthDate : undefined,
        // Permitir 0 como valor válido (mascota de menos de un año)
        ageYears: newPet.ageYears !== '' && newPet.ageYears !== null && newPet.ageYears !== undefined 
          ? (newPet.ageYears === 0 ? 0 : parseFloat(newPet.ageYears)) 
          : undefined,
        ageMonths: newPet.ageMonths !== '' && newPet.ageMonths !== null && newPet.ageMonths !== undefined 
          ? (newPet.ageMonths === 0 ? 0 : parseInt(newPet.ageMonths)) 
          : undefined,
        // Campos opcionales: solo incluir si tienen valor
        ...(newPet.image && newPet.image.trim() !== '' && { image: newPet.image }),
        ...(newPet.color && newPet.color.trim() !== '' && { color: newPet.color }),
        ...(newPet.description && newPet.description.trim() !== '' && { description: newPet.description }),
      };
      
      const res = await axios.post(
        "http://localhost:5555/api/pets",
        petData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (res.data?.pet) {
        const created = res.data.pet;
        setPets((prevPets) => [...prevPets, created]);
        setNewPet({ 
          name: "", 
          image: "", 
          species: "Perro", 
          breed: "", 
          gender: "Macho", 
          color: "", 
          description: "",
          birthDate: "",
          ageYears: "",
          ageMonths: "",
          weight: ""
        });
        setNameTouched(false);
        if (mode === 'continue') {
          // Navegar a solicitud de urgencia
          navigate(`/emergency/request?petId=${created._id}`);
        } else {
          setIsModalOpen(false);
          setToast({ show: true, text: 'Mascota creada correctamente' });
          setTimeout(() => setToast({ show: false, text: '' }), 2500);
        }
      } else {
        console.error("Invalid response from server:", res);
        throw new Error("Invalid response from server.");
      }
    } catch (error) {
      console.error("Error adding pet:", error);
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (status === 401) {
        redirectToLogin();
        return;
      }

      const errorMessage = serverMessage || "Error al agregar la mascota.";
      setErrors({ general: errorMessage });
    }
  };

  const handleDeletePet = async () => {
    if (!deletePetId) return;
    const token = getValidToken();
    const user = getStoredUser();
    if (!token || !user) {
      redirectToLogin();
      return;
    }

    try {
      await axios.delete(`http://localhost:5555/api/pets/${deletePetId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPets((prevPets) => prevPets.filter((pet) => pet._id !== deletePetId));
      setDeletePetId(null);
    } catch (error) {
      console.error("Failed to delete pet:", error.response?.data || error.message);
      if (error.response?.status === 401) {
        redirectToLogin();
      } else {
        setErrors({ general: error.response?.data?.message || "Error al eliminar la mascota. Por favor intenta nuevamente." });
      }
    }
  };

  // Mostrar skeleton loader mientras carga inicialmente
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-4 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="h-10 bg-violet-500 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-5 bg-violet-500 rounded w-64 animate-pulse"></div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white px-4 py-5 rounded-2xl shadow-md w-full max-w-[260px] mx-auto">
                <div className="w-28 h-28 bg-gray-200 rounded-full mx-auto mb-3 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-full mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return user ? (
    <div className="min-h-screen bg-gray-50">
      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-6 md:pt-8 md:pb-10">
        {selectingEmergency && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 md:p-5 mb-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Selecciona la mascota para la urgencia</h3>
            <p className="text-sm md:text-base">
              Elige la mascota que requiere atención urgente. Te llevaremos al formulario de solicitud con sus datos.
            </p>
          </div>
        )}
        {/* Sección de Mascotas */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">Tus mascotas</h3>
          <button 
            className="text-violet-600 hover:text-violet-700 font-semibold text-sm md:text-base transition-colors"
            onClick={() => { setIsModalOpen(true); clearAllErrors(); }}
          >
            Agregar otra mascota
          </button>
        </div>

        {pets.length === 0 ? (
          /* Estado vacío */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 text-center">
            <div className="text-6xl md:text-8xl mb-4">🐾</div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No tienes mascotas registradas</h3>
            <p className="text-gray-600 mb-6">Agrega tu primera mascota para comenzar a usar nuestros servicios</p>
          </div>
        ) : (
          /* Grid de tarjetas de mascotas - mismo diseño que UserHome */
          <>
            {/* Versión móvil: lista vertical */}
            <div className="md:hidden space-y-4">
              {pets.map(p => {
              // Verificar si la ficha está incompleta
                const hasAge = p.ageYears !== undefined || p.ageMonths !== undefined;
                const hasBirthOrAge = p.birthDate || hasAge;
                const isIncomplete = !hasBirthOrAge || !p.weight || !p.gender;
              
              return (
            <div
                    key={p._id}
                    className="bg-white rounded-xl shadow-sm p-4 md:p-6 relative"
                  >
                    {/* Menú de opciones - Dropdown */}
                    <div className="absolute top-4 right-4">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                          setShowOptionsMenu(showOptionsMenu === p._id ? null : p._id);
                            }}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                      {showOptionsMenu === p._id && (
                        <div className="fixed md:absolute right-4 md:right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <button 
                              onClick={() => {
                                setShowOptionsMenu(null);
                                navigate('/mis-citas');
                              }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                              Citas
                            </button>
                            <button
                              onClick={() => {
                                setShowOptionsMenu(null);
                                // Implementar navegación a resultados
                              }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                              Resultados
                            </button>
                            <button
                              onClick={() => {
                                setShowOptionsMenu(null);
                              navigate('/pet-details', { state: { pet: p } });
                              }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-200"
                            >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar datos
                            </button>
                            <button
                              onClick={() => {
                                setShowOptionsMenu(null);
                              setDeletePetId(p._id);
                              }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-200"
                            >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                              Marcar fallecido
                            </button>
                          </div>
                        )}
                      </div>

                    {/* Avatar de mascota */}
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-yellow-100 border-4 border-white shadow-md -mt-8 mb-3">
                        <PetAvatar 
                          image={p.image} 
                          species={p.species} 
                          name={p.name} 
                          className="w-full h-full object-cover" 
                        />
                    </div>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{p.name}</h3>
                      
                      {/* Información completa */}
                      {p.species && p.weight && (p.birthDate || p.ageYears !== undefined || p.ageMonths !== undefined) ? (
                        <div className="w-full text-left px-4 mb-4 space-y-1">
                          <p className="text-sm md:text-base text-gray-700">{p.breed || p.species}</p>
                          <p className="text-sm md:text-base text-gray-700">
                            {(() => {
                              // Calcular edad desde birthDate si no están ageYears/ageMonths
                              let ageYears = p.ageYears;
                              let ageMonths = p.ageMonths;
                              
                              if ((ageYears === undefined || ageYears === null) && 
                                  (ageMonths === undefined || ageMonths === null) && 
                                  p.birthDate) {
                                const calculated = calculateAgeFromBirthDate(p.birthDate);
                                ageYears = calculated.years;
                                ageMonths = calculated.months;
                              }
                              
                              if (ageYears !== undefined && ageYears !== null && 
                                  ageMonths !== undefined && ageMonths !== null) {
                                const ageParts = [];
                                if (ageYears > 0) {
                                  ageParts.push(`${ageYears} ${ageYears === 1 ? 'año' : 'años'}`);
                                }
                                if (ageMonths > 0) {
                                  ageParts.push(`${ageMonths} ${ageMonths === 1 ? 'mes' : 'meses'}`);
                                }
                                return ageParts.length > 0 ? ageParts.join(' y ') : 'Menos de un mes';
                              }
                              return 'Edad no disponible';
                            })()}
                          </p>
                          {p.gender && <p className="text-sm md:text-base text-gray-700">{p.gender}</p>}
                      </div>
                      ) : (
                        <>
                          {/* Ficha incompleta warning */}
                          {isIncomplete && (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                                <span className="text-sm md:text-base font-semibold text-gray-900">Ficha incompleta</span>
                          </div>
                              <p className="text-sm text-gray-600 mb-4 text-center px-4">
                                Completa su información <span className="text-vet-secondary underline cursor-pointer" onClick={() => navigate('/pet-details', { state: { pet: p } })}>acá</span>
                              </p>
                            </>
                          )}
                        </>
                      )}

                      <div className="w-full space-y-2">
                        <button
                          onClick={() => navigate(`/emergency/request?petId=${p._id}`)}
                          className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Agendar urgencia
                        </button>
                        <button
                          onClick={() => navigate(`/agendar-cita?petId=${p._id}`)}
                          className="w-full px-6 py-3 bg-vet-accent text-white rounded-xl font-semibold hover:bg-vet-accent-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Agendar cita
                        </button>
                        <button
                          onClick={() => navigate(`/videoconsulta?petId=${p._id}`)}
                          className="w-full px-6 py-3 bg-vet-secondary text-white rounded-xl font-semibold hover:bg-vet-secondary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Agendar videoconsulta
                      </button>
                    </div>
                  </div>
                        </div>
                );
              })}
                        </div>
                        
            {/* Versión desktop: Grid de 2 columnas */}
            <div className="hidden md:grid md:grid-cols-2 gap-4">
              {pets.map(p => {
                // Verificar si la ficha está incompleta
                const hasAge = p.ageYears !== undefined || p.ageMonths !== undefined;
                const hasBirthOrAge = p.birthDate || hasAge;
                const isIncomplete = !hasBirthOrAge || !p.weight || !p.gender;
                
                return (
                  <div
                    key={p._id}
                    className="bg-white rounded-xl shadow-sm p-4 md:p-6 relative"
                  >
                    {/* Menú de opciones - Dropdown */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptionsMenu(showOptionsMenu === p._id ? null : p._id);
                        }}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {showOptionsMenu === p._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <button
                            onClick={() => {
                              setShowOptionsMenu(null);
                              navigate('/mis-citas');
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Citas
                          </button>
                          <button
                            onClick={() => {
                              setShowOptionsMenu(null);
                              // Implementar navegación a resultados
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Resultados
                          </button>
                          <button
                            onClick={() => {
                              setShowOptionsMenu(null);
                              navigate('/pet-details', { state: { pet: p } });
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar datos
                          </button>
                          <button
                            onClick={() => {
                              setShowOptionsMenu(null);
                              setDeletePetId(p._id);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Marcar fallecido
                          </button>
                        </div>
                      )}
                        </div>
                        
                    {/* Avatar de mascota */}
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-yellow-100 border-4 border-white shadow-md -mt-8 mb-3">
                        <PetAvatar 
                          image={p.image} 
                          species={p.species} 
                          name={p.name} 
                          className="w-full h-full object-cover" 
                        />
                        </div>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{p.name}</h3>
                      
                      {/* Información completa */}
                      {p.species && p.weight && (p.birthDate || p.ageYears !== undefined || p.ageMonths !== undefined) ? (
                        <div className="w-full text-left px-4 mb-4 space-y-1">
                          <p className="text-sm md:text-base text-gray-700">{p.breed || p.species}</p>
                          <p className="text-sm md:text-base text-gray-700">
                            {(() => {
                              // Calcular edad desde birthDate si no están ageYears/ageMonths
                              let ageYears = p.ageYears;
                              let ageMonths = p.ageMonths;
                              
                              if ((ageYears === undefined || ageYears === null) && 
                                  (ageMonths === undefined || ageMonths === null) && 
                                  p.birthDate) {
                                const calculated = calculateAgeFromBirthDate(p.birthDate);
                                ageYears = calculated.years;
                                ageMonths = calculated.months;
                              }
                              
                              if (ageYears !== undefined && ageYears !== null && 
                                  ageMonths !== undefined && ageMonths !== null) {
                                const ageParts = [];
                                if (ageYears > 0) {
                                  ageParts.push(`${ageYears} ${ageYears === 1 ? 'año' : 'años'}`);
                                }
                                if (ageMonths > 0) {
                                  ageParts.push(`${ageMonths} ${ageMonths === 1 ? 'mes' : 'meses'}`);
                                }
                                return ageParts.length > 0 ? ageParts.join(' y ') : 'Menos de un mes';
                              }
                              return 'Edad no disponible';
                            })()}
                          </p>
                          {p.gender && <p className="text-sm md:text-base text-gray-700">{p.gender}</p>}
                        </div>
                      ) : (
                        <>
                          {/* Ficha incompleta warning */}
                          {isIncomplete && (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm md:text-base font-semibold text-gray-900">Ficha incompleta</span>
                        </div>
                              <p className="text-sm text-gray-600 mb-4 text-center px-4">
                                Completa su información <span className="text-vet-secondary underline cursor-pointer" onClick={() => navigate('/pet-details', { state: { pet: p } })}>acá</span>
                              </p>
                            </>
                          )}
                        </>
                      )}
                      
                      <div className="w-full space-y-2">
                        <button
                          onClick={() => navigate(`/emergency/request?petId=${p._id}`)}
                          className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Agendar urgencia
                        </button>
                        <button
                          onClick={() => navigate(`/agendar-cita?petId=${p._id}`)}
                          className="w-full px-6 py-3 bg-vet-accent text-white rounded-xl font-semibold hover:bg-vet-accent-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Agendar cita
                        </button>
                        <button
                          onClick={() => navigate(`/videoconsulta?petId=${p._id}`)}
                          className="w-full px-6 py-3 bg-vet-secondary text-white rounded-xl font-semibold hover:bg-vet-secondary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Agendar videoconsulta
                        </button>
                        </div>
              </div>
                </div>
              );
            })}
        </div>
          </>
        )}

        {/* Sección de Profesionales */}
        {pets.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Tus profesionales</h3>
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                Aún no tienes profesionales preferidos.<br />
                Puedes agendar una cita con una de tus<br className="hidden md:block" />
                mascotas para comenzar.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {deletePetId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Confirmar Eliminación</h3>
            <p>¿Estás seguro de que quieres eliminar esta mascota?</p>
            <div className="flex justify-end space-x-2 mt-4">
              <button className="bg-gray-500 text-white px-4 py-2 rounded-md" onClick={() => setDeletePetId(null)}>Cancelar</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded-md" onClick={handleDeletePet}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {toast.show && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast.text}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
          {/* Header morado estilo referencia */}
          <div className="bg-violet-600 text-white px-4 md:px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-white p-2 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg md:text-xl font-bold text-center flex-1">Crear mascota</h3>
            <div className="w-10"></div> {/* Spacer para centrar */}
          </div>

          {/* Formulario estilo referencia */}
          <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
            <div className="space-y-5 md:space-y-6">
              {/* Mensaje de error general */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              )}

              {/* 1. Nombre */}
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Nombre"
                  value={newPet.name}
                  onChange={(e) => {
                    handleChange(e);
                    clearFieldError('name');
                  }}
                  onBlur={() => setNameTouched(true)}
                  ref={nameInputRef}
                  className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.name
                      ? 'border-red-400 focus:ring-red-300' 
                      : 'border-gray-300 focus:ring-violet-300'
                  }`}
                />
                {errors.name && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-600">{errors.name}</p>
                  </div>
                )}
              </div>

              {/* 2. Especie - Botones estilo referencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Especie</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSpeciesSelect('Perro')}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.species === 'Perro'
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                    }`}
                  >
                    Perro 🐶
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeciesSelect('Gato')}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.species === 'Gato'
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                    }`}
                  >
                    Gato 🐱
                  </button>
                </div>
              </div>

              {/* 3. Género - Botones estilo referencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Sexo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPet({...newPet, gender: 'Macho'})}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.gender === 'Macho'
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                    }`}
                  >
                    Macho ♂
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPet({...newPet, gender: 'Hembra'})}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.gender === 'Hembra'
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                    }`}
                  >
                    Hembra ♀
                  </button>
                </div>
              </div>

              {/* 4. Raza - Select con autocompletado */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raza <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="breed"
                  placeholder="Buscar o escribir raza"
                  value={newPet.breed}
                  onChange={handleBreedInputChange}
                  onClick={handleBreedInputClick}
                  onFocus={handleBreedInputFocus}
                  autoComplete="off"
                  ref={breedInputRef}
                  className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.breed
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-gray-300 focus:ring-violet-300'
                  }`}
                  required
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
                        No encontramos coincidencias, prueba con otra búsqueda.
                      </div>
                    )}
                  </div>
                )}
                {errors.breed && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-600">{errors.breed}</p>
                  </div>
                )}
              </div>

              {/* 5. Color */}
              <div>
                <input
                  type="text"
                  name="color"
                  placeholder="Color"
                  value={newPet.color}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* 6. Peso */}
              <div>
                <input
                  type="number"
                  name="weight"
                  placeholder="Peso (Kg)"
                  min="0"
                  step="0.1"
                  value={newPet.weight}
                  onChange={(e) => {
                    handleChange(e);
                    clearFieldError('weight');
                  }}
                  className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.weight
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-gray-300 focus:ring-violet-300'
                  }`}
                />
                {errors.weight && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-600">{errors.weight}</p>
                  </div>
                )}
              </div>

              {/* 7. Fecha de nacimiento */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">Fecha de nacimiento (aproximada)</label>
                <input
                  type="date"
                  name="birthDate"
                  value={newPet.birthDate}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                {newPet.birthDate && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Edad calculada: {newPet.ageYears || 0} años y {newPet.ageMonths || 0} meses
                  </p>
                )}
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Foto de la mascota</label>
                <div className="flex items-center gap-3">
                  {newPet.image && (
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-violet-200 flex-shrink-0">
                      <img src={newPet.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-violet-300 transition-colors text-center text-gray-600 hover:text-violet-600">
                      {newPet.image ? 'Cambiar foto' : 'Seleccionar foto'}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Botón Continuar estilo referencia */}
            <div className="mt-8 pb-6">
              <button
                disabled={!newPet.name || !newPet.species || !newPet.breed || !newPet.gender}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                  newPet.name && newPet.species && newPet.breed && newPet.gender
                    ? 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 active:scale-95'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                onClick={() => handleAddPet('continue')}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver imagen en grande */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            {/* Botón cerrar */}
            <button
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              onClick={() => setShowImageModal(false)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Imagen */}
            <img
              src={selectedImage}
              alt="Vista ampliada"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  ) : null;
};

export default PetsPage;
