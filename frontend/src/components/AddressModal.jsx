import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Autocomplete, Marker } from '@react-google-maps/api';
import { FaMapMarkerAlt, FaLocationArrow, FaTimes, FaSave, FaSpinner } from 'react-icons/fa';

// Constante fuera del componente para evitar re-renders
const LIBRARIES = ['places', 'geometry'];

const AddressModal = ({ isOpen, onClose, onSave, editingAddress }) => {
  const [formData, setFormData] = useState({
    label: '',
    address: '',
    lat: null,
    lng: null,
    accessNotes: '',
    isDefault: false,
    commune: '',
    region: ''
  });
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: -33.45, lng: -70.66 }); // Santiago, Chile
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [inputAddress, setInputAddress] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
  });

  // Inicializar datos cuando el modal se abre o cambia editingAddress
  useEffect(() => {
    if (isOpen) {
      if (editingAddress) {
        setFormData({
          label: editingAddress.label || '',
          address: editingAddress.address || '',
          lat: editingAddress.lat || null,
          lng: editingAddress.lng || null,
          accessNotes: editingAddress.accessNotes || '',
          isDefault: editingAddress.isDefault || false,
          commune: editingAddress.commune || '',
          region: editingAddress.region || '',
          _id: editingAddress._id // Keep ID for updates
        });
        setInputAddress(editingAddress.address || '');
        if (editingAddress.lat && editingAddress.lng) {
          const loc = { lat: editingAddress.lat, lng: editingAddress.lng };
          setMapCenter(loc);
          setSelectedLocation(loc);
        }
      } else {
        // Reset form for new address
        setFormData({
          label: '',
          address: '',
          lat: null,
          lng: null,
          accessNotes: '',
          isDefault: false,
          commune: '',
          region: ''
        });
        setInputAddress('');
        setMapCenter({ lat: -33.45, lng: -70.66 }); // Default to Santiago
        setSelectedLocation(null);
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, editingAddress]);

  useEffect(() => {
    if (isLoaded) {
      setLoadingMap(false);
    }
  }, [isLoaded]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const newAddress = place.formatted_address;

        let commune = '';
        let region = '';
        for (const component of place.address_components) {
          if (component.types.includes('locality')) {
            commune = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            region = component.long_name;
          }
        }

        setFormData(prev => ({
          ...prev,
          address: newAddress,
          lat,
          lng,
          commune,
          region
        }));
        setInputAddress(newAddress);
        setMapCenter({ lat, lng });
        setSelectedLocation({ lat, lng });
        setErrors(prev => ({ ...prev, address: '', lat: '', lng: '' }));
      }
    }
  };

  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setSelectedLocation({ lat, lng });
    setMapCenter({ lat, lng });
    setErrors(prev => ({ ...prev, lat: '', lng: '' }));

    // Reverse geocode to get address, commune, region
    if (isLoaded && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const newAddress = results[0].formatted_address;
          let commune = '';
          let region = '';
          for (const component of results[0].address_components) {
            if (component.types.includes('locality')) {
              commune = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              region = component.long_name;
            }
          }
          setFormData(prev => ({
            ...prev,
            address: newAddress,
            commune,
            region
          }));
          setInputAddress(newAddress);
          setErrors(prev => ({ ...prev, address: '' }));
        } else {
          setFormData(prev => ({
            ...prev,
            address: 'Ubicación seleccionada en el mapa',
            commune: '',
            region: ''
          }));
          setInputAddress('Ubicación seleccionada en el mapa');
        }
      });
    }
  }, [isLoaded]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        handleMapClick({ latLng: { lat: () => lat, lng: () => lng } });
      },
      (error) => {
        alert('No se pudo obtener tu ubicación. Por favor, ingresa una dirección manualmente.');
        console.error('Error getting current location:', error);
      }
    );
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.label.trim()) newErrors.label = 'La etiqueta es obligatoria.';
    if (!formData.address.trim()) newErrors.address = 'La dirección es obligatoria.';
    if (formData.lat === null || formData.lng === null) newErrors.location = 'Debes seleccionar una ubicación en el mapa.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      // Error handled by onSave in Settings.jsx
      console.error('Error saving address:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">{editingAddress ? 'Editar Dirección' : 'Agregar Nueva Dirección'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta (ej: Casa, Trabajo) <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="label"
              value={formData.label}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Mi Casa"
            />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección <span className="text-red-500">*</span></label>
            {isLoaded ? (
              <Autocomplete
                onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                onPlaceChanged={handlePlaceChanged}
                options={{ componentRestrictions: { country: 'cl' } }}
              >
                <input
                  type="text"
                  value={inputAddress}
                  onChange={(e) => setInputAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Buscar dirección"
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Cargando mapa..."
                disabled
              />
            )}
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition flex items-center justify-center gap-2"
            >
              <FaLocationArrow /> Usar mi ubicación actual
            </button>
          </div>

          <div className="h-64 w-full border border-gray-300 rounded-md overflow-hidden">
            {isLoaded && !loadingMap ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={selectedLocation ? 15 : 12}
                onLoad={(map) => (mapRef.current = map)}
                onClick={handleMapClick}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  clickableIcons: false,
                }}
              >
                {selectedLocation && <Marker position={selectedLocation} />}
              </GoogleMap>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
                {loadError ? 'Error al cargar el mapa' : 'Cargando mapa...'}
              </div>
            )}
          </div>
          {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
          {selectedLocation && (
            <p className="text-sm text-gray-600">
              Ubicación seleccionada: {formData.address || `${selectedLocation.lat}, ${selectedLocation.lng}`}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas de acceso (opcional)</label>
            <textarea
              name="accessNotes"
              value={formData.accessNotes}
              onChange={handleInputChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Ej: Edificio con conserje, departamento 501, tocar timbre 2"
            ></textarea>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isDefault"
              checked={formData.isDefault}
              onChange={handleInputChange}
              className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
            />
            <label className="ml-2 block text-sm text-gray-900">Establecer como dirección predeterminada</label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <FaSpinner className="animate-spin" />}
              {editingAddress ? 'Guardar Cambios' : 'Agregar Dirección'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressModal;

