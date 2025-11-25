import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

// Importar Leaflet (ESM) y su CSS para que funcione bien en Vite
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configurar iconos por defecto (rutas correctas para Vite)
if (L && L.Icon && L.Icon.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString()
  });
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
  const API_BASE = import.meta.env.VITE_API_BASE || '';

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
      const url = `${API_BASE}/api/vets/filter?${params.toString()}`;
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
        {vets.map(v => {
          const isNew = !v?.ratings || v?.ratings?.total === 0 || v?.ratings?.total < 5;
          const shouldShowAverage = v?.ratings?.showAverage && v?.ratings?.total >= 5;
          
          return (
          <li key={v._id} className="p-3 text-sm flex flex-col gap-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="font-medium">{v.name}</span>
                <span className="text-gray-600 block">{v.specialization || 'Sin especialidad'}</span>
                <span className="text-gray-500">{v.region} - {v.comuna}</span>
              </div>
              {/* Rating o Badge Nuevo */}
              <div className="flex-shrink-0 ml-2">
                {isNew ? (
                  <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    Nuevo
                  </span>
                ) : shouldShowAverage && v?.ratings?.average > 0 ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-3 h-3 ${star <= v.ratings.average ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">({v.ratings.total})</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              {(v.services || []).map(s => (
                <span key={s} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{serviceLabels[s] || s}</span>
              ))}
            </div>
            {typeof v.distancia === 'number' && (
              <span className="text-xs text-gray-400">~{(v.distancia/1000).toFixed(2)} km</span>
            )}
          </li>
          );
        })}
        {!loading && vets.length === 0 && <li className="p-3 text-sm text-gray-500">Sin resultados</li>}
      </ul>
    </div>
  );
};

export default VetMap;

// Sub-componente separado para evitar recrear lógica principal
const LeafletMap = ({ vets, center }) => {
  const mapId = 'leaflet-map-container';
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Inicializar mapa una vez y cuando cambie el centro, recentrar
  useEffect(() => {
    if (!L) return;

    const container = L.DomUtil.get(mapId);
    // Si el contenedor ya tiene un mapa adjunto (por HMR/fast refresh), resetea el id para permitir nueva instancia
    if (container && container._leaflet_id && !mapRef.current) {
      container._leaflet_id = null;
    }

    if (!mapRef.current) {
      const map = L.map(mapId).setView([center.lat, center.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);
      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    } else {
      // Recentrar si cambia el centro
      mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom());
    }

    // Cleanup al desmontar componente
    return () => {
      // No eliminamos en cada render; sólo en unmount real
    };
  }, [center]);

  // Renderizar marcadores cuando cambie la lista de veterinarios
  useEffect(() => {
    if (!L || !mapRef.current || !layerGroupRef.current) return;
    const group = layerGroupRef.current;
    group.clearLayers();
    vets.forEach(v => {
      if (v.location && v.location.coordinates && v.location.coordinates.length === 2) {
        const [lng, lat] = v.location.coordinates; // GeoJSON order
        const marker = L.marker([lat, lng]).bindPopup(`
          <div style="font-size:12px; line-height:1.3;">
            <strong>${v.name}</strong><br/>
            ${(v.services || []).map(s => `<span>${s}</span>`).join(', ')}<br/>
            ${v.region || ''} - ${v.comuna || ''}<br/>
            ${typeof v.distancia === 'number' ? `~${(v.distancia/1000).toFixed(2)} km` : ''}
            <div style="margin-top:6px;">
              <a href="/appointment/${v._id}" style="display:inline-block;background:#2563eb;color:white;padding:6px 10px;border-radius:6px;text-decoration:none;font-weight:600">Agendar</a>
            </div>
          </div>
        `);
        marker.addTo(group);
      }
    });
  }, [vets]);

  // Cleanup en unmount para evitar contenedor ya inicializado
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  return <div id={mapId} className="w-full h-full" />;
};
