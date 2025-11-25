import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import GoogleMapWrapper from '../GoogleMapWrapper';
import { FaStar, FaMapMarkerAlt, FaClock, FaCheckCircle, FaHospital, FaList, FaMap } from 'react-icons/fa';

const ClinicSelector = ({ location, assignment, onChange, onVetSelect, showDistance = false }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState(assignment?.preferredVetId || null);
  const [viewMode, setViewMode] = useState('list'); // 'list' o 'map'
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState(
    location?.lat && location?.lng
      ? { lat: location.lat, lng: location.lng }
      : { lat: -33.45, lng: -70.66 } // Santiago por defecto
  );

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: ['places', 'geometry']
  });

  useEffect(() => {
    if (location?.lat && location?.lng) {
      setMapCenter({ lat: location.lat, lng: location.lng });
      fetchNearbyClinics();
    }
  }, [location?.lat, location?.lng]);

  const fetchNearbyClinics = async () => {
    if (!location?.lat || !location?.lng) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
      const response = await axios.get(
        `${API_BASE}/api/emergency/nearby-vets?lat=${location.lat}&lng=${location.lng}&maxDistance=50&mode=clinic`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Filtrar solo clínicas (no veterinarios independientes)
        const clinicsOnly = (response.data.vets || []).filter(
          vet => vet.vetType === 'clinic'
        );
        setClinics(clinicsOnly);
      }
    } catch (error) {
      console.error('Error fetching nearby clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClinicSelect = (clinicId) => {
    setSelectedClinicId(clinicId);
    onChange((prev) => ({
      ...(typeof prev === 'object' && prev !== null ? prev : {}),
      strategy: 'manual',
      preferredVetId: clinicId
    }));
    if (onVetSelect) {
      const clinic = clinics.find(c => c._id === clinicId);
      if (clinic) {
        onVetSelect(clinic);
      }
    }
  };

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  const getClinicAddress = (clinic) => {
    // Intentar obtener dirección completa de clinicAddress
    if (clinic.clinicAddress) {
      const addr = clinic.clinicAddress;
      const parts = [];
      
      // Construir dirección completa
      if (addr.street) parts.push(addr.street);
      if (addr.number) parts.push(addr.number);
      
      if (parts.length > 0) {
        const streetAddress = parts.join(' ');
        const locationParts = [];
        
        if (addr.commune) locationParts.push(addr.commune);
        if (addr.region) locationParts.push(addr.region);
        
        if (locationParts.length > 0) {
          return `${streetAddress}, ${locationParts.join(', ')}`;
        }
        return streetAddress;
      }
      
      // Si solo hay comuna y región en clinicAddress, usarlos
      if (addr.commune || addr.region) {
        const locationParts = [];
        if (addr.commune) locationParts.push(addr.commune);
        if (addr.region) locationParts.push(addr.region);
        return locationParts.join(', ');
      }
    }
    
    // Fallback: usar comuna y región del perfil
    if (clinic.comuna && clinic.region) {
      return `${clinic.comuna}, ${clinic.region}`;
    }
    if (clinic.comuna) {
      return clinic.comuna;
    }
    if (clinic.region) {
      return clinic.region;
    }
    
    return 'Dirección no disponible';
  };

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            Seleccionar clínica
          </h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {clinics.length > 0 
              ? `${clinics.length} clínica${clinics.length > 1 ? 's' : ''} disponible${clinics.length > 1 ? 's' : ''}`
              : 'Buscando clínicas cercanas...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista lista"
          >
            <FaList />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Vista mapa"
          >
            <FaMap />
          </button>
        </div>
      </div>

      {/* Indicador de ubicación */}
      {location?.lat && location?.lng && (
        <div className="mb-4 flex items-center gap-2 text-xs md:text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <FaMapMarkerAlt className="text-green-600" />
          <span>Usando tu ubicación actual • Ordenadas por distancia</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Buscando clínicas cercanas...</p>
        </div>
      ) : clinics.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No se encontraron clínicas disponibles en tu área. 
            Intenta con otra ubicación o contacta con soporte.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {clinics.map((clinic, index) => (
            <button
              key={clinic._id}
              type="button"
              onClick={() => handleClinicSelect(clinic._id)}
              className={`
                w-full p-4 rounded-lg border-2 transition-all text-left relative
                ${selectedClinicId === clinic._id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              {index === 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                  <span>⚡</span>
                  <span>Más cercana</span>
                </div>
              )}
              <div className="flex items-start gap-3 md:gap-4">
                {/* Avatar/Logo de la clínica */}
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-blue-100 flex-shrink-0 flex items-center justify-center">
                  {clinic.profileImage ? (
                    <img
                      src={clinic.profileImage}
                      alt={clinic.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaHospital className="text-blue-600 text-xl md:text-2xl" />
                  )}
                </div>

                {/* Información de la clínica */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                      {clinic.name}
                    </h4>
                    {selectedClinicId === clinic._id && (
                      <FaCheckCircle className="text-blue-500 text-lg md:text-xl flex-shrink-0 ml-2" />
                    )}
                  </div>
                  {clinic.specialization && (
                    <p className="text-xs md:text-sm text-gray-600 mb-2 truncate">
                      {clinic.specialization}
                    </p>
                  )}
                  
                  {/* Badge de clínica */}
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      <FaHospital className="text-xs" />
                      <span>Clínica</span>
                    </span>
                  </div>
                  
                  {/* Dirección - Más prominente */}
                  <div className="flex items-center gap-1 text-sm md:text-base text-gray-800 font-medium mb-1">
                    <FaMapMarkerAlt className="text-blue-500 text-base flex-shrink-0" />
                    <span>{getClinicAddress(clinic)}</span>
                  </div>
                  
                  {/* Detalles adicionales */}
                  <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600 flex-wrap">
                    {clinic.rating && clinic.rating > 0 ? (
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-400 text-xs" />
                        <span>{clinic.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        Nuevo
                      </span>
                    )}
                    {showDistance && clinic.distance != null && clinic.distance > 0 && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <span className="text-xs">Aprox. {formatDistance(clinic.distance)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '500px' }}>
          {isLoaded ? (
            <GoogleMapWrapper
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={12}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
                clickableIcons: false
              }}
            >
              {/* Marcador de ubicación del usuario */}
              {location?.lat && location?.lng && isLoaded && window.google && (
                <Marker
                  position={{ lat: location.lat, lng: location.lng }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#10B981',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                  }}
                />
              )}

              {/* Marcadores de clínicas */}
              {isLoaded && window.google && clinics.map((clinic) => {
                if (!clinic.location?.lat || !clinic.location?.lng) return null;
                return (
                  <Marker
                    key={clinic._id}
                    position={{ lat: clinic.location.lat, lng: clinic.location.lng }}
                    onClick={() => setSelectedMarker(clinic._id)}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 12,
                      fillColor: '#2563EB',
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 3
                    }}
                  />
                );
              })}

              {/* InfoWindow para clínica seleccionada */}
              {selectedMarker && (() => {
                const clinic = clinics.find(c => c._id === selectedMarker);
                if (!clinic || !clinic.location?.lat || !clinic.location?.lng) return null;
                return (
                  <InfoWindow
                    position={{ lat: clinic.location.lat, lng: clinic.location.lng }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2 max-w-xs">
                      <h4 className="font-semibold text-gray-900 mb-1">{clinic.name}</h4>
                      {clinic.specialization && (
                        <p className="text-xs text-gray-600 mb-2">{clinic.specialization}</p>
                      )}
                      <p className="text-xs text-gray-600 mb-2">
                        <FaMapMarkerAlt className="inline mr-1" />
                        {getClinicAddress(clinic)}
                      </p>
                      {showDistance && clinic.distance != null && clinic.distance > 0 && (
                        <p className="text-xs text-gray-500 mb-2">
                          Aprox. {formatDistance(clinic.distance)} de distancia
                        </p>
                      )}
                      <button
                        onClick={() => {
                          handleClinicSelect(clinic._id);
                          setSelectedMarker(null);
                        }}
                        className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Seleccionar
                      </button>
                    </div>
                  </InfoWindow>
                );
              })()}
            </GoogleMapWrapper>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <p className="text-sm text-gray-500">Cargando mapa...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClinicSelector;

