import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import PetAvatar from "../../components/PetAvatar";
import ModernCalendar from "../../components/ModernCalendar";
import PaymentSection from "../../components/emergency/PaymentSection";

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

// Función helper para formatear fecha en hora local de Chile (YYYY-MM-DD)
// Evita problemas de zona horaria usando hora local en lugar de UTC
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AppointmentPage = () => {
  const { id } = useParams();
  const [vet, setVet] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [bookedTimes, setBookedTimes] = useState([]);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentType, setAppointmentType] = useState("clinic visit");
  const [isEmergency, setIsEmergency] = useState(false);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [modalMode, setModalMode] = useState('select'); // 'select' | 'create'
  const [newPet, setNewPet] = useState({ name: "", image: "", species: "Perro", breed: "", gender: "Macho", color: "", description: "" });
  const [nameTouched, setNameTouched] = useState(false);
  const nameInputRef = useRef(null);
  const breedInputRef = useRef(null);
  const breedDropdownRef = useRef(null);
  const [breedDropdownOpen, setBreedDropdownOpen] = useState(false);
  const [filteredBreeds, setFilteredBreeds] = useState(dogBreeds);
  const [showDialog, setShowDialog] = useState(false);
  const [consultationPrice, setConsultationPrice] = useState(0); // Precio de la consulta
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  const location = useLocation();
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const [payment, setPayment] = useState({ method: isDev ? 'dev_bypass' : 'mercadopago', savedTokenId: isDev ? 'dev_test' : null });

  // Calcular el día siguiente (mínimo permitido para agendar)
  // Usando hora local de Chile, no UTC
  const [minDate] = useState(() => {
    const today = new Date();
    // Usar hora local de Chile
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    // Usar formato local en lugar de toISOString() para evitar problemas de UTC
    return formatDateLocal(tomorrow);
  });
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30); // Permitir agendar hasta 30 días adelante
  const maxDateStr = formatDateLocal(maxDate);

  // Obtener días de la semana disponibles basados en horarios del veterinario
  const availableDaysOfWeek = useMemo(() => {
    if (!vet || !vet.openingHours || vet.openingHours.length === 0) {
      return [];
    }
    return vet.openingHours.map(schedule => schedule.day);
  }, [vet]);

  // Función helper para verificar si una fecha es válida (tiene horarios configurados)
  const isDateAvailable = (dateString) => {
    if (!dateString || availableDaysOfWeek.length === 0) {
      return false;
    }
    // Parsear la fecha en hora local para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    return availableDaysOfWeek.includes(dayOfWeek);
  };


  const navigate = useNavigate();

  // Refs para controlar ejecuciones de useEffect
  const hasLoadedInitialDataRef = useRef(false);
  const hasCheckedInitialPetsRef = useRef(false);
  const hasOpenedModalRef = useRef(false);

  // useEffect principal - solo se ejecuta una vez al cargar la página
  useEffect(() => {
    // Evitar que se ejecute múltiples veces
    if (hasLoadedInitialDataRef.current) return;
    
    // Mapear query param `service` a tipos soportados por backend (solo al inicio)
    const qs = new URLSearchParams(window.location.search);
    const svc = (qs.get('service') || '').toLowerCase();
    if (svc) {
      switch (svc) {
        case 'consulta-clinica':
        case 'urgencia-clinica':
          setAppointmentType('clinic visit');
          setIsEmergency(svc === 'urgencia-clinica');
          break;
        case 'teleconsulta':
          setAppointmentType('online consultation');
          setIsEmergency(false);
          break;
        case 'tele-urgencia':
          setAppointmentType('online consultation');
          setIsEmergency(true);
          break;
        case 'consulta-domicilio':
          setAppointmentType('home visit');
          setIsEmergency(false);
          break;
        case 'urgencia-domicilio':
          setAppointmentType('home visit');
          setIsEmergency(true);
          break;
        default:
          setAppointmentType('clinic visit');
          setIsEmergency(false);
      }
    }

    const fetchVet = async () => {
      try {
        // Endpoint público: no requiere token para ver datos del vet
        const res = await axios.get(`${API_BASE}/api/vets/${id}`);
        setVet(res.data);
        // Si el veterinario es independiente y el tipo de cita es "clinic visit", cambiarlo a "home visit"
        if (res.data?.vetType === 'independent' && appointmentType === 'clinic visit') {
          setAppointmentType('home visit');
        }
      } catch (error) {
        console.error("Error al obtener los detalles del veterinario:", error);
        setStatus("No se pudieron cargar los detalles del veterinario.");
      }
    };

    const fetchUserAndPets = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser || !storedUser.id) return;

      setUser(storedUser);

      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/pets/user/${storedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPets(res.data);
      } catch (error) {
        console.error("Error al obtener las mascotas:", error);
      }
    };

    // Llamar a las funciones
    fetchVet();
    fetchUserAndPets();
    
    // Marcar como cargado para no volver a ejecutar
    hasLoadedInitialDataRef.current = true;
  }, [id, API_BASE]); // Removido location.search para evitar recargas

  // Validar que veterinarios independientes no puedan tener citas en clínica
  useEffect(() => {
    if (vet?.vetType === 'independent' && appointmentType === 'clinic visit') {
      setAppointmentType('home visit');
      setStatus("Los veterinarios independientes no ofrecen consultas en clínica. Se ha cambiado a consulta a domicilio.");
    }
  }, [vet?.vetType, appointmentType]);

  // Obtener precio estimado cuando cambia el tipo de cita o el vet
  useEffect(() => {
    const fetchPricing = async () => {
      if (!id || !appointmentType) return;
      
      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          `${API_BASE}/api/appointments/estimate-pricing`,
          {
            vetId: id,
            appointmentType
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          setConsultationPrice(response.data.pricing?.consultationPrice || 0);
        }
      } catch (error) {
        console.error('Error al obtener precio estimado:', error);
        // En caso de error, usar precio por defecto 0
        setConsultationPrice(0);
      }
    };

    fetchPricing();
  }, [id, appointmentType, API_BASE]);

  // Preseleccionar la mascota si viene petId en la URL (solo cuando se cargan las mascotas inicialmente)
  const hasInitializedPetRef = useRef(false);
  useEffect(() => {
    if (hasInitializedPetRef.current || !pets.length) return; // Solo una vez cuando se cargan las mascotas
    
    // Usar window.location.search directamente para evitar que React Router reaccione
    const qs = new URLSearchParams(window.location.search);
    const petId = qs.get('petId');
    
    if (petId) {
      // Si hay petId en la URL, buscar y seleccionar la mascota
      const found = pets.find(p => p._id === petId);
      if (found) {
        setSelectedPet(found);
        hasInitializedPetRef.current = true;
      }
    } else {
      // Si no hay petId, marcar como inicializado para no volver a ejecutar
      hasInitializedPetRef.current = true;
    }
  }, [pets]); // Solo cuando cambian las mascotas, no reaccionar a cambios de URL

  // Función helper para actualizar URL con petId sin recargar (solo cuando se selecciona manualmente)
  const updateUrlWithPetId = useCallback((petId) => {
    if (!petId) return;
    const currentParams = new URLSearchParams(window.location.search);
    const petIdFromUrl = currentParams.get('petId');
    
    // Solo actualizar si es diferente
    if (!petIdFromUrl || petIdFromUrl !== petId) {
      currentParams.set('petId', petId);
      const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Si es urgencia, establecer fecha y hora automáticamente
  useEffect(() => {
    if (isEmergency) {
      const now = new Date();
      // Usar formato local en lugar de toISOString() para hora de Chile
      const todayStr = formatDateLocal(now);
      setAppointmentDate(todayStr);
      
      // Establecer hora actual redondeada al siguiente intervalo de 15 minutos
      const minutes = now.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 15) * 15;
      const hours = roundedMinutes >= 60 ? now.getHours() + 1 : now.getHours();
      const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
      const timeStr = `${String(hours % 24).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
      setAppointmentTime(timeStr);
    }
  }, [isEmergency]);

  // Handlers de creación rápida dentro del modal
  const handleModalInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') setNameTouched(true);
    if (name === 'breed') {
      setNewPet(prev => ({ ...prev, [name]: value }));
      setBreedDropdownOpen(true);
    } else {
      setNewPet(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleModalFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPet(prev => ({ ...prev, image: reader.result }));
      reader.readAsDataURL(file);
    }
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

  const handleBreedSelect = (breed) => {
    setNewPet((prev) => ({ ...prev, breed }));
    setBreedDropdownOpen(false);
  };

  const handleBreedInputFocus = () => {
    setBreedDropdownOpen(true);
  };

  const createPetQuick = async () => {
    if (!newPet.name) return null;
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `${API_BASE}/api/pets`,
      { userId: user.id, ...newPet },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    return res.data?.pet || null;
  };

  // Si no hay mascotas y no viene petId, abrir modal para crear mascota rápidamente (solo una vez al cargar)
  useEffect(() => {
    // Solo ejecutar una vez, después de que los datos iniciales se hayan cargado
    if (hasCheckedInitialPetsRef.current || hasOpenedModalRef.current) return;
    
    // Esperar a que los datos se carguen completamente
    if (!hasLoadedInitialDataRef.current) return;
    if (pets === null || pets === undefined) return;
    
    // Leer el petId de la URL actual solo una vez
    const qs = new URLSearchParams(window.location.search);
    const petId = qs.get('petId');
    
    // Solo abrir el modal si no hay petId, no hay mascotas, y no se ha abierto antes
    if (!petId && Array.isArray(pets) && pets.length === 0) {
      // Usar setTimeout para evitar que se abra inmediatamente durante la carga
      const timer = setTimeout(() => {
        // Verificar una vez más antes de abrir (sin depender de selectedPet para evitar loops)
        if (!hasOpenedModalRef.current) {
          const currentQs = new URLSearchParams(window.location.search);
          const currentPetId = currentQs.get('petId');
          // Solo abrir si todavía no hay petId y no hay mascotas
          if (!currentPetId && pets.length === 0) {
            setModalMode('create');
            setIsPetModalOpen(true);
            hasOpenedModalRef.current = true;
          }
        }
      }, 500); // Pequeño delay para asegurar que todo esté cargado
      
      // Limpiar el timer si el componente se desmonta
      return () => clearTimeout(timer);
    }
    
    // Marcar como verificado
    hasCheckedInitialPetsRef.current = true;
  }, [pets]); // Solo cuando cambian las mascotas, NO incluir selectedPet para evitar loops

  // Autofocus cuando el modal está en modo crear
  useEffect(() => {
    if (isPetModalOpen && modalMode === 'create' && nameInputRef.current) {
      setTimeout(() => nameInputRef.current && nameInputRef.current.focus(), 50);
    }
  }, [isPetModalOpen, modalMode]);

  // Filtrar razas según especie y búsqueda
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

  // Cerrar dropdown al hacer click fuera
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

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!appointmentDate) {
        setBookedTimes([]);
        return;
      }
      
      // Resetear horarios agendados mientras se cargan
      setBookedTimes([]);
      
      try {
        const res = await axios.get(`${API_BASE}/api/appointments/booked-times/${id}/${appointmentDate}`);
        // Asegurarnos de que recibimos un array y normalizar el formato
        const times = Array.isArray(res.data) ? res.data : [];
        // Normalizar formato a "HH:mm" en caso de que venga diferente
        const normalizedTimes = times.map(time => {
          if (typeof time === 'string') {
            // Si viene como "09:00" ya está bien
            if (time.match(/^\d{2}:\d{2}$/)) {
              return time;
            }
            // Si viene como "9:0" o similar, normalizar
            const parts = time.split(':');
            if (parts.length === 2) {
              return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
            }
          }
          return time;
        });
        console.log('Horarios agendados recibidos:', normalizedTimes);
        setBookedTimes(normalizedTimes);
      } catch (error) {
        console.error("Error al obtener los horarios reservados:", error);
        setBookedTimes([]);
      }
    };
    fetchBookedTimes();
  }, [appointmentDate, id, API_BASE]);

  // Generar horarios disponibles dinámicamente basándose en openingHours del veterinario
  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    // Parsear la fecha en hora local para evitar problemas de zona horaria
    const selectedDate = appointmentDate 
      ? (() => {
          const [year, month, day] = appointmentDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })()
      : null;
    const isToday = selectedDate && selectedDate.toDateString() === now.toDateString();
    
    // Si no hay fecha seleccionada o no hay veterinario, retornar array vacío
    if (!selectedDate || !vet) {
      return [];
    }
    
    // Obtener el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const dayOfWeek = selectedDate.getDay();
    
    // Buscar el horario de atención para este día
    const daySchedule = vet.openingHours?.find(h => h.day === dayOfWeek);
    
    // Si no hay horario configurado para este día, no mostrar horarios disponibles
    if (!daySchedule) {
      return [];
    }
    
    // Si está abierto 24 horas, generar horarios de 00:00 a 23:00 cada hora (citas de 1 hora)
    if (daySchedule.open24h) {
      for (let hour = 0; hour < 24; hour++) {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        
        if (isToday) {
          const slotDateTime = new Date();
          slotDateTime.setHours(hour, 0, 0, 0);
          if (slotDateTime <= now) continue;
        }
        
        slots.push(timeStr);
      }
      return slots;
    }
    
    // Si tiene horario específico (open y close), generar horarios en ese rango
    if (daySchedule.open && daySchedule.close) {
      const [openHour, openMin] = daySchedule.open.split(':').map(Number);
      const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
      
      // Convertir a minutos desde medianoche para facilitar comparaciones
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      
      // Generar horarios cada 60 minutos (1 hora) desde open hasta close (excluyendo close)
      let currentMinutes = openMinutes;
      while (currentMinutes < closeMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        // Solo generar slots en horas completas (minuto 0) ya que las citas son de 1 hora
        if (minute === 0) {
          const timeStr = `${String(hour).padStart(2, '0')}:00`;
          
          // Si es hoy, solo incluir horarios futuros
          if (isToday) {
            const slotDateTime = new Date();
            slotDateTime.setHours(hour, 0, 0, 0);
            if (slotDateTime <= now) {
              currentMinutes += 60;
              continue;
            }
          }
          
          slots.push(timeStr);
        }
        currentMinutes += 60;
      }
    }
    
    // No filtrar horarios reservados, se mostrarán deshabilitados
    return slots;
  }, [appointmentDate, vet]);

  const handleTimeSelect = (e, time) => {
    e.preventDefault();
    
    // Validar que el horario no esté reservado
    if (bookedTimes.includes(time)) {
      return;
    }
    
    // Validar que el horario sea en el futuro
    if (appointmentDate) {
      const now = new Date();
      // Parsear la fecha en hora local para evitar problemas de zona horaria
      const [year, month, day] = appointmentDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      const isToday = selectedDate.toDateString() === now.toDateString();
      
      if (isToday) {
        // Parsear el tiempo seleccionado (formato HH:MM)
        const [hours, minutes] = time.split(':').map(Number);
        const slotDateTime = new Date();
        slotDateTime.setHours(hours, minutes, 0, 0);
        
        // Si el horario es pasado, no permitir selección
        if (slotDateTime <= now) {
          setStatus("Error: No puedes seleccionar un horario que ya pasó. Por favor elige un horario futuro.");
          return;
        }
      }
    }
    
    setAppointmentTime(time);
    setStatus(""); // Limpiar mensajes de error previos
  };

  const handleBookNowClick = async (e) => {
    e.preventDefault();

    // Verificar si hay petId en la URL pero no está seleccionado
    const qs = new URLSearchParams(window.location.search); // Usar window.location directamente
    const petIdFromUrl = qs.get('petId');
    
    if (!selectedPet) {
      // Intentar encontrar la mascota desde la URL si existe
      if (petIdFromUrl && pets.length > 0) {
        const found = pets.find(p => p._id === petIdFromUrl);
        if (found) {
          setSelectedPet(found);
          // Continuar con el flujo después de seleccionar
          setTimeout(() => handleBookNowClick(e), 100);
          return;
        }
      }
      setStatus("Error: Por favor selecciona una mascota antes de continuar.");
      setIsPetModalOpen(true);
      return;
    }
    
    // Asegurarse de que el petId esté en la URL antes de continuar (solo si no está presente)
    if (selectedPet && (!petIdFromUrl || petIdFromUrl !== selectedPet._id)) {
      updateUrlWithPetId(selectedPet._id);
    }

    // Para urgencias, redirigir al formulario completo de urgencia
    if (isEmergency) {
      navigate(`/emergency/request?petId=${selectedPet._id || selectedPet.id}&mode=clinic`);
      return;
    }

    // Validaciones para citas normales
    if (!appointmentDate) {
      setStatus("Error: Por favor selecciona una fecha para la cita.");
      return;
    }

    if (!appointmentTime) {
      setStatus("Error: Por favor selecciona una hora para la cita.");
      return;
    }

    // Validar que la fecha y hora seleccionada sea en el futuro
    const now = new Date();
    // Parsear la fecha en hora local para evitar problemas de zona horaria
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    if (appointmentDateTime <= now) {
      setStatus("Error: No puedes reservar una cita en el pasado. Por favor selecciona una fecha y hora futura.");
      return;
    }

    // Validar que sea al menos el día siguiente
    // Comparar strings de fecha directamente (formato YYYY-MM-DD) para evitar problemas de zona horaria
    if (appointmentDate < minDate) {
      setStatus("Error: Solo se pueden agendar citas para mañana en adelante.");
      return;
    }

    try {
      setStatus("Procesando tu reserva...");
      const response = await axios.post(
        `${API_BASE}/api/appointments/create`,
        {
          userId: user.id,
          vetId: id,
          petId: selectedPet._id,
          appointmentDate,
          scheduledTime: appointmentTime,
          appointmentType,
          isEmergency,
          payment: payment, // Incluir método de pago
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const { appointment } = response.data;

      console.log("Cita creada:", appointment);

      const bookingId = appointment?._id;

      if (!bookingId) {
        setStatus("Error: No se pudo completar la reserva. Por favor intenta nuevamente.");
        return;
      }

      setStatus("");

      // Si es videoconsulta, verificar si es gratis (precio 0)
      if (appointmentType === 'online consultation') {
        if (consultationPrice === 0) {
          console.log('✅ Videoconsulta gratis confirmada - Sin pago requerido');
          setShowDialog(true);
          return;
        } else {
          // Si tiene precio, procesar el pago
          console.log(`Videoconsulta con precio: $${consultationPrice} CLP - Procesando pago`);
          // Continuar con el flujo de pago más abajo
        }
      }

      // Para consultas presenciales: verificar bypass o ir a pago
      const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
      if (isDev) {
        // En desarrollo, omitimos el pago y mostramos éxito
        console.log('🔧 Bypass de pago activo (desarrollo)');
        setShowDialog(true);
        return;
      }

      // El pago se procesa automáticamente con Mercado Pago si está configurado
      // Si es dev_bypass, ya se marcó como pagado
      // Si es mercadopago, el pago se procesa en el backend
      setShowDialog(true);
    } catch (error) {
      console.error("Error booking appointment:", error);

      if (error.response?.status === 409) {
        setStatus("Error: El horario seleccionado ya no está disponible. Por favor elige otro horario.");
        // Refrescar horarios ocupados
        try {
          const res = await axios.get(`${API_BASE}/api/appointments/booked-times/${id}/${appointmentDate}`);
          setBookedTimes(res.data);
          setAppointmentTime("");
        } catch (e) {
          console.error("Error refrescando horarios:", e);
        }
      } else if (error.response?.status === 401) {
        setStatus("Error: Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
      const message = error.response?.data?.message
          || "Hubo un problema al reservar tu cita. Por favor intenta nuevamente.";
      setStatus(`Error: ${message}`);
    }
    }
  };

  if (!vet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-vet-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles del veterinario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con info del veterinario */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-vet-secondary to-vet-primary rounded-full flex items-center justify-center shadow-lg overflow-hidden">
              <img 
                src="/default-vet-image.jpg" 
                alt={vet.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-3xl text-white font-bold">' + vet.name.charAt(0) + '</span>';
                }}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{vet.name}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {vet.email}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {vet.phoneNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {user && (
          <div className={`${isEmergency ? 'bg-red-50 border border-red-200' : 'bg-vet-gray-light border border-vet-secondary/30'} rounded-xl px-4 py-3 mb-6`}>
            <p className={isEmergency ? 'text-red-900' : 'text-vet-primary'}>
              Hola <span className="font-semibold">{user.name}</span>, {isEmergency 
                ? 'completa los siguientes campos para solicitar atención de urgencia inmediata'
                : 'completa los siguientes campos para agendar tu cita'}
            </p>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
          <div className={`px-6 py-4 ${isEmergency ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-vet-secondary to-vet-primary'}`}>
            <h3 className="text-xl font-bold text-white">
              {isEmergency ? '🚨 Solicitar urgencia' : 'Reservar una cita'}
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            <form autoComplete="off" className="space-y-6">
              {/* Tipo de consulta - Solo mostrar si NO es urgencia */}
              {!isEmergency && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de consulta</label>
                  <div className={`grid gap-3 ${vet?.vetType === 'independent' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                    {/* Solo mostrar opción de clínica si el veterinario es tipo clínica */}
                    {vet?.vetType === 'clinic' && (
                      <button
                        type="button"
                        onClick={() => setAppointmentType('clinic visit')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          appointmentType === 'clinic visit'
                            ? 'border-violet-600 bg-violet-50'
                            : 'border-gray-200 bg-white hover:border-violet-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">🏥</div>
                        <div className={`text-sm font-medium ${
                          appointmentType === 'clinic visit' ? 'text-violet-700' : 'text-gray-700'
                        }`}>
                          Visita a la clínica
                        </div>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAppointmentType('home visit')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        appointmentType === 'home visit'
                          ? 'border-violet-600 bg-violet-50'
                          : 'border-gray-200 bg-white hover:border-violet-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">🏠</div>
                      <div className={`text-sm font-medium ${
                        appointmentType === 'home visit' ? 'text-violet-700' : 'text-gray-700'
                      }`}>
                        Consulta a domicilio
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentType('online consultation')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        appointmentType === 'online consultation'
                          ? 'border-violet-600 bg-violet-50'
                          : 'border-gray-200 bg-white hover:border-violet-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">💻</div>
                      <div className={`text-sm font-medium ${
                        appointmentType === 'online consultation' ? 'text-violet-700' : 'text-gray-700'
                      }`}>
                        Consulta en línea
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Fecha - Solo mostrar si NO es urgencia */}
              {!isEmergency && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Fecha de la cita</label>
                  
                  {/* Calendario moderno */}
                  <ModernCalendar
                    selectedDate={appointmentDate}
                    onDateSelect={(dateStr) => {
                      // Validar que sea al menos el día siguiente
                      if (dateStr < minDate) {
                        setStatus("Error: Solo se pueden agendar citas para mañana en adelante.");
                        setAppointmentDate("");
                        setAppointmentTime("");
                        return;
                      }
                      
                      // Validar que el día tenga horario configurado (es un día disponible)
                      if (!isDateAvailable(dateStr)) {
                        // Parsear la fecha en hora local para evitar problemas de zona horaria
                        const [year, month, day] = dateStr.split('-').map(Number);
                        const selectedDateObj = new Date(year, month - 1, day);
                        const dayOfWeek = selectedDateObj.getDay();
                        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                        setStatus(`Error: El veterinario no atiende los ${dayNames[dayOfWeek]}. Por favor selecciona otro día disponible.`);
                        setAppointmentDate("");
                        setAppointmentTime("");
                        return;
                      }
                      
                      setAppointmentDate(dateStr);
                      setStatus("");
                      setAppointmentTime("");
                      // No actualizar la URL aquí para evitar recargas innecesarias
                    }}
                    minDate={minDate}
                    maxDate={maxDateStr}
                    availableDaysOfWeek={availableDaysOfWeek}
                    className="w-full"
                  />
                  
                  {/* Mensaje informativo sobre días disponibles */}
                  {vet && vet.openingHours && vet.openingHours.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Días disponibles:</strong> {(() => {
                          const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                          const sortedDays = [...availableDaysOfWeek].sort((a, b) => a - b);
                          const dayLabels = sortedDays.map(dayNum => dayNames[dayNum]);
                          return dayLabels.join(', ');
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje para urgencias */}
              {isEmergency && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-1">Urgencia - Atención inmediata</p>
                      <p className="text-sm text-red-800">
                        Esta es una urgencia. La atención se coordinará de inmediato con la clínica disponible más cercana.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Horarios disponibles - Solo mostrar si NO es urgencia */}
              {!isEmergency && appointmentDate && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Selecciona la hora</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {timeSlots.map((time) => {
                // Los horarios ya vienen en formato "HH:mm" desde timeSlots, solo normalizar si es necesario
                const normalizedTime = time.includes(':') ? time : `${time}:00`;
                
                // Comparar directamente (ambos deberían estar en formato "HH:mm")
                // Si bookedTimes incluye el horario normalizado, está agendado
                const isBooked = bookedTimes.length > 0 && bookedTimes.some(bt => {
                  const normalizedBt = typeof bt === 'string' && bt.includes(':') 
                    ? bt 
                    : `${bt}:00`;
                  // Normalizar ambos a "HH:mm"
                  const normalizeTimeString = (t) => {
                    const parts = String(t).split(':');
                    if (parts.length === 2) {
                      return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
                    }
                    return String(t).padStart(2, '0') + ':00';
                  };
                  return normalizeTimeString(normalizedBt) === normalizeTimeString(normalizedTime);
                });
                const isSelected = appointmentTime === time;
                
                // Verificar si el horario es pasado (solo si la fecha es hoy)
                const now = new Date();
                // Parsear la fecha en hora local para evitar problemas de zona horaria
                const selectedDate = appointmentDate 
                  ? (() => {
                      const [year, month, day] = appointmentDate.split('-').map(Number);
                      return new Date(year, month - 1, day);
                    })()
                  : null;
                const isToday = selectedDate && selectedDate.toDateString() === now.toDateString();
                let isPast = false;
                
                if (isToday) {
                  const [hours, minutes] = time.split(':').map(Number);
                  const slotDateTime = new Date();
                  slotDateTime.setHours(hours, minutes, 0, 0);
                  isPast = slotDateTime <= now;
                }
                
                const isDisabled = isBooked || isPast;
                
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={(e) => handleTimeSelect(e, time)}
                    disabled={isDisabled}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isDisabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-vet-accent text-white ring-2 ring-vet-accent ring-offset-2'
                        : 'bg-gray-50 text-gray-700 hover:bg-vet-gray-light hover:text-vet-secondary border border-gray-200'
                    }`}
                    title={isPast ? 'Este horario ya pasó' : isBooked ? 'Horario no disponible' : ''}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
                  {appointmentTime && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-vet-secondary bg-vet-gray-light px-3 py-2 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Hora seleccionada: <strong>{appointmentTime}</strong></span>
                    </div>
                  )}
                  {appointmentDate && timeSlots.length === 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>No hay horarios disponibles para este día. Por favor selecciona otra fecha.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mascota */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mascota</label>
                {selectedPet ? (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-vet-gray-light to-vet-secondary/10 border-2 border-vet-secondary/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                        <PetAvatar 
                          image={selectedPet.image} 
                          species={selectedPet.species} 
                          name={selectedPet.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedPet.name}</p>
                        <p className="text-sm text-gray-600">{selectedPet.breed}</p>
                      </div>
                    </div>
            <button
              type="button"
              onClick={() => setIsPetModalOpen(true)}
                      className="text-vet-secondary hover:text-vet-secondary-dark text-sm font-medium"
            >
                      Cambiar
            </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPetModalOpen(true)}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-vet-secondary hover:bg-vet-gray-light transition-all text-gray-600 hover:text-vet-secondary font-medium"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Seleccionar mascota</span>
                </div>
                  </button>
                )}
              </div>

              {/* Sección de pago - Para citas presenciales y teleconsultas con precio mayor a 0 */}
              {!isEmergency && appointmentDate && appointmentTime && selectedPet && 
               (appointmentType !== 'online consultation' || consultationPrice > 0) && (
                <PaymentSection 
                  payment={payment}
                  onChange={(newPayment) => {
                    setPayment(newPayment);
                  }}
                />
              )}

              {/* Botón de continuar */}
            <button
              type="button"
              onClick={handleBookNowClick}
                disabled={(!isEmergency && (!appointmentDate || !appointmentTime)) || !selectedPet}
                className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 ${
                  ((isEmergency || (appointmentDate && appointmentTime)) && selectedPet)
                    ? isEmergency 
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl active:scale-95'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              {isEmergency ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Solicitar urgencia ahora</span>
                </>
              ) : appointmentType === 'online consultation' ? (
                <>
                  <span>Confirmar videoconsulta</span>
                  {consultationPrice === 0 ? (
                    <span className="bg-green-400 text-green-900 text-sm font-bold px-3 py-1 rounded-full">GRATIS</span>
                  ) : (
                    <span className="bg-violet-100 text-violet-900 text-sm font-bold px-3 py-1 rounded-full">
                      ${consultationPrice.toLocaleString('es-CL')} CLP
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>Continuar al pago</span>
                  {appointmentDate && appointmentTime && selectedPet && (
                    <span className="text-sm font-medium opacity-90">• Mercado Pago</span>
                  )}
                </>
              )}
            </button>

              {/* Mensajes helper */}
              {((!isEmergency && (!appointmentDate || !appointmentTime)) || !selectedPet) && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Para continuar completa:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {!isEmergency && !appointmentDate && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>Selecciona una fecha</li>}
                        {!isEmergency && !appointmentTime && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>Selecciona un horario</li>}
                        {!selectedPet && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>Selecciona una mascota</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            {/* Mensaje informativo sobre disponibilidad */}
              {((isEmergency || (appointmentDate && appointmentTime)) && selectedPet) && (
                appointmentType === 'online consultation' ? (
                  consultationPrice === 0 ? (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-green-900 mb-1">¡Videoconsulta Gratuita!</p>
                          <p className="text-sm text-green-800">
                            Las videoconsultas son completamente gratuitas. Al confirmar, tu cita quedará reservada inmediatamente sin necesidad de pago.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-blue-900 mb-1">Videoconsulta</p>
                          <p className="text-sm text-blue-800">
                            Precio: <span className="font-bold">${consultationPrice.toLocaleString('es-CL')} CLP</span>. Al confirmar, serás redirigido al pago.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-yellow-800">
                        El horario seleccionado no está garantizado hasta completar el pago exitosamente. Si no completas el pago, otra persona podrá reservar este mismo horario.
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Estado/Mensajes */}
              {status && (
                <div className={`p-4 rounded-xl ${
                  status.includes("Error") 
                    ? "bg-red-50 border-l-4 border-red-500 text-red-800" 
                    : "bg-green-50 border-l-4 border-green-500 text-green-800"
                }`}>
                  <p className="text-sm font-medium">{status}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      {showDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-center">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Cita Reservada</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-6">
                Tu cita ha sido reservada exitosamente. Te esperamos!
                  </p>
                    <button
                      onClick={() => {
                        setShowDialog(false);
                        navigate('/appointments');
                      }}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition-all active:scale-95"
                    >
                Ver mis citas
                    </button>
                  </div>
                </div>
              </div>
            )}

      {/* Pet Modal con seleccionar/crear */}
      {isPetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-violet-600 text-white px-6 py-4 flex items-center gap-3">
              {/* Ícono huellita */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-violet-100" aria-hidden>
                <path d="M4.5 9.5c0-1.657 1.12-3 2.5-3s2.5 1.343 2.5 3-1.12 3-2.5 3-2.5-1.343-2.5-3Zm6-4C10.5 3.843 11.62 2.5 13 2.5s2.5 1.343 2.5 3-1.12 3-2.5 3-2.5-1.343-2.5-3Zm6.5 1c0-1.657 1.12-3 2.5-3s2.5 1.343 2.5 3-1.12 3-2.5 3-2.5-1.343-2.5-3ZM3.5 16.25c0-2.347 2.347-4.25 5.25-4.25.96 0 1.851.211 2.61.586.759-.375 1.65-.586 2.61-.586 2.903 0 5.25 1.903 5.25 4.25 0 2.035-1.83 3.25-3.75 3.25-1.11 0-2.156-.44-3.12-1.093a6.17 6.17 0 0 1-1.99 1.093c-2.52.83-6.86-.21-6.86-3.25Z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Tu mascota</h3>
                <p className="text-xs opacity-90">Selecciona una mascota o créala rápidamente</p>
              </div>
              <button onClick={() => setIsPetModalOpen(false)} className="text-white/80 hover:text-white text-xl leading-none">&times;</button>
            </div>

            <div className="px-6 pt-4">
              <div className="flex gap-2 text-sm">
                <button
                  className={`px-3 py-1.5 rounded ${modalMode==='select' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setModalMode('select')}
                >Seleccionar</button>
                <button
                  className={`px-3 py-1.5 rounded ${modalMode==='create' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setModalMode('create')}
                >Crear nueva</button>
              </div>
            </div>

            {modalMode==='select' ? (
              <div className="p-6">
                {pets.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {pets.map((pet) => (
                      <div
                        key={pet._id}
                        onClick={() => { 
                          setSelectedPet(pet); 
                          setIsPetModalOpen(false);
                          // Actualizar URL con petId sin recargar (usar window directamente)
                          updateUrlWithPetId(pet._id);
                        }}
                        className="cursor-pointer flex flex-col items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition border"
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mb-2">
                          <PetAvatar 
                            image={pet.image} 
                            species={pet.species} 
                            name={pet.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm font-medium">{pet.name}</p>
                        <p className="text-xs text-gray-500">{pet.breed}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No tienes mascotas aún. Cambia a la pestaña "Crear nueva".</p>
                )}
                <div className="mt-4 text-right">
                  <button className="px-4 py-2 rounded-lg border" onClick={() => setIsPetModalOpen(false)}>Cerrar</button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newPet.name}
                    onChange={handleModalInputChange}
                    onBlur={() => setNameTouched(true)}
                    ref={nameInputRef}
                    placeholder="Ej. Dufy"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${!newPet.name && nameTouched ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-violet-300'}`}
                  />
                  {!newPet.name && nameTouched && (
                    <p className="text-xs text-red-600 mt-1">El nombre es obligatorio.</p>
                  )}
                </div>

                {/* Especie */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especie</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSpeciesSelect('Perro')}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
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
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        newPet.species === 'Gato'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPet(prev => ({ ...prev, gender: 'Macho' }))}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        newPet.gender === 'Macho'
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                      }`}
                    >
                      Macho ♂
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPet(prev => ({ ...prev, gender: 'Hembra' }))}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        newPet.gender === 'Hembra'
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : 'border-gray-300 bg-white text-gray-900 hover:border-violet-300'
                      }`}
                    >
                      Hembra ♀
                    </button>
                  </div>
                </div>

                {/* Raza con autocompletado */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raza (opcional)</label>
                  <input
                    type="text"
                    name="breed"
                    value={newPet.breed}
                    onChange={handleModalInputChange}
                    onFocus={handleBreedInputFocus}
                    autoComplete="off"
                    ref={breedInputRef}
                    placeholder="Buscar o escribir raza"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  {breedDropdownOpen && (
                    <div
                      ref={breedDropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      {filteredBreeds.length > 0 ? (
                        filteredBreeds.map((breed, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleBreedSelect(breed)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 hover:text-violet-700 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            {breed}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No encontramos coincidencias.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Color y Foto */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Color (opcional)</label>
                    <input type="text" name="color" value={newPet.color} onChange={handleModalInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Foto (opcional)</label>
                    <input type="file" accept="image/*" onChange={handleModalFileChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Descripción (opcional)</label>
                  <textarea name="description" value={newPet.description} onChange={handleModalInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300" rows="2" placeholder="Información relevante" />
                </div>

                {/* Botones */}
                <div className="flex items-center justify-between pt-2">
                  <button type="button" className="text-gray-600 hover:text-gray-800 text-sm" onClick={() => setModalMode('select')}>Seleccionar existente</button>
                  <div className="flex gap-2">
                    <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setIsPetModalOpen(false)}>Cancelar</button>
                    <button
                      type="button"
                      disabled={!newPet.name}
                      onClick={async () => { 
                        const created = await createPetQuick(); 
                        if (created) { 
                          setPets(p => [...p, created]); 
                          setSelectedPet(created); 
                          setIsPetModalOpen(false);
                          // Actualizar URL con el nuevo petId sin recargar
                          updateUrlWithPetId(created._id);
                        } 
                      }}
                      className={`px-4 py-2 rounded-lg text-white ${newPet.name ? 'bg-violet-600 hover:bg-violet-500' : 'bg-violet-300 cursor-not-allowed'}`}
                    >
                      Guardar y usar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentPage;
