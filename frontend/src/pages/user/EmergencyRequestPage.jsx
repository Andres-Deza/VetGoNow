import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import PetHeader from '../../components/emergency/PetHeader';
import AttentionTypeSelector from '../../components/emergency/AttentionTypeSelector';
import TriageForm from '../../components/emergency/TriageForm';
import LocationSelector from '../../components/emergency/LocationSelector';
import LocationInput from '../../components/emergency/LocationInput';
import VetAssignment from '../../components/emergency/VetAssignment';
import ClinicSelector from '../../components/emergency/ClinicSelector';
import AdditionalDetailsForm from '../../components/emergency/AdditionalDetailsForm';
import CostSummary from '../../components/emergency/CostSummary';
import PaymentSection from '../../components/emergency/PaymentSection';
import DebugPanel from '../../components/emergency/DebugPanel';
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const REASON_LABELS = {
  trauma: 'Golpe/Trauma',
  bleeding: 'Sangrado',
  seizures: 'Convulsión',
  choking: 'Ahogo',
  vomiting: 'Vómitos persistentes',
  poisoning: 'Envenenamiento',
  fever: 'Fiebre alta',
  urination: 'Retención urinaria',
  pain: 'Dolor intenso',
  other: 'Otro'
};

const EmergencyRequestPage = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams] = useSearchParams();
  const petIdFromUrl = searchParams.get('petId');
  const modeFromUrl = searchParams.get('mode'); // 'home', 'clinic', 'telemedicine'

  // Estados principales
  const [pet, setPet] = useState(null);
  const [mode, setMode] = useState(modeFromUrl || 'home'); // 'home', 'clinic', 'telemedicine'
  const [triage, setTriage] = useState(null);
  const [location, setLocation] = useState(null);
  const [assignment, setAssignment] = useState({ strategy: 'auto', preferredVetId: null });
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const [payment, setPayment] = useState({ method: isDev ? 'dev_bypass' : 'mercadopago', savedTokenId: isDev ? 'dev_test' : null });
  const [consent, setConsent] = useState({ tosAccepted: false, recordShare: false });
  const [selectedVet, setSelectedVet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false);
  const [activeEmergencyId, setActiveEmergencyId] = useState(null);
  const [userName, setUserName] = useState('');
  const steps = mode === 'clinic' 
    ? [
        { id: 'pet', title: 'Mascota y motivo' },
        { id: 'location', title: 'Ubicación de partida' },
        { id: 'clinic', title: 'Seleccionar clínica' },
        { id: 'review', title: 'Resumen' }
      ]
    : [
        { id: 'pet', title: 'Mascota y atención' },
        { id: 'triage', title: 'Motivo y signos' },
        { id: 'location', title: 'Ubicación' },
        { id: 'vet', title: 'Profesional' },
        { id: 'review', title: 'Resumen' }
      ];
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = steps.length;
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingConfig, setPricingConfig] = useState(null); // Configuración de precios del admin
  const [savedAddresses, setSavedAddresses] = useState([]);
  
  // Obtener configuración de precios del backend para calcular precios mínimos
  useEffect(() => {
    const fetchPricingConfig = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
        // Obtener configuración de precios pública (endpoint público, no requiere autenticación)
        const response = await axios.get(`${API_BASE}/api/pricing/public`);
        
        if (response.data.success && response.data.data) {
          setPricingConfig(response.data.data);
        }
      } catch (error) {
        // Si falla, usar valores por defecto
        console.warn('No se pudo obtener configuración de precios, usando valores por defecto:', error);
        setPricingConfig(null);
      }
    };
    
    fetchPricingConfig();
  }, []);

  // Cargar direcciones guardadas del usuario
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
        const response = await axios.get(`${API_BASE}/api/addresses`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success && response.data.addresses) {
          setSavedAddresses(response.data.addresses);
        }
      } catch (error) {
        // No mostrar error si falla, simplemente no mostrar direcciones guardadas
        console.error('Error al cargar direcciones guardadas:', error);
        setSavedAddresses([]);
      }
    };

    // Solo cargar direcciones si es modo 'home'
    if (mode === 'home') {
      fetchSavedAddresses();
    }
  }, [mode]);

  // Verificar autenticación y cargar mascota
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Obtener nombre del usuario
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || '');
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Verificar si hay datos de reintento (de una urgencia cancelada)
    const retryData = routerLocation.state?.retryData;
    
    if (retryData) {
      // Pre-llenar con datos de la urgencia anterior
      if (retryData.petId) {
        fetchPet(retryData.petId);
      }
      
      if (retryData.location) {
        setLocation({
          lat: retryData.location.lat,
          lng: retryData.location.lng,
          address: retryData.location.address || '',
          accessNotes: retryData.location.accessNotes || ''
        });
      }
      
      if (retryData.triage) {
        setTriage({
          mainReason: retryData.triage.mainReason || '',
          criticalFlags: retryData.triage.criticalFlags || [],
          onsetMinutes: retryData.triage.onsetMinutes || null,
          notes: retryData.triage.notes || '',
          details: retryData.triage.notes || ''
        });
      }
      
      // Pre-llenar consentimiento
      setConsent({ tosAccepted: true, recordShare: true });
      
      // Establecer modo según retryData o por defecto 'home'
      if (retryData.mode) {
        setMode(retryData.mode);
      } else {
        setMode('home');
      }
    } else if (petIdFromUrl) {
      fetchPet(petIdFromUrl);
      // Si viene mode desde URL, establecerlo
      if (modeFromUrl && ['home', 'clinic', 'telemedicine'].includes(modeFromUrl)) {
        setMode(modeFromUrl);
      }
    } else {
      // Si no hay petId, redirigir a selección de mascotas
      navigate('/mypets?continue=true&from=emergency');
    }
  }, [petIdFromUrl, modeFromUrl, routerLocation, navigate]);

  const fetchPet = async (petId) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
      
      // Cargar mascota
      const response = await axios.get(
        `${API_BASE}/api/pets/${petId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data) {
        setPet(response.data);
        
        // Verificar si ya existe una urgencia activa para esta mascota
        try {
          const emergencyResponse = await axios.get(
            `${API_BASE}/api/emergency/user-active`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          const emergencies = emergencyResponse.data?.emergencies || [];
          const activeForThisPet = emergencies.find(
            (emergency) => 
              (emergency.petId?._id?.toString() === petId || 
               emergency.petId?.toString() === petId ||
               emergency.pet?._id?.toString() === petId ||
               emergency.pet?.id?.toString() === petId)
          );
          
          if (activeForThisPet) {
            setHasActiveEmergency(true);
            setActiveEmergencyId(
              activeForThisPet.id || 
              activeForThisPet._id || 
              activeForThisPet.requestId
            );
            setError(`Ya tienes una urgencia activa para ${response.data.name}. Revisa su seguimiento.`);
          } else {
            setHasActiveEmergency(false);
            setActiveEmergencyId(null);
          }
        } catch (emergencyError) {
          // Si falla la verificación, continuar (no es crítico)
          console.log('No se pudo verificar urgencias activas:', emergencyError);
          setHasActiveEmergency(false);
        }
      }
    } catch (error) {
      console.error('Error fetching pet:', error);
      alert('Error al cargar la mascota');
      navigate('/mypets?continue=true&from=emergency');
    }
  };

  useEffect(() => {
    if (mode === 'home') {
      setLocation((prev) => (prev?.lat && prev?.lng ? prev : null));
    } else {
      setLocation((prev) => prev ?? { address: 'Atención en clínica' });
    }
  }, [mode]);

  // Calcular precios desde el backend cuando cambian los parámetros relevantes
  useEffect(() => {
    const fetchPricing = async () => {
      // No calcular precio si falta información necesaria
      if (mode === 'home' && (!location?.lat || !location?.lng)) {
        setPricing(null);
        return;
      }

      // No calcular precio si es modo clinic y no hay vet seleccionado o modo auto
      if (mode === 'clinic' && assignment.strategy === 'manual' && !selectedVet?.location?.coordinates) {
        setPricing(null);
        return;
      }

      setPricingLoading(true);
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
        
        const isCritical = Array.isArray(triage?.criticalFlags) && triage.criticalFlags.length > 0;
        
        let requestBody = {
          mode,
          isCritical,
          lat: location?.lat,
          lng: location?.lng
        };

        // Si hay vet seleccionado, agregar su información
        if (selectedVet) {
          requestBody.vetId = selectedVet._id || selectedVet.id;
          if (selectedVet.location?.coordinates) {
            requestBody.vetLat = selectedVet.location.coordinates[1];
            requestBody.vetLng = selectedVet.location.coordinates[0];
          }
          requestBody.vetType = selectedVet.vetType || 'independent';
        } else {
          // Si no hay vet, usar tipo por defecto (para modo clinic en auto)
          requestBody.vetType = 'independent';
        }

        const response = await axios.post(
          `${API_BASE}/api/emergency/estimate-pricing`,
          requestBody,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success && response.data.pricing) {
          setPricing(response.data.pricing);
        } else {
          setPricing(null);
        }
      } catch (error) {
        console.error('Error al calcular precio:', error);
        setPricing(null);
      } finally {
        setPricingLoading(false);
      }
    };

    fetchPricing();
  }, [mode, location?.lat, location?.lng, selectedVet, assignment.strategy, triage?.criticalFlags, pet]);

  useEffect(() => {
    if (mode !== 'home' && assignment.strategy !== 'auto') {
      setAssignment({ strategy: 'auto', preferredVetId: null });
      setSelectedVet(null);
    }
  }, [mode, assignment.strategy]);

  // El consentimiento ahora se acepta automáticamente al hacer clic en el botón de continuar (handleSubmit)

  const handleSubmit = async () => {
    setError(null);

    // Aceptar automáticamente los términos al continuar (ya no hay checkbox, se aceptan al hacer clic en el botón)
    const finalConsent = { tosAccepted: true, recordShare: true };

    // Validaciones
    if (!pet) {
      setError('Por favor selecciona una mascota');
      return;
    }

    // Validar que no haya urgencia activa
    if (hasActiveEmergency && activeEmergencyId) {
      setError(`Ya tienes una urgencia activa para ${pet.name}. Revisa su seguimiento.`);
      setTimeout(() => {
        navigate(`/emergency/${activeEmergencyId}/tracking`);
      }, 2000);
      return;
    }

    if (!triage || !triage.mainReason) {
      setError('Por favor completa el motivo de la consulta');
      return;
    }

    if (mode === 'home' && (!location || !location.address || !location.lat || !location.lng)) {
      setError('Por favor completa la ubicación');
      return;
    }

    if (assignment.strategy === 'manual' && !assignment.preferredVetId) {
      setError('Selecciona un veterinario');
      return;
    }

    // Ya no requerimos checkbox de términos, se aceptan automáticamente al continuar
    // if (!consent.tosAccepted) {
    //   setError('Debes aceptar los términos y condiciones');
    //   return;
    // }

    if (!pricing) {
      setError('Error al calcular el costo. Por favor verifica la ubicación e intenta nuevamente.');
      return;
    }
    
    if (pricing.total === 0 || pricing.total < 0) {
      setError('El costo calculado no es válido. Por favor intenta nuevamente.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
      
      // Crear la solicitud de urgencia
      const payloadLocation = mode === 'home'
        ? location
        : (location || { address: 'Atención en clínica' });

      const response = await axios.post(
        `${API_BASE}/api/emergency/create`,
        {
          petId: pet._id || pet.id,
          mode,
          triage,
          location: payloadLocation,
          assignment,
          consent: finalConsent, // Usar el consentimiento automático (aceptado al continuar)
          payment
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const requestId = response.data.request._id || response.data.request.id;
        
        // Redirigir a la página de tracking
        navigate(`/emergency/${requestId}/tracking`);
      } else {
        setError(response.data.message || 'Error al crear la solicitud');
      }
    } catch (error) {
      console.error('❌ Error creating emergency request:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Mensajes de error más específicos
      let errorMessage = 'Error al crear la solicitud. Por favor intenta nuevamente.';
      
      if (error.response) {
        // El servidor respondió con un error
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        const errorDetails = error.response.data?.error;
        
        switch (status) {
          case 400:
            errorMessage = `Error de validación: ${serverMessage || 'Verifica que todos los campos estén completos'}`;
            break;
          case 409:
            errorMessage = serverMessage || 'Ya tienes una urgencia activa para esta mascota.';
            if (error.response.data?.requestId) {
              const existingId = error.response.data.requestId;
              setTimeout(() => navigate(`/emergency/${existingId}/tracking`), 1500);
            }
            break;
          case 401:
            errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => navigate('/login'), 2000);
            break;
          case 403:
            errorMessage = 'No tienes permisos para realizar esta acción.';
            break;
          case 404:
            errorMessage = serverMessage || 'Mascota no encontrada. Por favor selecciona otra mascota.';
            break;
          case 500:
            errorMessage = `Error del servidor: ${errorDetails || serverMessage || 'Intenta nuevamente más tarde'}`;
            break;
          default:
            errorMessage = serverMessage || errorMessage;
        }
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:5555';
      } else {
        // Algo pasó al configurar la petición
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVetsLoad = (lat, lng) => {
    // Cuando se carga la ubicación, buscar veterinarios cercanos
    // Esto se maneja en VetAssignment
  };

  const handleVetSelect = (vet) => {
    setSelectedVet(vet);
  };

  const canProceed = useMemo(() => {
    if (mode === 'clinic') {
      switch (currentStep) {
        case 0:
          return !!pet && !!triage?.mainReason;
        case 1:
          return !!location?.lat && !!location?.lng && !!location?.address;
        case 2:
          return assignment.strategy !== 'manual' || !!assignment.preferredVetId;
        case 3:
          return pricing != null && !loading;
        default:
          return true;
      }
    } else {
      switch (currentStep) {
        case 0:
          return !!pet;
        case 1:
          return !!triage?.mainReason;
        case 2:
          return !!location?.lat && !!location?.lng && !!location?.address;
        case 3:
          return assignment.strategy !== 'manual' || !!assignment.preferredVetId;
        case 4:
          return pricing != null && !loading;
        default:
          return true;
      }
    }
  }, [currentStep, pet, triage, mode, location, assignment, pricing, consent, loading]);

  const isFinalStep = currentStep === totalSteps - 1;
  const reasonLabel = triage?.mainReason
    ? REASON_LABELS[triage.mainReason] || triage.mainReason
    : 'Sin informar';

  const handleNext = async () => {
    // No permitir avanzar si hay urgencia activa
    if (hasActiveEmergency && activeEmergencyId) {
      setError(`Ya tienes una urgencia activa para ${pet?.name}. Revisa su seguimiento.`);
      setTimeout(() => {
        navigate(`/emergency/${activeEmergencyId}/tracking`);
      }, 2000);
      return;
    }
    if (loading || !canProceed) return;
    if (isFinalStep) {
      await handleSubmit();
    } else {
      setError(null);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const handleBack = () => {
    if (loading || currentStep === 0) return;
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Calcular precio mínimo estimado cuando no hay precio calculado
  const calculateMinPrice = () => {
    // Si hay un precio calculado desde el backend, usarlo
    if (pricing?.total) {
      return pricing.total;
    }
    
    // Obtener valores de la configuración o usar valores por defecto
    const getConfigValue = (path, defaultValue) => {
      if (!pricingConfig?.emergency) return defaultValue;
      const keys = path.split('.').slice(1); // Remover 'emergency' del path ya que pricingConfig solo tiene emergency
      let value = pricingConfig.emergency;
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined || value === null) return defaultValue;
      }
      return value || defaultValue;
    };
    
    // Si hay un veterinario seleccionado, usar su tipo para calcular el precio mínimo
    if (selectedVet && selectedVet.vetType) {
      if (selectedVet.vetType === 'clinic') {
        // Clínica: diferentes precios según modalidad
        if (mode === 'clinic') {
          // Urgencia presencial en clínica
          return getConfigValue('emergency.clinic.clinic.normalHours', 24990);
        } else {
          // Urgencia a domicilio
          return getConfigValue('emergency.clinic.home.normalHours', 24990);
        }
      } else {
        // Independiente: solo a domicilio
        return getConfigValue('emergency.independent.home.normalHours', 19990);
      }
    }
    
    // Si no hay vet seleccionado (asignación automática), mostrar rango mínimo (independiente es más barato)
    if (mode === 'clinic') {
      // Solo clínicas pueden ofrecer urgencias presenciales
      return getConfigValue('emergency.clinic.clinic.normalHours', 24990);
    }
    // Para domicilio: precio mínimo independiente (ya incluye desplazamiento)
    return getConfigValue('emergency.independent.home.normalHours', 19990);
  };

  const totalToDisplay = pricing?.total ?? null;
  const minEstimatedPrice = calculateMinPrice();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-28 md:pb-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
          {/* Header - Mejorado para móvil */}
          <div className="mb-3 md:mb-8 pt-3 md:pt-8">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
              Solicitar Consulta Urgente
            </h1>
            <p className="text-xs md:text-base text-gray-600">
              Completa el formulario para solicitar atención veterinaria urgente
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 md:p-4 mb-3 md:mb-6 rounded">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm md:text-base text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-4 md:mb-6">
            <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide">
              Paso {currentStep + 1} de {totalSteps}
            </p>
            <div className="flex items-center gap-2 mt-2 md:mt-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <h2 className="mt-3 md:mt-4 text-lg md:text-2xl font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
          </div>

        {currentStep === 0 && (
          <>
            <PetHeader
              pet={pet}
              onEdit={() => navigate('/mypets?continue=true&from=emergency')}
            />
            {hasActiveEmergency && activeEmergencyId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      Ya tienes una urgencia activa para {pet?.name}
                    </p>
                    <p className="text-xs text-yellow-700 mb-3">
                      No puedes crear otra urgencia hasta que se complete o cancele la actual.
                    </p>
                    <button
                      onClick={() => navigate(`/emergency/${activeEmergencyId}/tracking`)}
                      className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                    >
                      Ver urgencia activa →
                    </button>
                  </div>
                </div>
              </div>
            )}
            <AttentionTypeSelector
              mode={mode}
              onChange={setMode}
              disabled={loading || hasActiveEmergency}
            />
            {mode === 'clinic' && (
              <div className="mt-4">
                <TriageForm
                  triage={triage || { mainReason: '', criticalFlags: [], notes: '', attachments: [] }}
                  onChange={setTriage}
                />
              </div>
            )}
          </>
        )}

        {currentStep === 1 && (
          mode === 'home' ? (
            <TriageForm
              triage={triage || { mainReason: '', criticalFlags: [], notes: '', attachments: [] }}
              onChange={setTriage}
            />
          ) : (
            <LocationInput
              location={location}
              onChange={setLocation}
              savedAddresses={mode === 'home' ? savedAddresses : []}
            />
          )
        )}

        {currentStep === 2 && (
          mode === 'home' ? (
            <LocationSelector
              mode={mode}
              location={location}
              onChange={setLocation}
              onVetsLoad={handleVetsLoad}
            />
          ) : (
            <ClinicSelector
              location={location}
              assignment={assignment}
              onChange={setAssignment}
              onVetSelect={handleVetSelect}
              showDistance={true}
            />
          )
        )}

        {currentStep === 3 && (
          mode === 'home' ? (
            <VetAssignment
              mode={mode}
              location={location}
              assignment={assignment}
              onChange={setAssignment}
              onVetSelect={handleVetSelect}
            />
          ) : null
        )}

        {currentStep === (mode === 'clinic' ? 3 : 4) && mode === 'clinic' && (
          <>
            {/* Header de Clínica */}
            {selectedVet && (
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedVet.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedVet.tradeName || selectedVet.name}</h2>
                  {selectedVet.clinicEmail && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <span>✉</span>
                      <span>{selectedVet.clinicEmail}</span>
                    </div>
                  )}
                  {selectedVet.clinicPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>📞</span>
                      <span>{selectedVet.clinicPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Banner de saludo */}
            {userName && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                <p className="text-base text-gray-800">
                  Hola <strong>{userName}</strong>, completa los siguientes campos para solicitar atención de urgencia inmediata
                </p>
              </div>
            )}

            {/* Sección de solicitud de urgencia */}
            <div className="bg-red-600 text-white p-4 rounded-lg mb-4 flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <h3 className="text-xl font-bold">Solicitar urgencia</h3>
            </div>

            {/* Alerta informativa */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded flex items-start gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div>
                <p className="text-sm text-gray-800 font-medium mb-1">Urgencia - Atención inmediata</p>
                <p className="text-sm text-gray-700">
                  Esta es una urgencia. La atención se coordinará de inmediato con la clínica disponible más cercana.
                </p>
              </div>
            </div>

            {/* Sección de mascota */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mascota</label>
              <div className="bg-white border-2 border-purple-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="text-2xl">🐕</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{pet?.name || 'Sin definir'}</p>
                    <p className="text-sm text-gray-600">{pet?.breed || ''}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/mypets?continue=true&from=emergency')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Cambiar
                </button>
              </div>
            </div>


            {/* Alerta de pago */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded flex items-start gap-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <p className="text-sm text-yellow-800">
                El horario seleccionado no está garantizado hasta completar el pago exitosamente. Si no completas el pago, otra persona podrá reservar este mismo horario.
              </p>
            </div>
          </>
        )}

        {currentStep === (mode === 'clinic' ? 3 : 4) && mode === 'home' && (
          <>
            <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
                Resumen de la solicitud
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm md:text-base text-gray-700">
                <div>
                  <dt className="font-medium text-gray-500">Mascota</dt>
                  <dd className="text-gray-900">{pet?.name ?? 'Sin definir'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Tipo de atención</dt>
                  <dd className="text-gray-900">Urgencia a domicilio</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Motivo principal</dt>
                  <dd className="text-gray-900">{reasonLabel}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Ubicación</dt>
                  <dd className="text-gray-900">{location?.address ?? 'Sin definir'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Veterinario</dt>
                  <dd className="text-gray-900">
                    {assignment.strategy === 'auto'
                      ? 'Asignación automática'
                      : selectedVet?.name ?? 'Selecciona un profesional'}
                  </dd>
                </div>
              </dl>
            </div>

            <CostSummary pricing={pricing} />

            {pricing && (
              <PaymentSection
                payment={payment}
                onChange={setPayment}
              />
            )}
          </>
        )}

          {currentStep === 5 && mode === 'home' && (
            <>
              <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
                  Resumen de la solicitud
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm md:text-base text-gray-700">
                  <div>
                    <dt className="font-medium text-gray-500">Mascota</dt>
                    <dd className="text-gray-900">{pet?.name ?? 'Sin definir'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Tipo de atención</dt>
                    <dd className="text-gray-900">
                      {mode === 'home' ? 'Urgencia a domicilio' : 'Atención en clínica'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Motivo principal</dt>
                    <dd className="text-gray-900">{reasonLabel}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Ubicación</dt>
                    <dd className="text-gray-900">{location?.address ?? 'Se coordinará con la clínica'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Veterinario</dt>
                    <dd className="text-gray-900">
                      {assignment.strategy === 'auto'
                        ? 'Asignación automática'
                        : selectedVet?.name ?? 'Selecciona un profesional'}
                    </dd>
                  </div>
                </dl>
              </div>

              <CostSummary pricing={pricing} />

              {pricing && (
                <PaymentSection
                  payment={payment}
                  onChange={setPayment}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Botonera inferior */}
      <div className="fixed md:sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 shadow-lg z-50 md:rounded-lg md:-mx-4 md:px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div>
                <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide">
                  Paso {currentStep + 1} de {totalSteps}
                </p>
                <p className="text-sm md:text-lg font-semibold text-gray-900">
                  {steps[currentStep].title}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs md:text-sm text-gray-500">Total estimado</p>
                {totalToDisplay != null ? (
                  <div className="flex flex-col items-end">
                    <p className="text-xl md:text-2xl font-bold text-blue-600">
                      {formatCurrency(totalToDisplay)}
                    </p>
                    <div className="group relative">
                      <p className="text-xs text-gray-500 mt-1 cursor-help underline decoration-dotted">
                        Precio calculado • Métodos de pago
                      </p>
                      {/* Tooltip con información de métodos de pago */}
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <p className="font-semibold mb-2">Método de pago:</p>
                        <ul className="space-y-1 text-gray-300">
                          <li>• Mercado Pago (Billetera Digital)</li>
                        </ul>
                        <p className="mt-2 text-gray-400 italic">
                          El pago se procesará al confirmar la urgencia.
                        </p>
                        <div className="absolute right-4 top-full border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <p className="text-xl md:text-2xl font-bold text-blue-600">
                      Desde {formatCurrency(minEstimatedPrice)}
                    </p>
                    <div className="group relative">
                      <p className="text-xs text-gray-500 mt-1 cursor-help underline decoration-dotted">
                        Precio final al seleccionar veterinario
                      </p>
                      {/* Tooltip con información de métodos de pago */}
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <p className="font-semibold mb-2">Método de pago:</p>
                        <ul className="space-y-1 text-gray-300">
                          <li>• Mercado Pago (Billetera Digital)</li>
                        </ul>
                        <p className="mt-2 text-gray-400 italic">
                          El precio puede variar según distancia y veterinario asignado.
                        </p>
                        <div className="absolute right-4 top-full border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0 || loading}
                className="w-1/3 md:w-auto px-4 py-3 md:px-5 md:py-3 rounded-xl md:rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || hasActiveEmergency}
                className={`
                  flex-1 md:flex-none md:px-6 py-3 md:py-3 rounded-xl md:rounded-lg font-semibold text-base md:text-lg transition-all
                  ${!canProceed
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isFinalStep && mode === 'clinic'
                    ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md'}
                `}
              >
                {isFinalStep ? (
                  loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span className="text-sm md:text-base">Procesando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {mode === 'clinic' ? (
                        <>
                          <span className="text-xl">🚨</span>
                          <span className="text-sm md:text-base">Solicitar urgencia ahora</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="text-sm md:text-base" />
                          <span className="text-sm md:text-base">Solicitar urgencia ahora</span>
                        </>
                      )}
                    </span>
                  )
                ) : (
                  <span className="text-sm md:text-base">Siguiente</span>
                )}
              </button>
            </div>
            {/* Texto de términos y condiciones debajo del botón */}
            {isFinalStep && (
              <p className="text-xs md:text-sm text-gray-500 text-center mt-3">
                Al continuar, aceptas nuestros{' '}
                <a href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                  Términos y Condiciones
                </a>{' '}
                y{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                  Política de Privacidad
                </a>
              </p>
            )}
          </div>
        </div>

      {/* Debug Panel - Solo en desarrollo */}
      <DebugPanel
        pet={pet}
        mode={mode}
        triage={triage}
        location={location}
        assignment={assignment}
        pricing={pricing}
        consent={consent}
        payment={payment}
      />
    </div>
  );
};

export default EmergencyRequestPage;

