import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

// Carga condicional de leaflet para evitar errores SSR o en test
let L; // leaflet namespace
try {
  // eslint-disable-next-line global-require
  L = require('leaflet');
  // Fix default icon path if leaflet loaded
  if (L && L.Icon && L.Icon.Default) {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });
  }
} catch (e) {
  // ignore if not available
}

/*
  VetMap: muestra un mapa simple con los veterinarios usando Leaflet dinámicamente (sin añadir dependencia pesada aún).
  En esta versión: si Leaflet no está instalado, mostramos una lista y dejamos preparado el hook.
  Próximo paso (si se instala leaflet y su CSS): render real del mapa.
*/

const fallbackCenter = { lat: -33.45, lng: -70.66 };

const serviceLabels = {
  'consultas': 'Consultas',
  'video-consultas': 'Video consultas',
  'a-domicilio': 'A domicilio'
};

const VetMap = () => {
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [services, setServices] = useState([]); // filtros seleccionados
  const [radiusKm, setRadiusKm] = useState(5);
  const [coords, setCoords] = useState(fallbackCenter);
  const [useGeo, setUseGeo] = useState(false);

  const fetchVets = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (services.length) params.append('services', services.join(','));
      if (useGeo && coords.lat && coords.lng) {
        params.append('lat', coords.lat);
        params.append('lng', coords.lng);
        params.append('radiusKm', radiusKm);
      }
      params.append('approved', 'true');
      const url = `http://localhost:5555/api/vets/filter?${params.toString()}`;
      const { data } = await axios.get(url);
      setVets(data.vets || []);
    } catch (e) {
      setError('No se pudieron cargar los veterinarios.');
    } finally { setLoading(false); }
  }, [services, coords, radiusKm, useGeo]);

  useEffect(() => { fetchVets(); }, [fetchVets]);

  const toggleService = (svc) => {
    setServices(prev => prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]);
  };

  const handleUseGeo = () => {
    if (!useGeo) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setUseGeo(true);
        }, () => setUseGeo(false));
      }
    } else {
      setUseGeo(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">Mapa de Veterinarios</h2>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex gap-3 flex-wrap" id="filtros-servicios">
          {Object.keys(serviceLabels).map(key => (
            <label key={key} className="flex items-center gap-1 text-sm bg-gray-100 px-2 py-1 rounded" id={`flt-${key}`}>
              <input
                type="checkbox"
                checked={services.includes(key)}
                onChange={() => toggleService(key)}
              />
              {serviceLabels[key]}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Radio (km)</label>
          <input type="number" min="1" max="50" value={radiusKm} onChange={e => setRadiusKm(e.target.value)} className="w-20 border p-1 text-black" />
        </div>
        <button onClick={handleUseGeo} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-500">
          {useGeo ? 'Usar centro por defecto' : 'Usar mi ubicación'}
        </button>
        <button onClick={fetchVets} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-500">Refrescar</button>
      </div>

      <div className="w-full h-80 border rounded overflow-hidden bg-white relative" id="map-wrapper">
        {L ? <LeafletMap vets={vets} center={coords} useGeo={useGeo} /> : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Cargando Leaflet o no disponible. Veterinarios: {vets.length}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-gray-600">Cargando veterinarios...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="divide-y bg-white rounded shadow" id="lista-vets">
        {vets.map(v => (
          <li key={v._id} className="p-3 text-sm flex flex-col gap-1">
            <span className="font-medium">{v.name}</span>
            <span className="text-gray-600">{v.specialization || 'Sin especialidad'}</span>
            <span className="text-gray-500">{v.region} - {v.comuna}</span>
            <div className="flex gap-2 flex-wrap text-xs">
              {(v.services || []).map(s => (
                <span key={s} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{serviceLabels[s] || s}</span>
              ))}
            </div>
            {typeof v.distancia === 'number' && (
              <span className="text-xs text-gray-400">~{(v.distancia/1000).toFixed(2)} km</span>
            )}
          </li>
        ))}
        {!loading && vets.length === 0 && <li className="p-3 text-sm text-gray-500">Sin resultados</li>}
      </ul>
    </div>
  );
};

export default VetMap;

// Sub-componente separado para evitar recrear lógica principal
const LeafletMap = ({ vets, center }) => {
  const mapId = 'leaflet-map-container';
  const [mapInstance, setMapInstance] = useState(null);
  const [layerGroup, setLayerGroup] = useState(null);

  useEffect(() => {
    if (!L) return;
    if (!mapInstance) {
      const map = L.map(mapId).setView([center.lat, center.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);
      const group = L.layerGroup().addTo(map);
      setMapInstance(map);
      setLayerGroup(group);
    }
  }, [center, mapInstance]);

  useEffect(() => {
    if (!L || !mapInstance || !layerGroup) return;
    layerGroup.clearLayers();
    vets.forEach(v => {
      if (v.location && v.location.coordinates && v.location.coordinates.length === 2) {
        const [lng, lat] = v.location.coordinates; // GeoJSON order
        const marker = L.marker([lat, lng]).bindPopup(`
          <div style="font-size:12px;">
            <strong>${v.name}</strong><br/>
            ${(v.services || []).map(s => `<span>${s}</span>`).join(', ')}<br/>
            ${v.region || ''} - ${v.comuna || ''}
          </div>
        `);
        marker.addTo(layerGroup);
      }
    });
  }, [vets, layerGroup]);

  return <div id={mapId} className="w-full h-full" />;
};
