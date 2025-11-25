import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaLock } from 'react-icons/fa';
import axios from 'axios';
import CardCapture from './CardCapture';

const PaymentSection = ({ payment, onChange }) => {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const [paymentMethod, setPaymentMethod] = useState(payment?.method || (isDev ? 'dev_bypass' : 'mercadopago'));
  const [savedCards, setSavedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [showCardCapture, setShowCardCapture] = useState(false);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState(null);
  const [cardCaptureError, setCardCaptureError] = useState(null);

  // Cargar Public Key y tarjetas guardadas cuando se selecciona Mercado Pago
  useEffect(() => {
    if (paymentMethod === 'mercadopago') {
      console.log('Mercado Pago seleccionado, cargando configuración...');
      // Cargar Public Key primero
      loadMercadoPagoPublicKey().catch(err => {
        console.error('Error al cargar Public Key:', err);
      });
      // Luego cargar tarjetas
      loadSavedCards();
    } else {
      // Limpiar estado cuando se cambia de método
      setMercadoPagoPublicKey(null);
      setCardCaptureError(null);
      setShowCardCapture(false);
    }
  }, [paymentMethod]);

  const loadMercadoPagoPublicKey = async () => {
    try {
      setCardCaptureError(null);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
      console.log('Solicitando Public Key desde:', `${API_BASE}/api/payment/mercadopago/public-key`);
      
      const response = await axios.get(`${API_BASE}/api/payment/mercadopago/public-key`);
      
      console.log('Respuesta de Public Key:', response.data);
      
      if (response.data && response.data.success && response.data.publicKey) {
        setMercadoPagoPublicKey(response.data.publicKey);
        setCardCaptureError(null);
        console.log('Public Key cargada exitosamente:', response.data.publicKey.substring(0, 15) + '...');
      } else {
        console.error('Public Key no disponible en la respuesta:', response.data);
        setCardCaptureError('La configuración de Mercado Pago no está disponible en el servidor');
      }
    } catch (error) {
      console.error('Error al cargar Public Key de Mercado Pago:', error);
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      setCardCaptureError(`Error al cargar configuración: ${error.response?.data?.message || error.message}. Verifica que el servidor backend esté corriendo.`);
    }
  };

  const loadSavedCards = async () => {
    setLoadingCards(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/payment/mercadopago/cards', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.cards) {
        setSavedCards(response.data.cards.map(card => ({
          id: card._id,
          last4: card.cardInfo.last4,
          brand: card.cardInfo.brand,
          expiry: `${String(card.cardInfo.expMonth).padStart(2, '0')}/${String(card.cardInfo.expYear).slice(-2)}`,
          isDefault: card.isDefault
        })));
      }
    } catch (error) {
      console.error('Error al cargar tarjetas guardadas:', error);
      // Si no hay tarjetas o hay error, simplemente no mostrar nada
      setSavedCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  // Sincronizar con el estado inicial del padre
  React.useEffect(() => {
    if (payment?.method && payment.method !== paymentMethod) {
      setPaymentMethod(payment.method);
    }
  }, [payment?.method]);

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    onChange({
      method,
      savedTokenId: method === 'dev_bypass' ? 'dev_test' : null
    });
  };

  const handleCardSelect = (cardId) => {
    onChange({
      method: paymentMethod,
      savedTokenId: cardId
    });
  };

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
        Método de pago
      </h3>

      {/* Selección de método */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-4">
          {isDev && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="dev_bypass"
                checked={paymentMethod === 'dev_bypass'}
                onChange={(e) => handleMethodChange(e.target.value)}
                className="w-4 h-4 text-green-600 focus:ring-green-500"
              />
              <span className="text-green-700 font-semibold">🚀 Bypass (Dev)</span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              value="mercadopago"
              checked={paymentMethod === 'mercadopago'}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Mercado Pago (Billetera Digital)</span>
          </label>
        </div>
      </div>
      
      {/* Mensaje informativo de bypass */}
      {isDev && paymentMethod === 'dev_bypass' && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>Modo de desarrollo:</strong> El pago será marcado como completado automáticamente sin procesar ninguna transacción real.
          </p>
        </div>
      )}

      {/* Tarjetas guardadas */}
      {paymentMethod === 'mercadopago' && (
        <div className="mb-4">
          {loadingCards ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Cargando tarjetas guardadas...
            </div>
          ) : savedCards.length > 0 ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarjeta guardada
              </label>
              <div className="space-y-2">
                {savedCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardSelect(card.id)}
                    className={`
                      w-full p-3 rounded-lg border-2 transition-all text-left
                      ${payment?.savedTokenId === card.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaCreditCard className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.last4}
                            {card.isDefault && <span className="ml-2 text-xs text-blue-600">(Predeterminada)</span>}
                          </p>
                          <p className="text-sm text-gray-500">Expira {card.expiry}</p>
                        </div>
                      </div>
                      {payment?.savedTokenId === card.id && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p>No tienes tarjetas guardadas. Tu tarjeta se guardará automáticamente después del primer pago exitoso.</p>
            </div>
          )}
        </div>
      )}

      {/* Formulario para agregar nueva tarjeta */}
      {paymentMethod === 'mercadopago' && showCardCapture && mercadoPagoPublicKey && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <CardCapture
            publicKey={mercadoPagoPublicKey}
            onTokenGenerated={async (tokenData) => {
              // Guardar la tarjeta después de generar el token
              try {
                const token = localStorage.getItem('token');
                const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
                await axios.post(`${API_BASE}/api/payment/mercadopago/save-card`, {
                  cardToken: tokenData.token,
                  cardholderName: tokenData.cardholderName || '',
                  cardData: {
                    last4: tokenData.cardData?.last4 || '',
                    brand: tokenData.cardData?.brand || 'credit_card',
                    expMonth: tokenData.cardData?.expMonth || null,
                    expYear: tokenData.cardData?.expYear || null
                  }
                }, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                
                // Recargar tarjetas guardadas
                await loadSavedCards();
                
                // Seleccionar la nueva tarjeta
                onChange({
                  method: paymentMethod,
                  savedTokenId: tokenData.token
                });
                
                // Ocultar el formulario
                setShowCardCapture(false);
                setCardCaptureError(null);
              } catch (error) {
                console.error('Error al guardar tarjeta:', error);
                setCardCaptureError('Error al guardar la tarjeta. Intenta nuevamente.');
              }
            }}
            onError={(error) => {
              setCardCaptureError(error);
            }}
          />
          {cardCaptureError && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-800">
              {cardCaptureError}
            </div>
          )}
        </div>
      )}

      {/* Botón para agregar nueva tarjeta */}
      {paymentMethod === 'mercadopago' && !showCardCapture && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <button
            type="button"
            onClick={() => setShowCardCapture(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
          >
            <FaCreditCard />
            <span>+ Agregar nueva tarjeta</span>
          </button>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 text-sm text-yellow-800">
            <p><strong>Billetera Digital:</strong> Puedes pagar con tu tarjeta guardada o agregar una nueva. Tu tarjeta se guardará automáticamente para futuros pagos.</p>
          </div>
        </div>
      )}

      {/* Mensaje si no hay Public Key o hay error */}
      {paymentMethod === 'mercadopago' && !mercadoPagoPublicKey && !loadingCards && cardCaptureError && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <p><strong>Error:</strong> {cardCaptureError}</p>
            <p className="mt-2 text-xs">Verifica que el servidor backend esté corriendo y que MERCADOPAGO_PUBLIC_KEY esté configurado en el archivo .env del backend.</p>
            <button
              onClick={loadMercadoPagoPublicKey}
              className="mt-2 text-blue-600 hover:text-blue-800 text-xs underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
      
      {/* Mensaje si no hay Public Key y no hay error (aún cargando) */}
      {paymentMethod === 'mercadopago' && !mercadoPagoPublicKey && !loadingCards && !cardCaptureError && !showCardCapture && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <p>Cargando configuración de Mercado Pago...</p>
            <button
              onClick={loadMercadoPagoPublicKey}
              className="mt-2 text-blue-600 hover:text-blue-800 text-xs underline"
            >
              Reintentar carga
            </button>
          </div>
        </div>
      )}

      {/* Seguridad */}
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <FaLock />
        <span>Pago seguro y encriptado</span>
      </div>
    </div>
  );
};

export default PaymentSection;

