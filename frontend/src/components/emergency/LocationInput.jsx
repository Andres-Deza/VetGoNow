import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Autocomplete } from '@react-google-maps/api';
import { FaMapMarkerAlt, FaLocationArrow, FaStar } from 'react-icons/fa';

const LocationInput = ({ location, onChange, savedAddresses = [] }) => {
  // Si la dirección es "Atención en clínica" o similar, no mostrarla como valor
  const initialAddress = location?.address && 
    !location.address.toLowerCase().includes('atención en clínica') && 
    !location.address.toLowerCase().includes('atencion en clinica')
    ? location.address 
    : '';
  
  const [address, setAddress] = useState(initialAddress);
  const [mapCenter, setMapCenter] = useState(
    location?.lat && location?.lng
      ? { lat: location.lat, lng: location.lng }
      : { lat: -33.45, lng: -70.66 } // Santiago por defecto
  );
  const [selectedLocation, setSelectedLocation] = useState(
    location?.lat && location?.lng
      ? { lat: location.lat, lng: location.lng }
      : null
  );
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: ['places', 'geometry']
  });

  const handleLocationChange = useCallback((loc, addr) => {
    onChange({
      lat: loc.lat,
      lng: loc.lng,
      address: addr
    });
  }, [onChange]);

  const resolveAddressFromCoords = useCallback((lat, lng) => {
    if (!isLoaded || !window.google || !window.google.maps || !window.google.maps.Geocoder) {
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const formatted = results[0].formatted_address;
        setAddress(formatted);
        handleLocationChange({ lat, lng }, formatted);
      }
    });
  }, [handleLocationChange, isLoaded]);

  // Sincronizar cuando cambie la prop location
  useEffect(() => {
    if (location?.address) {
      const isClinicAddress = 
        location.address.toLowerCase().includes('atención en clínica') || 
        location.address.toLowerCase().includes('atencion en clinica');
      
      if (!isClinicAddress) {
        setAddress(location.address);
      } else {
        setAddress('');
      }
    } else {
      setAddress('');
    }
    
    if (location?.lat && location?.lng) {
      setMapCenter({ lat: location.lat, lng: location.lng });
      setSelectedLocation({ lat: location.lat, lng: location.lng });
    }
  }, [location]);

  // NO obtener ubicación automáticamente - el usuario puede estar solicitando para otra persona

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setSelectedLocation(loc);
        setMapCenter(loc);
        resolveAddressFromCoords(loc.lat, loc.lng);
      },
      (error) => {
        alert('No se pudo obtener tu ubicación. Por favor, ingresa una dirección manualmente.');
      }
    );
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const loc = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        const formatted = place.formatted_address || address;
        setSelectedLocation(loc);
        setMapCenter(loc);
        setAddress(formatted);
        handleLocationChange(loc, formatted);
      }
    }
  };

  const handleMapClick = (e) => {
    const loc = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setSelectedLocation(loc);
    setMapCenter(loc);
    resolveAddressFromCoords(loc.lat, loc.lng);
  };

  const handleSelectSavedAddress = (savedAddress) => {
    const loc = {
      lat: savedAddress.lat,
      lng: savedAddress.lng
    };
    setSelectedLocation(loc);
    setMapCenter(loc);
    setAddress(savedAddress.address);
    handleLocationChange(loc, savedAddress.address);
  };

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
        ¿Desde dónde viajarás?
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Ingresa la ubicación de partida para encontrar la clínica más cercana. Puedes usar tu ubicación actual o ingresar otra dirección.
      </p>

      {/* Direcciones guardadas */}
      {savedAddresses && savedAddresses.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            Direcciones guardadas
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {savedAddresses.map((savedAddr) => (
              <button
                key={savedAddr._id}
                type="button"
                onClick={() => handleSelectSavedAddress(savedAddr)}
                className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                  location?.lat === savedAddr.lat && location?.lng === savedAddr.lng
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 hover:border-violet-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FaMapMarkerAlt className="text-violet-600 flex-shrink-0" />
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {savedAddr.label}
                      </p>
                      {savedAddr.isDefault && (
                        <FaStar className="text-violet-600 text-xs flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {savedAddr.address}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-500 mb-2">O ingresa una dirección nueva:</p>
          </div>
        </div>
      )}

      {/* Buscador de direcciones */}
      <div className="mb-4">
        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
          Dirección <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          {isLoaded ? (
            <Autocomplete
              onLoad={(autocomplete) => {
                autocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={handlePlaceChanged}
              options={{
                componentRestrictions: { country: 'cl' },
                types: ['address']
              }}
            >
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ingrese dirección"
                className="flex-1 px-3 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg md:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Autocomplete>
          ) : (
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ingrese dirección"
              className="flex-1 px-3 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg md:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="px-3 md:px-4 py-2.5 md:py-2 bg-blue-600 text-white rounded-lg md:rounded-md hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap"
            title="Usar mi ubicación"
          >
            <FaLocationArrow className="text-sm" />
            <span className="hidden sm:inline">Mi ubicación</span>
            <span className="sm:hidden">GPS</span>
          </button>
        </div>
        {selectedLocation && address && (
          <p className="mt-2 text-xs md:text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-md px-3 py-2">
            <span className="font-semibold text-gray-700">Dirección:</span> {address}
          </p>
        )}
      </div>

      {/* Mapa */}
      {isLoaded && (
        <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '250px' }}
            center={mapCenter}
            zoom={selectedLocation ? 15 : 12}
            onClick={handleMapClick}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              clickableIcons: false
            }}
          >
            {selectedLocation && (
              <div
                style={{
                  position: 'absolute',
                  transform: 'translate(-50%, -100%)',
                  left: '50%',
                  top: '50%'
                }}
              >
                <div className="relative flex flex-col items-center justify-center">
                  <span className="absolute h-16 w-16 rounded-full bg-blue-400/30 blur-xl" />
                  <div className="relative flex items-center justify-center h-12 w-12">
                    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 shadow-xl border-[3px] border-white" />
                    <span className="absolute bottom-[-10px] h-8 w-8 bg-blue-700 rotate-45 rounded-md border-[3px] border-white border-t-0 border-l-0 shadow-md" />
                    <span className="relative h-4 w-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              </div>
            )}
          </GoogleMap>
        </div>
      )}

      {!isLoaded && (
        <div className="w-full h-[250px] bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Cargando mapa...</p>
        </div>
      )}
    </div>
  );
};

export default LocationInput;
