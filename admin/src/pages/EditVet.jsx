import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const regions = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo",
  "Magallanes y de la Antártica Chilena",
];

const comunasByRegion = {
  "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"],
  "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"],
  "Antofagasta": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"],
  "Atacama": ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"],
  "Coquimbo": ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paiguano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca", "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"],
  "Valparaíso": ["Valparaíso", "Casablanca", "Concón", "Juan Fernández", "Puchuncaví", "Quintero", "Viña del Mar", "Isla de Pascua", "Los Andes", "Calle Larga", "Rinconada", "San Esteban", "La Ligua", "Petorca", "Cabildo", "Papudo", "Zapallar", "Putaendo", "Santa María", "San Felipe", "Catemu", "Llaillay", "Nogales", "La Calera", "Hijuelas", "La Cruz", "Quillota", "Olmué", "Limache", "Villa Alemana", "Quilpué"],
  "Metropolitana de Santiago": ["Santiago", "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Vitacura", "Puente Alto", "Pirque", "San José de Maipo", "Colina", "Lampa", "Tiltil", "San Bernardo", "Buin", "Calera de Tango", "Paine", "Melipilla", "Alhué", "Curacaví", "María Pinto", "San Pedro", "Talagante", "El Monte", "Isla de Maipo", "Padre Hurtado", "Peñaflor"],
  "Libertador General Bernardo O'Higgins": ["Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "Pichilemu", "La Estrella", "Litueche", "Marchihue", "Navidad", "Paredones", "San Fernando", "Chépica", "Chimbarongo", "Lolol", "Nancagua", "Palmilla", "Peralillo", "Placilla", "Pumanque", "Santa Cruz"],
  "Maule": ["Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael", "Cauquenes", "Chanco", "Pelluhue", "Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia", "Teno", "Vichuquén", "Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre", "Yerbas Buenas"],
  "Ñuble": ["Chillán", "Bulnes", "Chillán Viejo", "El Carmen", "Pemuco", "Pinto", "Quillón", "San Ignacio", "Yungay", "Quirihue", "Cobquecura", "Coelemu", "Ninhue", "Portezuelo", "Ránquil", "Treguaco", "San Carlos", "Coihueco", "Ñiquén", "San Fabián", "San Nicolás"],
  "Biobío": ["Concepción", "Coronel", "Chiguayante", "Florida", "Hualpén", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana", "Talcahuano", "Tomé", "Arauco", "Cañete", "Contulmo", "Curanilahue", "Lebu", "Los Álamos", "Tirúa", "Los Ángeles", "Antuco", "Cabrero", "Laja", "Lautaro", "Mulchén", "Nacimiento", "Negrete", "Quilaco", "Quilleco", "San Rosendo", "Santa Bárbara", "Tucapel", "Yumbel"],
  "La Araucanía": ["Temuco", "Carahue", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén", "Vilcún", "Villarrica", "Angol", "Collipulli", "Curacautín", "Ercilla", "Lonquimay", "Los Sauces", "Lumaco", "Purén", "Renaico", "Traiguén", "Victoria"],
  "Los Ríos": ["Valdivia", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"],
  "Los Lagos": ["Puerto Montt", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Maullín", "Puerto Varas", "Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo", "Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao", "Chaitén", "Futaleufú", "Hualaihué", "Palena"],
  "Aysén del General Carlos Ibáñez del Campo": ["Coyhaique", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Cochrane", "O'Higgins", "Tortel", "Chile Chico", "Río Ibáñez"],
  "Magallanes y de la Antártica Chilena": ["Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio", "Porvenir", "Primavera", "Timaukel", "Natales", "Torres del Paine", "Cabo de Hornos", "Antártica"]
};

const EditVet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vet, setVet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    fetchVet();
  }, [id]);

  const fetchVet = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5555/api/vets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVet(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching vet:', err);
      setError(err.response?.data?.message || 'Error al cargar el veterinario');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setVet(prev => ({ ...prev, [name]: checked }));
    } else if (name.startsWith('clinicAddress.')) {
      const field = name.split('.')[1];
      setVet(prev => ({
        ...prev,
        clinicAddress: {
          ...prev.clinicAddress,
          [field]: value
        }
      }));
    } else {
      setVet(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const updateData = { ...vet };

      // Preparar datos para envío
      if (updateData.clinicAddress) {
        updateData.clinicAddress = JSON.stringify(updateData.clinicAddress);
      }
      if (updateData.openingHours) {
        updateData.openingHours = JSON.stringify(updateData.openingHours);
      }
      if (updateData.services && Array.isArray(updateData.services)) {
        updateData.services = updateData.services.join(',');
      }
      if (updateData.location?.coordinates) {
        updateData.lat = updateData.location.coordinates[1];
        updateData.lng = updateData.location.coordinates[0];
      }

      // Remover campos que no deben enviarse
      delete updateData._id;
      delete updateData.__v;
      delete updateData.password;
      delete updateData.location;

      const response = await axios.put(
        `http://localhost:5555/api/vets/admin/${id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/vets');
      }, 2000);
    } catch (err) {
      console.error('Error updating vet:', err);
      setError(err.response?.data?.message || 'Error al actualizar el veterinario');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5555/api/vets/admin/${id}/reset-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Contraseña reseteada exitosamente');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      console.error('Error resetting password:', err);
      alert(err.response?.data?.message || 'Error al resetear la contraseña');
    }
  };

  const handleUpdateVerification = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5555/api/vets/admin/${id}/verification-status`,
        { verificationStatus, notes: verificationNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Estado de verificación actualizado exitosamente');
      setShowVerificationModal(false);
      setVerificationNotes('');
      fetchVet(); // Recargar datos
    } catch (err) {
      console.error('Error updating verification:', err);
      alert(err.response?.data?.message || 'Error al actualizar el estado de verificación');
    }
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  if (!vet) {
    return <div className="p-4 text-red-500">Veterinario no encontrado</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Editar Veterinario</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Resetear Contraseña
          </button>
          <button
            onClick={() => setShowVerificationModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Cambiar Verificación
          </button>
          <button
            onClick={() => navigate('/admin/vets')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Volver
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Veterinario actualizado exitosamente. Redirigiendo...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                name="name"
                value={vet.name || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={vet.email || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono *</label>
              <input
                type="text"
                name="phoneNumber"
                value={vet.phoneNumber || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">RUT/Nacional ID *</label>
              <input
                type="text"
                name="nationalId"
                value={vet.nationalId || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Especialización</label>
              <input
                type="text"
                name="specialization"
                value={vet.specialization || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Años de Experiencia</label>
              <input
                type="number"
                name="experience"
                value={vet.experience || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Calificaciones</label>
              <textarea
                name="qualifications"
                value={vet.qualifications || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Región</label>
              <select
                name="region"
                value={vet.region || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Seleccionar</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comuna</label>
              <select
                name="comuna"
                value={vet.comuna || ''}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                disabled={!vet.region}
              >
                <option value="">Seleccionar</option>
                {vet.region && comunasByRegion[vet.region]?.map(comuna => (
                  <option key={comuna} value={comuna}>{comuna}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Veterinario</label>
              <select
                name="vetType"
                value={vet.vetType || 'independent'}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="independent">Independiente</option>
                <option value="clinic">Clínica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado de Aprobación</label>
              <select
                name="isApproved"
                value={vet.isApproved ? 'true' : 'false'}
                onChange={(e) => setVet(prev => ({ ...prev, isApproved: e.target.value === 'true' }))}
                className="w-full p-2 border rounded"
              >
                <option value="false">Pendiente</option>
                <option value="true">Aprobado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Información de Clínica (si es clínica) */}
        {vet.vetType === 'clinic' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Información de Clínica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">RUT Clínica</label>
                <input
                  type="text"
                  name="clinicRut"
                  value={vet.clinicRut || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Razón Social</label>
                <input
                  type="text"
                  name="legalName"
                  value={vet.legalName || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  name="tradeName"
                  value={vet.tradeName || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Calle</label>
                <input
                  type="text"
                  name="clinicAddress.street"
                  value={vet.clinicAddress?.street || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número</label>
                <input
                  type="text"
                  name="clinicAddress.number"
                  value={vet.clinicAddress?.number || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comuna</label>
                <input
                  type="text"
                  name="clinicAddress.commune"
                  value={vet.clinicAddress?.commune || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Región</label>
                <input
                  type="text"
                  name="clinicAddress.region"
                  value={vet.clinicAddress?.region || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referencia</label>
                <input
                  type="text"
                  name="clinicAddress.reference"
                  value={vet.clinicAddress?.reference || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Ubicación */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Ubicación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Latitud</label>
              <input
                type="number"
                step="any"
                value={vet.location?.coordinates?.[1] || ''}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  const lng = vet.location?.coordinates?.[0] || 0;
                  setVet(prev => ({
                    ...prev,
                    location: {
                      type: 'Point',
                      coordinates: [lng, lat]
                    }
                  }));
                }}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitud</label>
              <input
                type="number"
                step="any"
                value={vet.location?.coordinates?.[0] || ''}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  const lat = vet.location?.coordinates?.[1] || 0;
                  setVet(prev => ({
                    ...prev,
                    location: {
                      type: 'Point',
                      coordinates: [lng, lat]
                    }
                  }));
                }}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Configuración */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Configuración</h2>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="supportsEmergency"
                checked={vet.supportsEmergency || false}
                onChange={handleChange}
                className="mr-2"
              />
              <span>Soporta Emergencias</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="availableNow"
                checked={vet.availableNow || false}
                onChange={handleChange}
                className="mr-2"
              />
              <span>Disponible Ahora</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/vets')}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* Modal para resetear contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Resetear Contraseña</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Resetear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar verificación */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Cambiar Estado de Verificación</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="pending">Pendiente</option>
                <option value="verified">Verificado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Notas sobre el cambio de estado..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationNotes('');
                  setVerificationStatus('pending');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateVerification}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditVet;

