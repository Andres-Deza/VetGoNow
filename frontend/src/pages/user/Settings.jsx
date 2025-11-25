import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCreditCard, FaTrash, FaStar, FaSpinner, FaMapMarkerAlt, FaEdit } from 'react-icons/fa';
import CardCapture from '../../components/emergency/CardCapture';
import AddressModal from '../../components/AddressModal';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: ''
  });
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [showCardCapture, setShowCardCapture] = useState(false);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState(null);
  const [cardCaptureError, setCardCaptureError] = useState(null);
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  useEffect(() => {
    fetchUserProfile();
    fetchAddresses();
    fetchPaymentMethods();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No estás autenticado. Por favor inicia sesión.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const user = response.data;
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        password: '' // No mostrar la contraseña
      });
    } catch (err) {
      console.error('Error al cargar perfil:', err);
      setError(err.response?.data?.message || 'Error al cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE}/api/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.addresses) {
        setAddresses(response.data.addresses);
      } else {
        setAddresses([]);
      }
    } catch (err) {
      console.error('Error al cargar direcciones:', err);
      setAddresses([]);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setLoadingCards(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // Cargar Public Key de Mercado Pago
      await loadMercadoPagoPublicKey();

      // Cargar tarjetas guardadas de Mercado Pago
      const response = await axios.get(`${API_BASE}/api/payment/mercadopago/cards`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.cards) {
        setPaymentMethods(response.data.cards.map(card => ({
          id: card._id,
          brand: card.cardInfo.brand,
          last4: card.cardInfo.last4,
          expMonth: card.cardInfo.expMonth,
          expYear: card.cardInfo.expYear,
          isDefault: card.isDefault,
          displayName: `${card.cardInfo.brand.charAt(0).toUpperCase() + card.cardInfo.brand.slice(1)} •••• ${card.cardInfo.last4}`
        })));
      } else {
        setPaymentMethods([]);
      }
    } catch (err) {
      console.error('Error al cargar métodos de pago:', err);
      setPaymentMethods([]);
    } finally {
      setLoadingCards(false);
    }
  };

  const loadMercadoPagoPublicKey = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/payment/mercadopago/public-key`);
      if (response.data.success && response.data.publicKey) {
        setMercadoPagoPublicKey(response.data.publicKey);
      } else {
        setError('No se pudo cargar la configuración de Mercado Pago');
      }
    } catch (error) {
      console.error('Error al cargar Public Key de Mercado Pago:', error);
      setError(`Error al cargar configuración de Mercado Pago: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar mensajes de error/success al cambiar valores
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No estás autenticado. Por favor inicia sesión.');
        setSaving(false);
        return;
      }

      // Preparar datos para enviar (solo enviar campos que tienen valor)
      const updateData = {};
      if (formData.name.trim()) updateData.name = formData.name.trim();
      if (formData.email.trim()) updateData.email = formData.email.trim();
      if (formData.phoneNumber.trim()) updateData.phoneNumber = formData.phoneNumber.trim();
      if (formData.password.trim()) {
        if (formData.password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres');
          setSaving(false);
          return;
        }
        updateData.password = formData.password;
      }

      if (Object.keys(updateData).length === 0) {
        setError('No hay cambios para guardar');
        setSaving(false);
        return;
      }

      const response = await axios.put(`${API_BASE}/api/users/profile`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess('Datos actualizados correctamente');
      
      // Actualizar los datos del formulario con la respuesta del servidor
      if (response.data.user) {
        setFormData(prev => ({
          ...prev,
          name: response.data.user.name || prev.name,
          email: response.data.user.email || prev.email,
          phoneNumber: response.data.user.phoneNumber || prev.phoneNumber,
          password: '' // Limpiar el campo de contraseña después de guardar
        }));
      }

      // Actualizar el usuario en localStorage si existe
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (response.data.user) {
            const updatedUser = {
              ...user,
              name: response.data.user.name || user.name,
              email: response.data.user.email || user.email
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (err) {
          console.error('Error al actualizar usuario en localStorage:', err);
        }
      }

      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      setError(err.response?.data?.message || 'Error al actualizar los datos');
    } finally {
      setSaving(false);
    }
  };

  const handleNewAddress = () => {
    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (addressData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No estás autenticado');
    }

    if (editingAddress) {
      // Actualizar dirección existente
      await axios.put(
        `${API_BASE}/api/addresses/${editingAddress._id}`,
        addressData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setSuccess('Dirección actualizada exitosamente');
    } else {
      // Crear nueva dirección
      await axios.post(
        `${API_BASE}/api/addresses`,
        addressData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setSuccess('Dirección agregada exitosamente');
    }

    // Recargar direcciones
    await fetchAddresses();
    setShowAddressModal(false);
    setEditingAddress(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta dirección?')) {
      return;
    }

    try {
      setDeletingAddressId(addressId);
      const token = localStorage.getItem('token');
      
      await axios.delete(`${API_BASE}/api/addresses/${addressId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await fetchAddresses();
      setSuccess('Dirección eliminada exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al eliminar dirección:', error);
      setError(error.response?.data?.message || 'Error al eliminar la dirección');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE}/api/addresses/${addressId}/default`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      await fetchAddresses();
      setSuccess('Dirección predeterminada actualizada');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al establecer dirección predeterminada:', error);
      setError(error.response?.data?.message || 'Error al actualizar la dirección predeterminada');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddPaymentMethod = () => {
    setShowCardCapture(true);
    setCardCaptureError(null);
  };

  const handleCardTokenGenerated = async (tokenData) => {
    try {
      const token = localStorage.getItem('token');
      
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

      // Recargar tarjetas
      await fetchPaymentMethods();
      
      // Ocultar formulario y mostrar éxito
      setShowCardCapture(false);
      setSuccess('Tarjeta agregada exitosamente');
      setTimeout(() => setSuccess(null), 3000);
      setCardCaptureError(null);
    } catch (error) {
      console.error('Error al guardar tarjeta:', error);
      setCardCaptureError(error.response?.data?.message || 'Error al guardar la tarjeta. Intenta nuevamente.');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarjeta?')) {
      return;
    }

    try {
      setDeletingCardId(cardId);
      const token = localStorage.getItem('token');
      
      await axios.delete(`${API_BASE}/api/payment/mercadopago/cards/${cardId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Recargar tarjetas
      await fetchPaymentMethods();
      setSuccess('Tarjeta eliminada exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al eliminar tarjeta:', error);
      setError(error.response?.data?.message || 'Error al eliminar la tarjeta');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingCardId(null);
    }
  };

  const handleSetDefaultCard = async (cardId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(`${API_BASE}/api/payment/mercadopago/cards/${cardId}/default`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Recargar tarjetas
      await fetchPaymentMethods();
      setSuccess('Tarjeta predeterminada actualizada');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error al establecer tarjeta predeterminada:', error);
      setError(error.response?.data?.message || 'Error al actualizar la tarjeta predeterminada');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Configuración de la cuenta */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Configuración de la cuenta</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tu nombre"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tu número de teléfono"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña (dejar vacío para no cambiar)</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="********"
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo 8 caracteres</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </form>
        </div>

        {/* Tus direcciones */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Tus direcciones</h2>
            <button
              onClick={handleNewAddress}
              className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition text-sm font-medium"
            >
              Nueva dirección
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Aún no tienes direcciones registradas.</p>
              <p className="text-sm text-gray-500">Agrega direcciones para usarlas fácilmente al solicitar servicios a domicilio.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div 
                  key={address._id} 
                  className={`border rounded-lg p-4 flex items-start justify-between ${
                    address.isDefault ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaMapMarkerAlt className="text-violet-600 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1">
                        <p className="font-medium text-gray-900">{address.label}</p>
                        {address.isDefault && (
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded font-medium flex items-center gap-1">
                            <FaStar className="text-xs" />
                            Predeterminada
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 ml-6">{address.address}</p>
                    {address.accessNotes && (
                      <p className="text-xs text-gray-500 ml-6 mt-1">{address.accessNotes}</p>
                    )}
                    {address.commune && (
                      <p className="text-xs text-gray-500 ml-6">{address.commune}{address.region ? `, ${address.region}` : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(address._id)}
                        className="text-violet-600 hover:text-violet-700 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-violet-50"
                        title="Establecer como predeterminada"
                      >
                        <FaStar className="text-xs" />
                        <span className="hidden sm:inline">Predeterminar</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50"
                      title="Editar dirección"
                    >
                      <FaEdit className="text-xs" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address._id)}
                      disabled={deletingAddressId === address._id}
                      className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Eliminar dirección"
                    >
                      {deletingAddressId === address._id ? (
                        <FaSpinner className="animate-spin text-xs" />
                      ) : (
                        <FaTrash className="text-xs" />
                      )}
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tus métodos de pago */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Tus métodos de pago</h2>
            {!showCardCapture && paymentMethods.length > 0 && (
              <button
                onClick={handleAddPaymentMethod}
                className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition text-sm font-medium flex items-center gap-2"
              >
                <FaCreditCard />
                <span>Agregar tarjeta</span>
              </button>
            )}
          </div>

          {loadingCards ? (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin text-violet-600 text-3xl mx-auto mb-3" />
              <p className="text-gray-600">Cargando tarjetas...</p>
            </div>
          ) : paymentMethods.length === 0 && !showCardCapture ? (
            <div className="text-center py-8">
              <div className="mb-4 flex justify-center">
                <FaCreditCard className="w-24 h-24 text-gray-300" />
              </div>
              <p className="text-gray-700 font-medium mb-2">Guarda tu tarjeta y despreocúpate</p>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Agrega tus tarjetas de forma segura con Mercado Pago para pagar rápido y fácil cuando lo necesites.
              </p>
              <button
                onClick={handleAddPaymentMethod}
                className="bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition font-medium flex items-center gap-2 mx-auto"
              >
                <FaCreditCard />
                <span>Agregar tarjeta</span>
              </button>
            </div>
          ) : showCardCapture ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Agregar nueva tarjeta</h3>
                <button
                  onClick={() => {
                    setShowCardCapture(false);
                    setCardCaptureError(null);
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancelar
                </button>
              </div>
              
              {mercadoPagoPublicKey ? (
                <>
                  <CardCapture
                    publicKey={mercadoPagoPublicKey}
                    onTokenGenerated={handleCardTokenGenerated}
                    onError={(error) => {
                      setCardCaptureError(error);
                    }}
                  />
                  {cardCaptureError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                      {cardCaptureError}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <p>Cargando configuración de Mercado Pago...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div 
                  key={method.id} 
                  className={`border rounded-lg p-4 flex items-center justify-between ${
                    method.isDefault ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-8 bg-gradient-to-r from-violet-500 to-violet-600 rounded flex items-center justify-center">
                      <FaCreditCard className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{method.displayName}</p>
                        {method.isDefault && (
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded font-medium flex items-center gap-1">
                            <FaStar className="text-xs" />
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {method.expMonth && method.expYear 
                          ? `Expira ${String(method.expMonth).padStart(2, '0')}/${String(method.expYear).slice(-2)}`
                          : 'Tarjeta de prueba'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefaultCard(method.id)}
                        className="text-violet-600 hover:text-violet-700 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-violet-50"
                        title="Establecer como predeterminada"
                      >
                        <FaStar className="text-xs" />
                        <span className="hidden sm:inline">Predeterminar</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCard(method.id)}
                      disabled={deletingCardId === method.id}
                      className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Eliminar tarjeta"
                    >
                      {deletingCardId === method.id ? (
                        <FaSpinner className="animate-spin text-xs" />
                      ) : (
                        <FaTrash className="text-xs" />
                      )}
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                onClick={handleAddPaymentMethod}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50 transition flex items-center justify-center gap-2"
              >
                <FaCreditCard />
                <span>Agregar otra tarjeta</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de direcciones */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        editingAddress={editingAddress}
      />
    </div>
  );
};

export default Settings;
