import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import PetAvatar from '../../components/PetAvatar';

const EmergencyHomeRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  
  // Estados
  const [step, setStep] = useState('triage'); // 'triage' | 'payment' | 'confirmation'
  const [user, setUser] = useState(null);
  const [pet, setPet] = useState(null);
  const [petId, setPetId] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Datos del formulario
  const [urgencyReason, setUrgencyReason] = useState('');
  const [urgencyDetails, setUrgencyDetails] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Motivos de urgencia
  const urgencyReasons = [
    { id: 'trauma', label: 'Trauma / Accidente', icon: '🚗', color: 'red' },
    { id: 'bleeding', label: 'Sangrado', icon: '🩸', color: 'red' },
    { id: 'breathing', label: 'Dificultad respiratoria', icon: '😮‍💨', color: 'red' },
    { id: 'seizures', label: 'Convulsiones', icon: '⚡', color: 'red' },
    { id: 'poisoning', label: 'Envenenamiento', icon: '☠️', color: 'red' },
    { id: 'vomiting', label: 'Vómitos persistentes', icon: '🤮', color: 'orange' },
    { id: 'pain', label: 'Dolor intenso', icon: '😣', color: 'orange' },
    { id: 'urinary', label: 'Retención urinaria', icon: '🚫', color: 'orange' },
    { id: 'other', label: 'Otro', icon: '💭', color: 'gray' },
  ];

  useEffect(() => {
    // Obtener usuario
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);

    // Verificar si hay datos de reintento (de una urgencia cancelada)
    const retryData = location.state?.retryData;
    
    if (retryData) {
      // Pre-llenar con datos de la urgencia anterior y ir directamente al paso de pago
      if (retryData.petId) {
        setPetId(retryData.petId);
        fetchPet(retryData.petId);
      }
      
      if (retryData.location) {
        setCoords({
          lat: retryData.location.lat,
          lng: retryData.location.lng
        });
      } else {
        getUserLocation();
      }
      
      if (retryData.triage) {
        if (retryData.triage.mainReason) {
          setUrgencyReason(retryData.triage.mainReason);
        }
        // Mapear notes o details del triage a urgencyDetails
        if (retryData.triage.notes) {
          setUrgencyDetails(retryData.triage.notes);
        } else if (retryData.triage.details) {
          setUrgencyDetails(retryData.triage.details);
        }
      }
      
      // Pre-llenar consentimiento
      setConsentAccepted(true);
      
      // Obtener métodos de pago (simulado)
      const methods = [
        { id: '1', type: 'mastercard', last4: '7509', icon: '💳', isDefault: true },
        { id: '2', type: 'visa', last4: '6653', icon: '💳', expired: true },
        { id: '3', type: 'cash', label: 'Efectivo', icon: '💵' },
      ];
      setPaymentMethods(methods);
      setSelectedPaymentMethod('1'); // Método por defecto
      
      // Ir directamente al paso de pago
      setStep('payment');
    } else {
      // Obtener petId de la URL (comportamiento normal)
      const params = new URLSearchParams(location.search);
      const petIdParam = params.get('petId');
      if (petIdParam) {
        setPetId(petIdParam);
        fetchPet(petIdParam);
      }

      // Obtener ubicación
      getUserLocation();
      
      // Obtener métodos de pago (simulado)
      fetchPaymentMethods();
    }
  }, [location, navigate]);

  const getUserLocation = () => {
    // Usar ubicación de prueba para demostración (Santiago, Chile)
    setCoords({
      lat: -33.4489,
      lng: -70.6693
    });
    
    /* Código original para cuando se requiera ubicación real:
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          setError('No pudimos obtener tu ubicación. Asegúrate de tener el GPS activado.');
          // Fallback a ubicación de prueba
          setCoords({ lat: -33.4489, lng: -70.6693 });
        }
      );
    }
    */
  };

  const fetchPet = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/pets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPet(res.data);
    } catch (error) {
      console.error('Error al obtener mascota:', error);
    }
  };

  const fetchPaymentMethods = () => {
    // Simulación de métodos de pago guardados
    // En producción, esto vendría del backend
    const methods = [
      { id: '1', type: 'mastercard', last4: '7509', icon: '💳', isDefault: true },
      { id: '2', type: 'visa', last4: '6653', icon: '💳', expired: true },
      { id: '3', type: 'cash', label: 'Efectivo', icon: '💵' },
    ];
    setPaymentMethods(methods);
    // Solo establecer método por defecto si no hay uno ya seleccionado
    if (!selectedPaymentMethod) {
      setSelectedPaymentMethod('1');
    }
  };

  const handleTriageSubmit = () => {
    if (!urgencyReason) {
      setError('Por favor selecciona el motivo de la urgencia');
      return;
    }
    if (!consentAccepted) {
      setError('Debes aceptar los términos y consentimiento');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handleConfirmEmergency = async () => {
    if (!selectedPaymentMethod) {
      setError('Selecciona un método de pago');
      return;
    }

    if (!coords.lat || !coords.lng) {
      setError('No pudimos obtener tu ubicación. Por favor verifica los permisos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Determinar flags críticos según el motivo
      const criticalReasons = ['trauma', 'bleeding', 'breathing', 'seizures', 'poisoning'];
      const isCritical = criticalReasons.includes(urgencyReason);
      
      // Crear solicitud de urgencia con el formato del backend
      const emergencyData = {
        petId: petId,
        mode: 'home',
        triage: {
          mainReason: urgencyReason,
          details: urgencyDetails,
          criticalFlags: isCritical ? [urgencyReason] : []
        },
        location: {
          address: 'Dirección del usuario', // TODO: Obtener dirección real
          lat: coords.lat,
          lng: coords.lng,
          accessNotes: ''
        },
        assignment: {
          strategy: 'auto', // Asignación automática al más cercano
          preferredVetId: null
        },
        consent: {
          tosAccepted: consentAccepted,
          recordShare: true
        },
        payment: {
          method: selectedPaymentMethod === '3' ? 'cash' : 'mercadopago',
          savedTokenId: selectedPaymentMethod === '3' ? null : selectedPaymentMethod
        }
      };

      const response = await axios.post(
        `${API_BASE}/api/emergency/create`,
        emergencyData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Redirigir a página de seguimiento
        const requestId = response.data.request._id;
        navigate(`/emergency/${requestId}/tracking`);
      } else {
        setError(response.data.message || 'Error al crear la solicitud');
      }
    } catch (err) {
      console.error('Error al solicitar urgencia:', err);
      
      // Manejar error 409 (urgencia duplicada)
      if (err.response?.status === 409) {
        const serverMessage = err.response?.data?.message || 'Ya tienes una urgencia activa para esta mascota.';
        setError(serverMessage);
        
        // Si hay un requestId, redirigir a la urgencia existente después de 2 segundos
        if (err.response?.data?.requestId) {
          const existingId = err.response.data.requestId;
          setTimeout(() => {
            navigate(`/emergency/${existingId}/tracking`);
          }, 2000);
        }
      } else {
        const message = err.response?.data?.message || 'Hubo un error al procesar tu solicitud. Por favor intenta nuevamente.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Vista: Triaje
  const renderTriage = () => (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 py-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Urgencia a Domicilio</h1>
        <p className="text-red-100 text-sm mt-1">Llegaremos lo antes posible</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Información de la mascota */}
        {pet && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                <PetAvatar 
                  image={pet.image} 
                  species={pet.species} 
                  name={pet.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{pet.name}</h3>
                <p className="text-gray-600 text-sm">{pet.species} • {pet.breed}</p>
              </div>
            </div>
          </div>
        )}

        {/* Motivo de urgencia */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-lg mb-3">¿Qué le está pasando?</h2>
          <p className="text-sm text-gray-600 mb-4">Selecciona el motivo principal</p>
          
          <div className="grid grid-cols-2 gap-3">
            {urgencyReasons.map((reason) => (
              <button
                key={reason.id}
                onClick={() => setUrgencyReason(reason.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  urgencyReason === reason.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-red-200'
                }`}
              >
                <div className="text-3xl mb-2">{reason.icon}</div>
                <div className="text-sm font-medium text-gray-900">{reason.label}</div>
              </button>
            ))}
          </div>

          {/* Detalles adicionales */}
          {urgencyReason && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detalles adicionales (opcional)
              </label>
              <textarea
                value={urgencyDetails}
                onChange={(e) => setUrgencyDetails(e.target.value)}
                placeholder="Describe brevemente lo que observas..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows="3"
              />
            </div>
          )}
        </div>

        {/* Consentimiento */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-lg mb-3">Consentimiento y términos</h2>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600 max-h-40 overflow-y-auto">
            <p className="mb-2">Al solicitar este servicio de urgencia veterinaria a domicilio, declaro que:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>La información proporcionada es verídica</li>
              <li>Autorizo el tratamiento veterinario de emergencia</li>
              <li>Entiendo que se cobrará el servicio según tarifa vigente</li>
              <li>El veterinario evaluará la situación al llegar</li>
              <li>Pueden aplicarse cargos adicionales según tratamiento</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              Acepto los <span className="text-red-600 font-medium">términos y condiciones</span> y autorizo la atención veterinaria de emergencia
            </span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Botón flotante */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleTriageSubmit}
          disabled={!urgencyReason || !consentAccepted}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
            urgencyReason && consentAccepted
              ? 'bg-red-600 hover:bg-red-700 active:scale-95'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continuar
        </button>
      </div>
    </div>
  );

  // Vista: Método de pago
  const renderPayment = () => (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-4 sticky top-0 z-10">
        <button onClick={() => setStep('triage')} className="mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Método de pago</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Resumen de urgencia */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🚨</span>
            <h3 className="font-semibold text-red-900">Urgencia Veterinaria</h3>
          </div>
          <p className="text-sm text-red-800">
            {urgencyReasons.find(r => r.id === urgencyReason)?.label}
          </p>
          {pet && (
            <p className="text-sm text-red-700 mt-1">
              Paciente: {pet.name}
            </p>
          )}
        </div>

        {/* Métodos de pago */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-lg">Métodos de pago</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => !method.expired && setSelectedPaymentMethod(method.id)}
                disabled={method.expired}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                  method.expired
                    ? 'bg-gray-50 cursor-not-allowed opacity-50'
                    : selectedPaymentMethod === method.id
                    ? 'bg-gray-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl">{method.icon}</div>
                <div className="flex-1">
                  {method.type === 'cash' ? (
                    <div className="font-medium">{method.label}</div>
                  ) : (
                    <>
                      <div className="font-medium">
                        {method.type === 'mastercard' ? 'Mastercard' : method.type === 'visa' ? 'Visa' : method.type}
                      </div>
                      <div className="text-sm text-gray-600">••• {method.last4}</div>
                      {method.expired && (
                        <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Vencida
                        </div>
                      )}
                    </>
                  )}
                </div>
                {selectedPaymentMethod === method.id && !method.expired && (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}

            {/* Agregar método */}
            <button
              onClick={() => alert('Agregar método de pago - Por implementar')}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="font-medium text-gray-700">Agregar método de pago</div>
            </button>
          </div>
        </div>

        {/* Información importante */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Tarifa de urgencia domiciliaria</p>
              <p>Se cobrará una tarifa base por el servicio de urgencia. Los tratamientos y medicamentos se cobrarán según corresponda.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Botón flotante */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleConfirmEmergency}
          disabled={!selectedPaymentMethod || loading}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
            selectedPaymentMethod && !loading
              ? 'bg-red-600 hover:bg-red-700 active:scale-95'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Buscando veterinario...</span>
            </div>
          ) : (
            'Solicitar Urgencia'
          )}
        </button>
      </div>
    </div>
  );

  // Renderizado principal
  if (step === 'payment') return renderPayment();
  return renderTriage();
};

export default EmergencyHomeRequestPage;

