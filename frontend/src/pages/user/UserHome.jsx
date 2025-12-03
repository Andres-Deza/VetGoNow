import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import PetAvatar from '../../components/PetAvatar';
import RatingModal from '../../components/RatingModal';

const UserHome = () => {
  const [user, setUser] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loadingEmergency, setLoadingEmergency] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [breedDropdownOpen, setBreedDropdownOpen] = useState(false);
  const [filteredBreeds, setFilteredBreeds] = useState([]);
  const breedInputRef = useRef(null);
  const breedDropdownRef = useRef(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingAppointment, setRatingAppointment] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const navigate = useNavigate();

  // Razas de perros
  const dogBreeds = [
    'Mestizo',
    'Labrador Retriever',
    'Golden Retriever',
    'Pastor Alemán',
    'Bulldog Francés',
    'Bulldog Inglés',
    'Beagle',
    'Poodle',
    'Chihuahua',
    'Yorkshire Terrier',
    'Rottweiler',
    'Boxer',
    'Dachshund',
    'Siberian Husky',
    'Shih Tzu',
    'Border Collie',
    'Doberman',
    'Pomeranian',
    'Boston Terrier',
    'Maltés',
    'Cocker Spaniel',
    'Pug',
    'Schnauzer',
    'Dálmata',
    'Basset Hound',
    'Weimaraner',
    'Pointer',
    'Setter Irlandés',
  ];

  // Razas de gatos
  const catBreeds = [
    'Doméstico de pelo corto (DSH)',
    'Doméstico de pelo largo (DLH)',
    'Abisinio',
    'American Wirehair',
    'Americano de pelo corto (ASH)',
    'Angora Turco',
    'Australian Mist',
    'Azul Ruso',
    'Bengalí',
    'Bombay',
    'British Shorthair',
    'Chartreux',
    'Cornish Rex',
    'Devon Rex',
    'Egipcio Mau',
    'Europeo de pelo corto',
    'Exótico de pelo corto',
    'Himalayo',
    'Maine Coon',
    'Manx',
    'Noruego de bosque',
    'Oriental',
    'Persa',
    'Ragdoll',
    'Scottish Fold',
    'Siamés',
    'Siberiano',
    'Singapura',
    'Somalí',
    'Sphynx',
  ];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser && storedUser.id) {
      setUser(storedUser);
      (async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const { data } = await axios.get(`${API_BASE}/api/pets/user/${storedUser.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPets(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Error loading pets:', e);
          // Si es error 401, el token expiró
          if (e.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }
          // Para otros errores, solo log (las mascotas no son críticas en el home)
          setPets([]);
        } finally { setLoading(false); }
      })();
    }
  }, [API_BASE, navigate]);

  useEffect(() => {
    const fetchActiveEmergency = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingEmergency(false);
        return;
      }

      try {
        const { data } = await axios.get(`${API_BASE}/api/emergency/user-active`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(data?.emergencies) && data.emergencies.length > 0) {
          setActiveEmergency(data.emergencies[0]);
        } else if (data?.emergency) {
          setActiveEmergency(data.emergency);
        } else {
          setActiveEmergency(null);
        }
      } catch (error) {
        console.error('Error cargando urgencias activas:', error);
        setActiveEmergency(null);
      } finally {
        setLoadingEmergency(false);
      }
    };

    fetchActiveEmergency();
  }, [API_BASE]);

  // Conectar al socket para escuchar eventos de cancelación
  useEffect(() => {
      const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!token || !storedUser) return;

    const socket = io(`${API_BASE}/emergency`, {
      transports: ['websocket'],
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Conectado al socket de emergencias en UserHome');
      socket.emit('join:user', storedUser.id);
    });

    // Escuchar cuando se cancela la emergencia
    socket.on('emergency:cancelled', (data) => {
      console.log('Emergencia cancelada:', data);
      setActiveEmergency((prev) => {
        if (prev && (
          prev.id === data.emergencyId ||
          prev._id === data.emergencyId ||
          prev.requestId === data.emergencyId
        )) {
          return null;
        }
        return prev;
      });
    });

    socket.on('emergency:no-vets', (data) => {
      console.log('No hay veterinarios disponibles:', data);
      setActiveEmergency((prev) => {
        if (prev && (
          prev.id === data.emergencyId ||
          prev._id === data.emergencyId ||
          prev.requestId === data.emergencyId
        )) {
          return null;
        }
        return prev;
      });
    });

    socket.on('emergency:completed', (data) => {
      console.log('Urgencia completada:', data);
      setActiveEmergency((prev) => {
        if (prev && (
          prev.id === data.appointmentId ||
          prev._id === data.appointmentId ||
          prev.requestId === data.appointmentId
        )) {
          return null;
        }
        return prev;
      });
    });

    socket.on('status:updated', (data) => {
      if (data.status === 'completed') {
        console.log('Estado actualizado a completado:', data);
        setActiveEmergency(null);
      }
    });

    return () => {
      socket.off('emergency:cancelled');
      socket.off('emergency:no-vets');
      socket.off('emergency:completed');
      socket.off('status:updated');
      socket.disconnect();
    };
  }, [API_BASE]);

  // Fetch unrated completed appointments for reminder
  useEffect(() => {
    const fetchUnratedAppointments = async () => {
      const token = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !storedUser) return;

      try {
        const { data } = await axios.get(`${API_BASE}/api/appointments/unrated-completed`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Mostrar recordatorio solo si hay citas sin calificar y no se ha mostrado antes
        if (data.success && data.appointments && data.appointments.length > 0) {
          // Mostrar recordatorio solo para la primera cita sin calificar
          const firstUnrated = data.appointments[0];
          setRatingAppointment({
            appointmentId: firstUnrated._id,
            vetId: firstUnrated.vetId?._id || firstUnrated.vetId,
            petId: firstUnrated.petId?._id || firstUnrated.petId,
            vetName: firstUnrated.vetId?.name || 'Veterinario',
            vetRating: firstUnrated.vetId?.ratings?.average && firstUnrated.vetId?.ratings?.total >= 5 
              ? firstUnrated.vetId.ratings.average 
              : null,
            petName: firstUnrated.petId?.name || 'Mascota',
            appointmentDate: firstUnrated.appointmentDate || firstUnrated.date,
            scheduledTime: firstUnrated.scheduledTime
          });
          setShowRatingModal(true);
          
          // Marcar recordatorio como mostrado
          await axios.put(
            `${API_BASE}/api/appointments/${firstUnrated._id}/rating-reminder-shown`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (error) {
        console.error('Error fetching unrated appointments:', error);
      }
    };

    // Solo verificar cuando el usuario entra a la plataforma
    fetchUnratedAppointments();
  }, [API_BASE]);

  const goMap = () => navigate('/agendar-cita');
  const goTele = () => navigate('/videoconsulta');
  const goRecords = () => navigate('/client/history');
  const goEmergencyTracking = (requestId) =>
    navigate(`/emergency/${requestId}/tracking`);
  const goConversation = (conversationId) =>
    navigate(`/conversations/${conversationId}`);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value ?? 0);
  const openAddPetModal = () => setIsModalOpen(true);
  const closeAddPetModal = () => {
    setIsModalOpen(false);
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
  };

  // Auto-focus cuando se abre el modal
  useEffect(() => {
    if (isModalOpen && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  // Filtrar razas según el input y la especie seleccionada
  useEffect(() => {
    const availableBreeds = newPet.species === 'Gato' ? catBreeds : dogBreeds;
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
      setBreedDropdownOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPet.breed, newPet.species]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        breedDropdownRef.current &&
        !breedDropdownRef.current.contains(event.target) &&
        breedInputRef.current &&
        !breedInputRef.current.contains(event.target)
      ) {
        setBreedDropdownOpen(false);
      }

      // Cerrar menú de 3 puntos si se hace click fuera
      if (openMenuId !== null) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target)) {
          setOpenMenuId(null);
        }
      }
    };

    if (breedDropdownOpen || openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [breedDropdownOpen, openMenuId]);

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
    if (name === 'name') setNameTouched(true);
    
    if (name === 'birthDate' && value) {
      const { years, months } = calculateAgeFromBirthDate(value);
      setNewPet({ 
        ...newPet, 
        [name]: value,
        ageYears: years || '',
        ageMonths: months || ''
      });
    } else if (name === 'breed') {
      setNewPet({ ...newPet, [name]: value });
    } else {
      if ((name === 'ageYears' || name === 'ageMonths') && value) {
        setNewPet({ ...newPet, [name]: value, birthDate: '' });
      } else {
        setNewPet({ ...newPet, [name]: value });
      }
    }
  };

  const handleBreedSelect = (breed) => {
    setNewPet({ ...newPet, breed });
    setBreedDropdownOpen(false);
    if (breedInputRef.current) {
      breedInputRef.current.blur();
    }
  };

  const handleBreedInputFocus = () => {
    setBreedDropdownOpen(true);
  };

  const handleSpeciesSelect = (species) => {
    setNewPet((prev) => ({
      ...prev,
      species,
      breed: prev.species === species ? prev.breed : '',
    }));
    setFilteredBreeds(species === 'Gato' ? catBreeds : dogBreeds);
    setBreedDropdownOpen(false);
  };

  const togglePetMenu = (petId, event) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === petId ? null : petId);
  };

  const handleEditPet = (pet) => {
    setOpenMenuId(null);
    navigate('/pet-details', { state: { pet } });
  };

  const handleViewResults = (pet) => {
    setOpenMenuId(null);
    // Redirigir a documentos/prescriptiones de la mascota
    navigate('/client/history', { state: { petId: pet._id } });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPet({ ...newPet, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleAddPet = async () => {
    if (!user || !user.id) {
      alert("Usuario no autenticado. Por favor inicia sesión nuevamente.");
      navigate("/login");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Sesión expirada. Por favor inicia sesión nuevamente.");
      navigate("/login");
      return;
    }

    // Validación de campos obligatorios (solo los realmente obligatorios)
    if (!newPet.name || !newPet.species || !newPet.breed || !newPet.gender) {
      alert("Por favor completa todos los campos obligatorios: Nombre, Especie, Raza y Género.");
      return;
    }

    try {
      // Filtrar campos opcionales vacíos antes de enviar
      const petData = {
        userId: user.id,
        name: newPet.name.trim(),
        species: newPet.species,
        breed: newPet.breed.trim(),
        gender: newPet.gender,
        // Campos opcionales: solo incluir si tienen valor
        // Permitir 0 como valor válido para edad (mascota de menos de un año)
        ...(newPet.weight && newPet.weight.toString().trim() !== '' && { weight: newPet.weight }),
        ...(newPet.birthDate && newPet.birthDate.trim() !== '' && { birthDate: newPet.birthDate }),
        ...(newPet.ageYears !== '' && newPet.ageYears !== null && newPet.ageYears !== undefined 
          ? { ageYears: newPet.ageYears === 0 ? 0 : parseFloat(newPet.ageYears) } 
          : {}),
        ...(newPet.ageMonths !== '' && newPet.ageMonths !== null && newPet.ageMonths !== undefined 
          ? { ageMonths: newPet.ageMonths === 0 ? 0 : parseInt(newPet.ageMonths) } 
          : {}),
        ...(newPet.image && newPet.image.trim() !== '' && { image: newPet.image }),
        ...(newPet.color && newPet.color.trim() !== '' && { color: newPet.color }),
        ...(newPet.description && newPet.description.trim() !== '' && { description: newPet.description }),
      };
      
      console.log("Enviando datos de mascota:", petData); // Debug
      
      const res = await axios.post(
        `${API_BASE}/api/pets`,
        petData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      
      if (res.data?.pet) {
        const created = res.data.pet;
        setPets((prevPets) => [...prevPets, created]);
        closeAddPetModal();
        // Mostrar mensaje de éxito
        alert("¡Mascota agregada correctamente!");
      } else {
        throw new Error("Invalid response from server.");
      }
    } catch (error) {
      console.error("Error adding pet:", error);
      console.error("Error response:", error.response?.data); // Debug adicional
      console.error("Error code:", error.code); // Network error code
      console.error("Error message:", error.message); // Network error message
      
      // Manejar diferentes tipos de errores
      let errorMessage = "Error al agregar la mascota.";
      
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMessage = "Error de conexión. Por favor verifica que el servidor esté corriendo e intenta nuevamente.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-14 md:mt-0">
      {/* Header de bienvenida - Solo en móvil - Pegado al navbar */}
      <div className="md:hidden bg-tutor-sidebar text-white px-4 py-4 pt-[4.5rem]">
        <div>
          <p className="text-sm text-tutor-sidebar-active opacity-90">¡Bienvenid@!</p>
          <h1 className="text-xl font-bold">{user?.name || 'Usuario'}</h1>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-6 md:pt-8 md:pb-10">

        {!loadingEmergency && activeEmergency && (
          <div className="mb-6 bg-tutor-sidebar text-white rounded-2xl p-5 md:p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-tutor-sidebar-active opacity-90">
                  Urgencia en curso
                </p>
                <h2 className="text-xl md:text-2xl font-semibold mt-1">
                  {activeEmergency.pet?.name || 'Mascota'}
                </h2>
                <p className="text-sm text-tutor-sidebar-light opacity-90 mt-2">
                  Seguimiento disponible. Confirma la llegada del veterinario o comparte más información mientras esperas.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={() =>
                    goEmergencyTracking(
                      activeEmergency.requestId ||
                        activeEmergency.id ||
                        activeEmergency._id
                    )
                  }
                  className="px-4 py-2 bg-white text-tutor-sidebar font-semibold rounded-xl shadow hover:bg-vet-gray-light transition"
                >
                  Ver seguimiento
                </button>
                {activeEmergency.conversationId && (
                  <button
                    onClick={() => goConversation(activeEmergency.conversationId)}
                    className="px-4 py-2 bg-white/10 border border-white/40 text-white font-semibold rounded-xl hover:bg-white/20 transition"
                  >
                    Abrir chat
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm">
              <div>
                <p className="text-tutor-sidebar-light opacity-90 uppercase tracking-wide text-xs">
                  Estado
                </p>
                <p className="font-medium">
                  {activeEmergency.status === 'on-way'
                    ? 'Veterinario en camino'
                    : activeEmergency.status === 'arrived'
                    ? 'El veterinario ha llegado'
                    : activeEmergency.status === 'in-service'
                    ? 'Atención en progreso'
                    : activeEmergency.status === 'completed'
                    ? 'Finalizada'
                    : 'Coordinando veterinario'}
                </p>
              </div>
              <div>
                <p className="text-tutor-sidebar-light opacity-90 uppercase tracking-wide text-xs">
                  Costo estimado
                </p>
                <p className="font-medium">
                  {formatCurrency(activeEmergency.pricing?.total)}
                </p>
              </div>
              <div>
                <p className="text-tutor-sidebar-light opacity-90 uppercase tracking-wide text-xs">
                  Veterinario asignado
                </p>
                <p className="font-medium">
                  {activeEmergency.vet?.name || 'Por confirmar'}
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Sección Tus Mascotas - Estilo referencia */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Tus mascotas</h2>
            {pets.length > 0 && (
              <button 
                onClick={openAddPetModal}
                className="text-tutor-sidebar text-sm md:text-base font-medium hover:text-tutor-sidebar-dark"
              >
                Agregar otra mascota
              </button>
            )}
          </div>

          {pets.length === 0 ? (
            <button 
              onClick={openAddPetModal}
              className="w-full bg-white rounded-xl shadow-sm p-6 md:p-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-tutor-sidebar transition-all active:scale-95"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-200 text-gray-600 text-3xl md:text-4xl flex items-center justify-center mb-3">+</div>
              <span className="text-sm md:text-base text-gray-600 font-medium">Agregar mascota</span>
            </button>
          ) : (
            <>
              {/* Versión móvil: Carrusel horizontal */}
              <div className="md:hidden -mx-4 px-4 pt-4 overflow-x-auto scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                <div className="flex gap-4 pb-2">
                  {pets.map(p => (
                    <div
                      key={p._id}
                      className="bg-white rounded-xl shadow-sm p-4 relative flex-shrink-0 w-[calc(100vw-2rem)] max-w-[320px]"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      {/* Menú de opciones - Dropdown */}
                      <div className="absolute top-4 right-4" ref={el => menuRefs.current[p._id] = el}>
                        <button
                          onClick={(e) => togglePetMenu(p._id, e)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openMenuId === p._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <button
                              onClick={() => handleViewResults(p)}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Resultados
                            </button>
                            <button
                              onClick={() => handleEditPet(p)}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Editar datos
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Avatar de mascota */}
                      <div className="flex flex-col items-center mb-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-yellow-100 border-4 border-white shadow-md -mt-8 mb-3">
                          <PetAvatar 
                            image={p.image} 
                            species={p.species} 
                            name={p.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{p.name}</h3>
                        
                        {/* Información completa */}
                        {p.species && p.weight && (p.birthDate || p.ageYears !== undefined || p.ageMonths !== undefined) ? (
                          <div className="w-full text-left px-4 mb-4 space-y-1">
                            <p className="text-sm text-gray-700">{p.breed || p.species}</p>
                            <p className="text-sm text-gray-700">
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
                            {p.gender && <p className="text-sm text-gray-700">{p.gender}</p>}
                          </div>
                        ) : (
                          <>
                            {/* Ficha incompleta warning */}
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-semibold text-gray-900">Ficha incompleta</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4 text-center px-4">
                              Completa su información <span className="text-tutor-sidebar underline cursor-pointer" onClick={() => navigate('/pet-details', { state: { pet: p } })}>acá</span>
                            </p>
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
                            className="w-full px-6 py-3 bg-tutor-btn-secondary text-white rounded-xl font-semibold hover:bg-tutor-btn-secondary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Agendar videoconsulta
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
        </div>
      </div>

              {/* Versión desktop: Grid de 2 columnas */}
              <div className="hidden md:grid md:grid-cols-2 gap-4">
          {pets.map(p => (
                  <div
                    key={p._id}
                    className="bg-white rounded-xl shadow-sm p-4 md:p-6 relative"
                  >
                    {/* Menú de opciones - Dropdown */}
                    <div className="absolute top-4 right-4" ref={el => menuRefs.current[p._id] = el}>
                      <button
                        onClick={(e) => togglePetMenu(p._id, e)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {openMenuId === p._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <button
                            onClick={() => handleViewResults(p)}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Resultados
                          </button>
                          <button
                            onClick={() => handleEditPet(p)}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 border-t border-gray-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar datos
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
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm md:text-base font-semibold text-gray-900">Ficha incompleta</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4 text-center px-4">
                            Completa su información <span className="text-tutor-sidebar underline cursor-pointer" onClick={() => navigate('/pet-details', { state: { pet: p } })}>acá</span>
                          </p>
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
                          className="w-full px-6 py-3 bg-tutor-btn-secondary text-white rounded-xl font-semibold hover:bg-tutor-btn-secondary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Agendar videoconsulta
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {loading && <p className="text-sm text-gray-500 mt-2 text-center">Cargando mascotas...</p>}
        </div>

        {/* Sección Tus Profesionales - Estilo referencia */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Tus profesionales</h2>
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 mb-4">
              <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM10 11a5 5 0 00-5 5v2a1 1 0 001 1h8a1 1 0 001-1v-2a5 5 0 00-5-5z" />
              </svg>
            </div>
            <p className="text-base md:text-lg text-gray-900 mb-2">Aún no tienes profesionales preferidos.</p>
            <p className="text-sm md:text-base text-gray-600">
              Puedes agendar una cita con una de tus mascotas para comenzar.
            </p>
          </div>
        </div>
      </div>

      {/* Modal para agregar mascota */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white overflow-y-auto">
          {/* Header estilo referencia */}
          <div className="bg-tutor-sidebar text-white px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <button
              onClick={closeAddPetModal}
              className="text-white p-2 hover:bg-tutor-sidebar-hover rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg md:text-xl font-bold text-center flex-1">Crear mascota</h3>
            <div className="w-10"></div> {/* Spacer para centrar */}
          </div>

          {/* Formulario estilo referencia */}
          <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full pb-24">
            <div className="space-y-5 md:space-y-6">
              {/* 1. Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Nombre"
                  value={newPet.name}
                  onChange={handleChange}
                  onBlur={() => setNameTouched(true)}
                  ref={nameInputRef}
                  className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    !newPet.name && nameTouched 
                      ? 'border-red-400 focus:ring-red-300' 
                      : 'border-gray-300 focus:ring-vet-secondary-light'
                  }`}
                  required
                />
                {!newPet.name && nameTouched && (
                  <p className="text-xs text-red-600 mt-1">El nombre es obligatorio</p>
                )}
              </div>

              {/* 2. Especie - Botones estilo referencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Especie <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSpeciesSelect('Perro')}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.species === 'Perro'
                        ? 'border-tutor-sidebar bg-vet-gray-light text-tutor-sidebar'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-tutor-sidebar'
                    }`}
                  >
                    Perro 🐶
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeciesSelect('Gato')}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.species === 'Gato'
                        ? 'border-tutor-sidebar bg-vet-gray-light text-tutor-sidebar'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-tutor-sidebar'
                    }`}
                  >
                    Gato 🐱
          </button>
                </div>
              </div>

              {/* 3. Género - Botones estilo referencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sexo <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPet({...newPet, gender: 'Macho'})}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.gender === 'Macho'
                        ? 'border-tutor-sidebar bg-vet-gray-light text-tutor-sidebar'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-tutor-sidebar'
                    }`}
                  >
                    Macho ♂
          </button>
                  <button
                    type="button"
                    onClick={() => setNewPet({...newPet, gender: 'Hembra'})}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all active:scale-95 ${
                      newPet.gender === 'Hembra'
                        ? 'border-tutor-sidebar bg-vet-gray-light text-tutor-sidebar'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-tutor-sidebar'
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
                  onChange={handleChange}
                  onFocus={handleBreedInputFocus}
                  autoComplete="off"
                  ref={breedInputRef}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary-light"
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
                        className="w-full px-4 py-2 text-left hover:bg-vet-gray-light hover:text-tutor-sidebar transition-colors border-b border-gray-100 last:border-b-0"
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
              </div>

              {/* 5. Peso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (Kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="weight"
                  placeholder="Peso en kilogramos"
                  min="0"
                  step="0.1"
                  value={newPet.weight}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary-light"
                  required
                />
              </div>

              {/* 6. Fecha de nacimiento - Mejorado para móvil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de nacimiento (aproximada) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="birthDate"
                    value={newPet.birthDate}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 pr-12 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary-light bg-white"
                    required
                  />
                  {/* Icono de calendario decorativo para móvil */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <svg className="w-6 h-6 text-tutor-sidebar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                {newPet.birthDate && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Edad calculada: {newPet.ageYears || 0} años y {newPet.ageMonths || 0} meses
                  </p>
                )}
              </div>

              {/* 7. Color (opcional) - Movido al final */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="color"
                  placeholder="Color"
                  value={newPet.color}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary-light"
                />
              </div>

              {/* 8. Foto (opcional) - Movido al final */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Foto de la mascota <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <div className="flex items-center gap-3">
                  {newPet.image && (
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-tutor-sidebar/30 flex-shrink-0">
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
                    <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-tutor-sidebar transition-colors text-center text-gray-600 hover:text-tutor-sidebar">
                      {newPet.image ? 'Cambiar foto' : 'Seleccionar foto'}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Botón Continuar estilo referencia */}
            <div className="mt-8 pb-6">
              <button
                disabled={!newPet.name || !newPet.species || !newPet.breed || !newPet.gender || !newPet.weight || !newPet.birthDate}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                  newPet.name && newPet.species && newPet.breed && newPet.gender && newPet.weight && newPet.birthDate
                    ? 'bg-vet-accent hover:bg-vet-accent-dark active:bg-vet-accent-dark active:scale-95'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                onClick={handleAddPet}
              >
                Agregar mascota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Reminder Modal */}
      {showRatingModal && ratingAppointment && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setRatingAppointment(null);
          }}
          appointmentId={ratingAppointment.appointmentId}
          vetId={ratingAppointment.vetId}
          petId={ratingAppointment.petId}
          vetName={ratingAppointment.vetName}
          vetRating={ratingAppointment.vetRating}
          appointmentDate={ratingAppointment.appointmentDate}
          scheduledTime={ratingAppointment.scheduledTime}
          onSuccess={() => {
            setShowRatingModal(false);
            setRatingAppointment(null);
          }}
        />
      )}
    </div>
  );
};

export default UserHome;
