import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import VetList from '../../components/VetList';

const VetSearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  
  // Estados principales
  const [step, setStep] = useState('service-selection'); // 'service-selection' | 'emergency-type' | 'vet-selection' | 'loading'
  const [serviceType, setServiceType] = useState(null); // 'emergency-home' | 'emergency-clinic' | 'consultation' | 'home-visit' | 'telemedicine'
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [locationError, setLocationError] = useState('');
  const [petId, setPetId] = useState(null);
  const [isAppointmentFlow, setIsAppointmentFlow] = useState(false);
  
  // Estados para filtros y ordenamiento
  const [sortBy, setSortBy] = useState('relevancia'); // 'relevancia', 'distancia', 'precio-menor', 'precio-mayor', 'calificacion'
  const [filterComuna, setFilterComuna] = useState('');
  const [filterVetType, setFilterVetType] = useState(''); // 'clinic', 'independent', ''
  const [allVets, setAllVets] = useState([]); // Todos los veterinarios sin filtrar

  // Función para buscar veterinarios según el tipo de servicio
  const searchVets = useCallback(async (type, userCoords) => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      params.append('approved', 'true');
      
      if (type === 'emergency-home' || type === 'emergency-clinic') {
        params.append('supportsEmergency', 'true');
        params.append('availableNow', 'true');
        if (userCoords?.lat && userCoords?.lng) {
          params.append('lat', userCoords.lat);
          params.append('lng', userCoords.lng);
          params.append('radiusKm', '50'); // Radio amplio para urgencias
        }
      } else if (type === 'consultation') {
        // Consulta Presencial: solo clínicas
        params.append('services', 'consultas');
        if (userCoords?.lat && userCoords?.lng) {
          params.append('lat', userCoords.lat);
          params.append('lng', userCoords.lng);
          params.append('radiusKm', '10');
        }
      } else if (type === 'home-visit') {
        // A domicilio: independientes + clínicas con domicilio
        params.append('services', 'a-domicilio');
        if (userCoords?.lat && userCoords?.lng) {
          params.append('lat', userCoords.lat);
          params.append('lng', userCoords.lng);
          params.append('radiusKm', '15');
        }
      } else if (type === 'telemedicine') {
        // Para telemedicina, solo filtrar por teleconsultationsEnabled
        // No requerir 'services' ya que teleconsultationsEnabled es el flag principal
        params.append('teleconsultationsEnabled', 'true');
        // No filtrar por availableNow, solo por teleconsultationsEnabled
      }

      const url = `${API_BASE}/api/vets/filter?${params.toString()}`;
      console.log('Buscando veterinarios para telemedicina. URL:', url);
      const { data } = await axios.get(url);
      let vetsData = data.vets || [];
      console.log('Veterinarios recibidos del backend:', vetsData.length);
      
      // Filtrado adicional según el tipo
      if (type === 'consultation') {
        // Solo clínicas para consulta presencial
        vetsData = vetsData.filter(vet => vet.vetType === 'clinic');
      } else if (type === 'home-visit') {
        // Independientes + clínicas con domicilio
        vetsData = vetsData.filter(vet => {
          if (vet.vetType === 'independent') return true;
          if (vet.vetType === 'clinic') {
            // Verificar si la clínica ofrece domicilio
            const hasDomicilio = vet.serviceModalities?.includes('domicilio') || 
                                 vet.additionalModalities?.includes('domicilio') ||
                                 vet.services?.includes('a-domicilio');
            return hasDomicilio;
          }
          return false;
        });
      } else if (type === 'telemedicine') {
        // Solo veterinarios con teleconsultas habilitadas
        console.log('Filtrando por teleconsultationsEnabled. Antes del filtro:', vetsData.length);
        vetsData = vetsData.filter(vet => {
          const hasTeleconsult = vet.teleconsultationsEnabled === true;
          if (!hasTeleconsult) {
            console.log('Vet excluido - teleconsultationsEnabled:', vet.teleconsultationsEnabled, 'Vet:', vet.name);
          }
          return hasTeleconsult;
        });
        console.log('Después del filtro teleconsultationsEnabled:', vetsData.length);
      }
      
      // Guardar todos los veterinarios sin filtrar
      setAllVets(vetsData);
      
      // Aplicar filtros y ordenamiento (se hará automáticamente con useEffect)
      // Por defecto, ordenar por relevancia (o distancia si es urgencia con coordenadas)
      if (userCoords?.lat && userCoords?.lng && (type === 'emergency-home' || type === 'emergency-clinic')) {
        vetsData.sort((a, b) => (a.distancia || Infinity) - (b.distancia || Infinity));
        setVets(vetsData);
      } else {
        setVets(vetsData);
      }
      
      // Para urgencias a domicilio, si hay un vet disponible, redirigir automáticamente
      if (type === 'emergency-home' && vetsData.length > 0) {
        const closestVet = vetsData[0];
        // handleVetSelection se definirá más adelante, por ahora solo redirigir
        const serviceParam = 'urgencia-domicilio';
        const currentPetId = petId || new URLSearchParams(location.search).get('petId');
        navigate(`/appointment/${closestVet._id}?service=${serviceParam}${currentPetId ? `&petId=${currentPetId}` : ''}`);
      } else {
        setStep('vet-selection');
      }
    } catch (e) {
      console.error('Error al buscar veterinarios:', e);
      setError('No se pudieron cargar los veterinarios disponibles.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, navigate, petId, location.search]);

  // Función para aplicar filtros y ordenamiento
  const applyFiltersAndSort = useCallback(() => {
    if (allVets.length === 0) return;

    let filtered = [...allVets];

    // Filtrar por comuna
    if (filterComuna) {
      filtered = filtered.filter(vet => 
        vet.comuna?.toLowerCase().includes(filterComuna.toLowerCase())
      );
    }

    // Filtrar por tipo de veterinario
    if (filterVetType) {
      filtered = filtered.filter(vet => vet.vetType === filterVetType);
    }

    // Ordenar según el criterio seleccionado
    switch (sortBy) {
      case 'distancia':
        // Solo para urgencias con coordenadas
        if (coords.lat && coords.lng && (serviceType === 'emergency-home' || serviceType === 'emergency-clinic')) {
          filtered.sort((a, b) => (a.distancia || Infinity) - (b.distancia || Infinity));
        }
        break;
      case 'precio-menor':
        filtered.sort((a, b) => {
          const priceA = a.pricing?.consultationPrice || a.basePrice || Infinity;
          const priceB = b.pricing?.consultationPrice || b.basePrice || Infinity;
          return priceA - priceB;
        });
        break;
      case 'precio-mayor':
        filtered.sort((a, b) => {
          const priceA = a.pricing?.consultationPrice || a.basePrice || 0;
          const priceB = b.pricing?.consultationPrice || b.basePrice || 0;
          return priceB - priceA;
        });
        break;
      case 'calificacion':
        filtered.sort((a, b) => {
          const ratingA = (a.ratings?.total >= 5) ? (a.ratings?.average || 0) : 0;
          const ratingB = (b.ratings?.total >= 5) ? (b.ratings?.average || 0) : 0;
          return ratingB - ratingA;
        });
        break;
      case 'relevancia':
      default:
        // Relevancia: combina calificación, aprobación y distancia (si aplica)
        filtered.sort((a, b) => {
          // Veterinarios aprobados primero
          if (a.isApproved !== b.isApproved) {
            return a.isApproved ? -1 : 1;
          }
          // Luego por calificación (si tienen al menos 5 calificaciones)
          const ratingA = (a.ratings?.total >= 5) ? (a.ratings?.average || 0) : 0;
          const ratingB = (b.ratings?.total >= 5) ? (b.ratings?.average || 0) : 0;
          if (Math.abs(ratingA - ratingB) > 0.1) {
            return ratingB - ratingA;
          }
          // Si hay coordenadas y es urgencia, ordenar por distancia
          if (coords.lat && coords.lng && (serviceType === 'emergency-home' || serviceType === 'emergency-clinic')) {
            return (a.distancia || Infinity) - (b.distancia || Infinity);
          }
          return 0;
        });
        break;
    }

    setVets(filtered);
  }, [filterComuna, filterVetType, sortBy, coords, allVets, serviceType]);

  // Efecto para aplicar filtros cuando cambian
  useEffect(() => {
    if (allVets.length > 0) {
      applyFiltersAndSort();
    }
  }, [filterComuna, filterVetType, sortBy, applyFiltersAndSort]);

  // Capturar parámetros de la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const petIdParam = params.get('petId');
    const serviceParam = params.get('service');
    const pathname = location.pathname;
    
    if (petIdParam) setPetId(petIdParam);
    
    // Si viene con /agendar-cita o service=consulta-clinica, es un flujo de citas (no urgencias)
    if (pathname === '/agendar-cita' || serviceParam === 'consulta-clinica') {
      setIsAppointmentFlow(true);
    }
    
    // Si viene con /videoconsulta o service=video-consultas, ir directamente al flujo de telemedicina
    if (pathname === '/videoconsulta' || serviceParam === 'video-consultas') {
      setIsAppointmentFlow(true);
      setServiceType('telemedicine');
      setStep('loading');
      // Iniciar búsqueda de veterinarios para telemedicina
      searchVets('telemedicine', null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Función para obtener ubicación del usuario
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCoords(location);
          resolve(location);
        },
        (error) => {
          let message = 'No se pudo obtener tu ubicación';
          if (error.code === 1) {
            message = 'Permiso de ubicación denegado. Por favor actívalo en tu navegador.';
          } else if (error.code === 2) {
            message = 'No se pudo determinar tu ubicación.';
          }
          setLocationError(message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };


  // Manejar selección de tipo de servicio
  const handleServiceSelection = async (type) => {
    if (type === 'emergency') {
      // Para urgencias, mostrar opciones: domicilio o presencial
      setStep('emergency-type');
      return;
    }

    // Para urgencias domiciliarias, redirigir a página de triaje completa
    if (type === 'emergency-home') {
      const url = petId 
        ? `/emergency/request?petId=${petId}`
        : '/emergency/request';
      navigate(url);
      return;
    }

    setServiceType(type);
    setStep('loading');
    setError('');
    setLocationError('');

    try {
      if (type === 'emergency-clinic' || type === 'consultation' || type === 'home-visit') {
        // Obtener ubicación para servicios presenciales y a domicilio
        const userCoords = await getUserLocation();
        await searchVets(type, userCoords);
      } else if (type === 'telemedicine') {
        // No necesita ubicación
        await searchVets(type, null);
      }
    } catch (err) {
      console.error('Error en handleServiceSelection:', err);
      setStep('service-selection');
      setError('Ocurrió un error. Por favor intenta nuevamente.');
    }
  };

  // Manejar selección de veterinario
  const handleVetSelection = (vet) => {
    let serviceParam;
    if (serviceType === 'emergency-home') {
      serviceParam = 'urgencia-domicilio';
    } else if (serviceType === 'emergency-clinic') {
      serviceParam = 'urgencia-clinica';
    } else if (serviceType === 'consultation') {
      serviceParam = 'consulta-clinica';
    } else if (serviceType === 'home-visit') {
      serviceParam = 'consulta-domicilio';
    } else {
      serviceParam = 'teleconsulta';
    }
    
    navigate(`/appointment/${vet._id}?service=${serviceParam}${petId ? `&petId=${petId}` : ''}`);
  };

  // Vista: Selección de servicio
  const renderServiceSelection = () => (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white flex items-center justify-center p-4 md:p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {isAppointmentFlow ? 'Agendar una cita' : '¿Qué necesitas hoy?'}
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            {isAppointmentFlow 
              ? 'Selecciona el tipo de consulta que deseas agendar' 
              : 'Selecciona el tipo de atención que necesitas'}
          </p>
        </div>

        <div className="space-y-3 md:space-y-4">
          {/* Urgencia - Solo mostrar si NO es flujo de citas */}
          {!isAppointmentFlow && (
            <button
              type="button"
              onClick={() => handleServiceSelection('emergency')}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-5 md:p-6 text-left border border-gray-100 hover:border-red-300 hover:scale-[1.01] active:scale-[0.99] group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Urgencia</h3>
                  <p className="text-sm md:text-base text-gray-600 mb-2">Atención inmediata a domicilio</p>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="truncate">Asignación automática del vet más cercano</span>
                  </div>
                </div>
                <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Consulta Presencial */}
          <button
            onClick={() => handleServiceSelection('consultation')}
            className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-5 md:p-6 text-left border border-gray-100 hover:border-blue-300 hover:scale-[1.01] active:scale-[0.99] group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Consulta Presencial</h3>
                <p className="text-sm md:text-base text-gray-600 mb-2">Visita a la clínica veterinaria</p>
                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">Encontraremos las clínicas más cercanas a ti</span>
                </div>
              </div>
              <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* A Domicilio - Solo en flujo de citas */}
          {isAppointmentFlow && (
            <button
              onClick={() => handleServiceSelection('home-visit')}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-5 md:p-6 text-left border border-gray-100 hover:border-green-300 hover:scale-[1.01] active:scale-[0.99] group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">A Domicilio</h3>
                  <p className="text-sm md:text-base text-gray-600 mb-2">El veterinario visita tu hogar</p>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">Veterinarios independientes y clínicas con servicio a domicilio</span>
                  </div>
                </div>
                <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Teleconsulta - En flujo de citas */}
          {isAppointmentFlow && (
            <button
              onClick={() => handleServiceSelection('telemedicine')}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-5 md:p-6 text-left border border-gray-100 hover:border-violet-300 hover:scale-[1.01] active:scale-[0.99] group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Teleconsulta</h3>
                  <p className="text-sm md:text-base text-gray-600 mb-2">Consulta virtual por videollamada</p>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="truncate">Desde la comodidad de tu hogar</span>
                  </div>
                </div>
                <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Telemedicina - Solo si NO es flujo de citas */}
          {!isAppointmentFlow && (
            <button
              onClick={() => handleServiceSelection('telemedicine')}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-5 md:p-6 text-left border border-gray-100 hover:border-violet-300 hover:scale-[1.01] active:scale-[0.99] group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Telemedicina</h3>
                  <p className="text-sm md:text-base text-gray-600 mb-2">Consulta virtual por videollamada</p>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="truncate">Desde la comodidad de tu hogar</span>
                  </div>
                </div>
                <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {locationError && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-yellow-800">{locationError}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Vista: Selección de tipo de urgencia
  const renderEmergencyType = () => (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => setStep('service-selection')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Volver</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Urgencia Veterinaria</h1>
          <p className="text-gray-600">¿Dónde necesitas la atención?</p>
        </div>

        <div className="space-y-4">
          {/* Urgencia a Domicilio */}
          <button
            onClick={() => handleServiceSelection('emergency-home')}
            className="w-full bg-white rounded-2xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-red-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">A Domicilio</h3>
                <p className="text-sm text-gray-600 mb-2">El veterinario va a tu ubicación</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Asignación automática del más cercano</span>
                </div>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Urgencia Presencial */}
          <button
            onClick={() => handleServiceSelection('emergency-clinic')}
            className="w-full bg-white rounded-2xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-red-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">En Clínica</h3>
                <p className="text-sm text-gray-600 mb-2">Llevas a tu mascota a la clínica</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Selecciona la clínica más cercana</span>
                </div>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );

  // Vista: Loading
  const renderLoading = () => (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {serviceType === 'emergency-home' ? 'Buscando veterinario disponible...' 
            : serviceType === 'emergency-clinic' ? 'Buscando clínicas con urgencias...'
            : serviceType === 'consultation' ? 'Buscando clínicas cercanas...'
            : serviceType === 'home-visit' ? 'Buscando veterinarios a domicilio...'
            : 'Buscando veterinarios disponibles...'}
        </h2>
        <p className="text-gray-600 text-sm">Esto solo tomará unos segundos</p>
      </div>
    </div>
  );

  // Vista: Selección de veterinario
  const renderVetSelection = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
          <button
            onClick={() => {
              if (serviceType === 'emergency-home' || serviceType === 'emergency-clinic') {
                setStep('emergency-type');
              } else {
                setStep('service-selection');
              }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Volver</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${
              (serviceType === 'emergency-home' || serviceType === 'emergency-clinic') ? 'bg-gradient-to-br from-red-50 to-red-100' 
                : serviceType === 'consultation' ? 'bg-gradient-to-br from-blue-50 to-blue-100'
                : serviceType === 'home-visit' ? 'bg-gradient-to-br from-green-50 to-green-100'
                : 'bg-gradient-to-br from-violet-50 to-violet-100'
            }`}>
              {(serviceType === 'emergency-home' || serviceType === 'emergency-clinic') && (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {serviceType === 'consultation' && (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
              {serviceType === 'home-visit' && (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              )}
              {serviceType === 'telemedicine' && (
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {serviceType === 'emergency-home' ? 'Urgencia a Domicilio'
                  : serviceType === 'emergency-clinic' ? 'Urgencia en Clínica'
                  : serviceType === 'consultation' ? 'Consulta Presencial'
                  : serviceType === 'home-visit' ? 'Consulta a Domicilio'
                  : 'Telemedicina'}
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                {vets.length} {vets.length === 1 ? 'veterinario disponible' : 'veterinarios disponibles'}
                {coords.lat && coords.lng && ' cerca de ti'}
              </p>
            </div>
          </div>

          {/* Mostrar ubicación solo para urgencias */}
          {(serviceType === 'emergency-home' || serviceType === 'emergency-clinic') && coords.lat && coords.lng && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Usando tu ubicación actual</span>
            </div>
          )}
        </div>

        {/* Filtros y Ordenamiento */}
        {(serviceType === 'consultation' || serviceType === 'home-visit' || serviceType === 'telemedicine') && (
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Ordenamiento */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Ordenar por:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                >
                  <option value="relevancia">Relevancia</option>
                  {coords.lat && coords.lng && (serviceType === 'emergency-home' || serviceType === 'emergency-clinic') && (
                    <option value="distancia">Más cercana</option>
                  )}
                  <option value="precio-menor">Menor precio</option>
                  <option value="precio-mayor">Mayor precio</option>
                  <option value="calificacion">Mejor calificación</option>
                </select>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Filtro por comuna */}
                <input
                  type="text"
                  placeholder="Filtrar por comuna..."
                  value={filterComuna}
                  onChange={(e) => setFilterComuna(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />

                {/* Filtro por tipo */}
                {serviceType !== 'consultation' && (
                  <select
                    value={filterVetType}
                    onChange={(e) => setFilterVetType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    <option value="">Todos los tipos</option>
                    <option value="clinic">Clínica</option>
                    <option value="independent">Independiente</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de veterinarios */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando veterinarios...</p>
          </div>
        )}

        {!loading && vets.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay veterinarios disponibles</h3>
            <p className="text-gray-600 mb-4">
              No encontramos veterinarios disponibles para este servicio en tu zona.
            </p>
            <button
              onClick={() => setStep('service-selection')}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Probar otro servicio
            </button>
          </div>
        )}

        {!loading && vets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {vets.map((vet, index) => (
              <div
                key={vet._id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 hover:border-violet-300 hover:scale-[1.02] active:scale-[0.98] group"
                onClick={() => handleVetSelection(vet)}
              >
                <div className="p-5 md:p-6">
                  {index === 0 && (serviceType === 'emergency-home' || serviceType === 'emergency-clinic') && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Más cercano
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4 mb-4">
                    {vet.profileImage ? (
                      <img 
                        src={vet.profileImage} 
                        alt={vet.name}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border-2 border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        serviceType === 'consultation' ? 'bg-gradient-to-br from-blue-50 to-blue-100'
                        : serviceType === 'home-visit' ? 'bg-gradient-to-br from-green-50 to-green-100'
                        : 'bg-gradient-to-br from-violet-50 to-violet-100'
                      }`}>
                        <svg className={`w-8 h-8 md:w-10 md:h-10 ${
                          serviceType === 'consultation' ? 'text-blue-600'
                          : serviceType === 'home-visit' ? 'text-green-600'
                          : 'text-violet-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 truncate">{vet.name}</h3>
                      {vet.specialization && (
                        <p className="text-sm md:text-base text-gray-600 mb-2">{vet.specialization}</p>
                      )}
                      {/* Mostrar distancia solo para urgencias */}
                      {(serviceType === 'emergency-home' || serviceType === 'emergency-clinic') && vet.distancia && (
                        <div className="flex items-center gap-1.5 text-sm text-violet-600 font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{(vet.distancia / 1000).toFixed(1)} km</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {vet.comuna && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="truncate">{vet.comuna}{vet.region ? `, ${vet.region}` : ''}</span>
                    </div>
                  )}

                  <button className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                    serviceType === 'consultation' ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : serviceType === 'home-visit' ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                  } group-hover:shadow-lg`}>
                    Seleccionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Renderizado principal
  if (step === 'loading') return renderLoading();
  if (step === 'emergency-type') return renderEmergencyType();
  if (step === 'vet-selection') return renderVetSelection();
  return renderServiceSelection();
};

export default VetSearchPage;

