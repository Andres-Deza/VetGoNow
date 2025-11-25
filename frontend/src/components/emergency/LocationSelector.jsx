import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, Circle, OverlayView } from '@react-google-maps/api';
import GoogleMapWrapper from '../GoogleMapWrapper';
import { FaMapMarkerAlt, FaLocationArrow } from 'react-icons/fa';

const containerStyle = {
  width: '100%',
  height: '300px'
};

const LIBRARIES = ['places', 'geometry'];

const LocationSelector = ({ mode, location, onChange, onVetsLoad }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [address, setAddress] = useState(location?.address || '');
  const [accessNotes, setAccessNotes] = useState(location?.accessNotes || '');
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
  const [predictions, setPredictions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(location?.address || '');
  const searchInputRef = useRef(null);
  const pendingCoordsRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const debounceRef = useRef(null);
  const latestManualAddressRef = useRef(address || '');
  const lastGeocodeRef = useRef({ lat: null, lng: null });

  useEffect(() => {
    latestManualAddressRef.current = address;
  }, [address]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: LIBRARIES
  });

  const handleLocationChange = useCallback((loc, addr) => {
    onChange({
      lat: loc.lat,
      lng: loc.lng,
      address: addr,
      accessNotes: accessNotes
    });
  }, [accessNotes, onChange]);

  const resolveAddressFromCoords = useCallback((lat, lng) => {
    if (lastGeocodeRef.current.lat === lat && lastGeocodeRef.current.lng === lng) {
      return;
    }

    if (!isLoaded || !window.google || !window.google.maps || !window.google.maps.Geocoder) {
      pendingCoordsRef.current = { lat, lng };
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    lastGeocodeRef.current = { lat, lng };
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const formatted = results[0].formatted_address;
        setAddress(formatted);
        setResolvedAddress(formatted);
        handleLocationChange({ lat, lng }, formatted);
      } else {
        const fallback = latestManualAddressRef.current || 'Ubicación aproximada';
        setAddress((prev) => prev || fallback);
        if (lat && lng) {
          handleLocationChange({ lat, lng }, fallback);
          setResolvedAddress((prev) => prev || fallback);
        }
      }
      if (onVetsLoad) {
        onVetsLoad(lat, lng);
      }
    });
  }, [handleLocationChange, isLoaded, onVetsLoad]);

  // Reintentar geocodificación pendiente cuando el mapa esté listo
  useEffect(() => {
    if (isLoaded && pendingCoordsRef.current) {
      const { lat, lng } = pendingCoordsRef.current;
      pendingCoordsRef.current = null;
      resolveAddressFromCoords(lat, lng);
    }
  }, [isLoaded, resolveAddressFromCoords]);

  const ensureSessionToken = () => {
    if (window.google?.maps?.places?.AutocompleteSessionToken && !sessionTokenRef.current) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  };

  const geocodeAddress = useCallback((value) => {
    if (!value || !isLoaded || !window.google || !window.google.maps || !window.google.maps.Geocoder) {
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: value }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        setSelectedLocation(loc);
        setMapCenter(loc);
        resolveAddressFromCoords(loc.lat, loc.lng);
        const formatted = results[0].formatted_address || value;
        setAddress(formatted);
        handleLocationChange(loc, formatted);
        setPredictions([]);
        setIsSearching(false);
        if (onVetsLoad) {
          onVetsLoad(loc.lat, loc.lng);
        }
      } else {
        const fallback = latestManualAddressRef.current || 'Ubicación aproximada';
        setAddress((prev) => prev || fallback);
        if (selectedLocation) {
          handleLocationChange(selectedLocation, fallback);
          setResolvedAddress((prev) => prev || fallback);
        }
      }
    });
  }, [handleLocationChange, isLoaded, onVetsLoad, selectedLocation]);

  // Inicializar servicio de autocompletado
  useEffect(() => {
    if (!isLoaded || !window.google || !window.google.maps?.places) return;

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }
    ensureSessionToken();
  }, [isLoaded]);

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  // Obtener ubicación actual del usuario
  useEffect(() => {
    if (!isLoaded || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(loc);
        setMapCenter(loc);
        setSelectedLocation(loc);
        resolveAddressFromCoords(loc.lat, loc.lng);
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }, [isLoaded, resolveAddressFromCoords]);

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
        alert('No se pudo obtener tu ubicación');
      }
    );
  };

  const handleMapClick = (e) => {
    if (mode === 'home') {
      const loc = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setSelectedLocation(loc);
      setMapCenter(loc);
      resolveAddressFromCoords(loc.lat, loc.lng);
    }
  };

  if (mode === 'clinic') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Seleccionar clínica
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Selecciona una clínica del mapa o busca veterinarios cercanos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
        Ubicación y cobertura
      </h3>

      {/* Buscador de direcciones */}
      <div className="mb-3 md:mb-4">
        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
          Dirección <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={address}
            onChange={(e) => {
              const value = e.target.value;
              setAddress(value);
              if (!value || value.length < 3 || !autocompleteServiceRef.current) {
                if (debounceRef.current) {
                  clearTimeout(debounceRef.current);
                }
                setPredictions([]);
                return;
              }

              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
              }

              debounceRef.current = setTimeout(() => {
                setIsSearching(true);
                autocompleteServiceRef.current.getPlacePredictions(
                  {
                    input: value,
                    sessionToken: ensureSessionToken()
                  },
                  (results, status) => {
                    setIsSearching(false);
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                      setPredictions(results);
                    } else {
                      setPredictions([]);
                    }
                  }
                );
              }, 250);
            }}
            onBlur={() => {
              if (!selectedLocation && address) {
                geocodeAddress(address);
              }
            }}
            placeholder="Busca una dirección o usa tu ubicación"
            className="flex-1 px-3 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg md:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
        {isSearching && (
          <div className="mt-2 text-xs text-gray-500">Buscando direcciones...</div>
        )}
        {predictions.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded-lg shadow-sm bg-white divide-y divide-gray-100">
            {predictions.map((prediction) => (
              <li key={prediction.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPredictions([]);
                    setIsSearching(false);
                    const token = ensureSessionToken();
                    const place = new window.google.maps.places.Place({
                      id: prediction.place_id,
                      requestedLanguage: 'es'
                    });

                    place.fetchFields(
                      {
                        fields: ['location', 'formattedAddress'],
                        sessionToken: token
                      },
                      (fetchedPlace) => {
                        sessionTokenRef.current = null;
                        if (fetchedPlace?.location) {
                          const loc = {
                            lat: fetchedPlace.location.lat(),
                            lng: fetchedPlace.location.lng()
                          };
                          const formatted = fetchedPlace.formattedAddress || prediction.description;
                          setAddress(formatted);
                          setResolvedAddress(formatted);
                          setSelectedLocation(loc);
                          setMapCenter(loc);
                          handleLocationChange(loc, formatted);
                          if (onVetsLoad) {
                            onVetsLoad(loc.lat, loc.lng);
                          }
                        } else {
                          setAddress(prediction.description);
                          geocodeAddress(prediction.description);
                        }
                      }
                    );
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  <FaMapMarkerAlt className="mt-1 text-blue-500" />
                  <div className="text-sm text-gray-700">
                    <div className="font-medium">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    {prediction.structured_formatting?.secondary_text && (
                      <div className="text-xs text-gray-500">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedLocation && resolvedAddress && (
          <p className="mt-2 text-xs md:text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-md px-3 py-2">
            <span className="font-semibold text-gray-700">Dirección:</span>{" "}
            {resolvedAddress}
          </p>
        )}
      </div>

      {/* Mapa */}
      <div className="mb-3 md:mb-4 rounded-lg overflow-hidden border border-gray-200">
        {!isLoaded ? (
          <div className="w-full h-[250px] md:h-[300px] bg-gray-100 flex items-center justify-center">
            <p className="text-sm md:text-base text-gray-500">Cargando mapa...</p>
          </div>
        ) : (
          <GoogleMapWrapper
            mapContainerStyle={{ width: '100%', height: '250px' }}
            className="md:h-[300px]"
            center={mapCenter}
            zoom={selectedLocation ? 15 : 12}
            onClick={handleMapClick}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              clickableIcons: false
            }}
          >
            {selectedLocation && (
              <>
                <OverlayView
                  position={selectedLocation}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div className="relative flex flex-col items-center justify-center">
                    <span className="absolute h-16 w-16 rounded-full bg-blue-400/30 blur-xl" />
                    <span className="absolute bottom-[-14px] h-7 w-14 bg-blue-500/25 blur-md rounded-full" />
                    <div className="relative flex items-center justify-center h-12 w-12">
                      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 shadow-xl border-[3px] border-white" />
                      <span className="absolute bottom-[-10px] h-8 w-8 bg-blue-700 rotate-45 rounded-md border-[3px] border-white border-t-0 border-l-0 shadow-md" />
                      <span className="relative h-4 w-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </OverlayView>
                <Circle
                  center={selectedLocation}
                  radius={3000}
                  options={{
                    fillColor: '#2563eb',
                    fillOpacity: 0.12,
                    strokeColor: '#2563eb',
                    strokeOpacity: 0.4,
                    strokeWeight: 2
                  }}
                />
              </>
            )}
          </GoogleMapWrapper>
        )}
      </div>

      {/* Notas de acceso */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas de acceso (opcional)
        </label>
        <input
          type="text"
          value={accessNotes}
          onChange={(e) => {
            setAccessNotes(e.target.value);
            onChange({
              ...(selectedLocation
                ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
                : {}),
              address: address,
              accessNotes: e.target.value
            });
          }}
          placeholder="Ej: Conserjería 24/7, portón eléctrico, mascota agresiva..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default LocationSelector;

