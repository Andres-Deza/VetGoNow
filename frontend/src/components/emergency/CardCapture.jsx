import React, { useEffect, useRef, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';

const CardCapture = ({ onTokenGenerated, onError, publicKey }) => {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    cardExpirationMonth: '',
    cardExpirationYear: '',
    securityCode: ''
  });
  const [errors, setErrors] = useState({});
  const mercadoPagoRef = useRef(null);
  const cardFormRef = useRef(null);

  // Cargar SDK de Mercado Pago
  useEffect(() => {
    if (!publicKey) {
      console.warn('Mercado Pago Public Key no configurada');
      return;
    }

    // Verificar si el script ya está cargado
    if (window.MercadoPago) {
      initializeMercadoPago();
      return;
    }

    // Cargar script de Mercado Pago
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      initializeMercadoPago();
    };
    script.onerror = () => {
      if (onError) {
        onError('Error al cargar el SDK de Mercado Pago');
      }
    };
    document.body.appendChild(script);

    return () => {
      // Limpiar si es necesario
    };
  }, [publicKey]);

  const initializeMercadoPago = () => {
    if (!window.MercadoPago || !publicKey) return;

    try {
      const mp = new window.MercadoPago(publicKey, {
        locale: 'es-CL'
      });
      mercadoPagoRef.current = mp;
    } catch (error) {
      console.error('Error al inicializar Mercado Pago:', error);
      if (onError) {
        onError('Error al inicializar Mercado Pago');
      }
    }
  };

  const validateCard = () => {
    const newErrors = {};

    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Número de tarjeta inválido';
    }

    if (!cardData.cardholderName || cardData.cardholderName.length < 3) {
      newErrors.cardholderName = 'Nombre del titular requerido';
    }

    if (!cardData.cardExpirationMonth || cardData.cardExpirationMonth < 1 || cardData.cardExpirationMonth > 12) {
      newErrors.cardExpirationMonth = 'Mes inválido';
    }

    const currentYear = new Date().getFullYear() % 100;
    const cardYear = parseInt(cardData.cardExpirationYear);
    if (!cardData.cardExpirationYear || cardYear < currentYear) {
      newErrors.cardExpirationYear = 'Año inválido';
    }

    if (!cardData.securityCode || cardData.securityCode.length < 3) {
      newErrors.securityCode = 'Código de seguridad inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value) => {
    // Remover espacios y caracteres no numéricos
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Agregar espacios cada 4 dígitos
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ').substr(0, 19) || cleaned;
    return formatted;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData(prev => ({ ...prev, cardNumber: formatted }));
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: null }));
    }
  };

  const handleGenerateToken = async () => {
    if (!validateCard()) {
      return;
    }

    if (!mercadoPagoRef.current) {
      if (onError) {
        onError('Mercado Pago no está inicializado. Por favor recarga la página.');
      }
      return;
    }

    setLoading(true);

    try {
      // Crear token de tarjeta a través del backend (más seguro)
      const API_BASE = import.meta.env.VITE_API_BASE || '';
      const token = localStorage.getItem('token');
      
      const tokenResponse = await fetch(`${API_BASE}/api/payment/mercadopago/card-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cardNumber: cardData.cardNumber,
          cardholderName: cardData.cardholderName,
          expirationMonth: cardData.cardExpirationMonth,
          expirationYear: cardData.cardExpirationYear,
          securityCode: cardData.securityCode
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || 'Error al generar token de tarjeta');
      }

      const tokenData = await tokenResponse.json();
      
      if (tokenData.success && tokenData.token && onTokenGenerated) {
        onTokenGenerated({
          token: tokenData.token,
          cardData: tokenData.cardData ? {
            ...tokenData.cardData,
            // Asegurar que expMonth y expYear estén incluidos desde el formulario si no vienen del backend
            expMonth: tokenData.cardData.expMonth || parseInt(cardData.cardExpirationMonth) || null,
            expYear: tokenData.cardData.expYear || (cardData.cardExpirationYear ? parseInt('20' + String(cardData.cardExpirationYear).padStart(2, '0')) : null)
          } : {
            last4: cardData.cardNumber.slice(-4).replace(/\s/g, ''),
            brand: 'credit_card',
            expMonth: parseInt(cardData.cardExpirationMonth) || null,
            expYear: cardData.cardExpirationYear ? parseInt('20' + String(cardData.cardExpirationYear).padStart(2, '0')) : null
          },
          cardholderName: cardData.cardholderName
        });
      } else {
        throw new Error('Error al procesar la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error al generar token:', error);
      if (onError) {
        onError(error.message || 'Error al procesar la tarjeta. Verifica los datos e intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">Agregar nueva tarjeta</h4>
      
      <div className="space-y-4">
        {/* Número de tarjeta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de tarjeta
          </label>
          <input
            type="text"
            maxLength="19"
            placeholder="1234 5678 9012 3456"
            value={cardData.cardNumber}
            onChange={handleCardNumberChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.cardNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.cardNumber && (
            <p className="text-xs text-red-600 mt-1">{errors.cardNumber}</p>
          )}
        </div>

        {/* Nombre del titular */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del titular
          </label>
          <input
            type="text"
            placeholder="Como aparece en la tarjeta"
            value={cardData.cardholderName}
            onChange={(e) => {
              setCardData(prev => ({ ...prev, cardholderName: e.target.value }));
              if (errors.cardholderName) {
                setErrors(prev => ({ ...prev, cardholderName: null }));
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.cardholderName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.cardholderName && (
            <p className="text-xs text-red-600 mt-1">{errors.cardholderName}</p>
          )}
        </div>

        {/* Fecha de expiración y código de seguridad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de expiración
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                max="12"
                placeholder="MM"
                value={cardData.cardExpirationMonth}
                onChange={(e) => {
                  setCardData(prev => ({ ...prev, cardExpirationMonth: e.target.value }));
                  if (errors.cardExpirationMonth) {
                    setErrors(prev => ({ ...prev, cardExpirationMonth: null }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.cardExpirationMonth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              <input
                type="number"
                min={new Date().getFullYear() % 100}
                max="99"
                placeholder="AA"
                value={cardData.cardExpirationYear}
                onChange={(e) => {
                  setCardData(prev => ({ ...prev, cardExpirationYear: e.target.value }));
                  if (errors.cardExpirationYear) {
                    setErrors(prev => ({ ...prev, cardExpirationYear: null }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.cardExpirationYear ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
            </div>
            {(errors.cardExpirationMonth || errors.cardExpirationYear) && (
              <p className="text-xs text-red-600 mt-1">
                {errors.cardExpirationMonth || errors.cardExpirationYear}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de seguridad
            </label>
            <input
              type="text"
              maxLength="4"
              placeholder="123"
              value={cardData.securityCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setCardData(prev => ({ ...prev, securityCode: value }));
                if (errors.securityCode) {
                  setErrors(prev => ({ ...prev, securityCode: null }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.securityCode ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.securityCode && (
              <p className="text-xs text-red-600 mt-1">{errors.securityCode}</p>
            )}
          </div>
        </div>

        {/* Botón para generar token */}
        <button
          type="button"
          onClick={handleGenerateToken}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              <span>Procesando...</span>
            </>
          ) : (
            'Agregar tarjeta'
          )}
        </button>
      </div>
    </div>
  );
};

export default CardCapture;

