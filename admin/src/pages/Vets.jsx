import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import avatar from '../../../Backend/uploads/avatar.png';

const Vets = () => {
  const [vets, setVets] = useState([]);
  const [appointmentCounts, setAppointmentCounts] = useState({});
  const [filteredVets, setFilteredVets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterApproval, setFilterApproval] = useState('all');
  const [filterVetType, setFilterVetType] = useState('all'); // 'all', 'clinic', 'independent'
  const [filterVerificationStatus, setFilterVerificationStatus] = useState('all'); // 'all', 'pending', 'verified', 'rejected'
  const [selectedVet, setSelectedVet] = useState(null); // Para mostrar detalles
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState('desc');


  useEffect(() => {
    const fetchAppointmentCount = async (vetId, token) => {
      try {
        console.log(`📡 Fetching appointment count for vet ID: ${vetId}`);

        const response = await axios.get(
          `http://localhost:5555/api/vets/${vetId}/appointments/count`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`✅ Appointment count received for vet ${vetId}:`, response.data.totalAppointments);

        return response.data.totalAppointments;
      } catch (err) {
        console.error(`❌ Error fetching appointment count for vet ${vetId}:`, err);
        return 0;
      }
    };


    const fetchVets = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No se encontró token. Por favor inicia sesión.');

        const response = await axios.get('http://localhost:5555/api/vets/role/vet', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const counts = await Promise.all(
          response.data.vets.map(vet => fetchAppointmentCount(vet._id, token))
        );

        const countsMap = {};
        response.data.vets.forEach((vet, i) => {
          countsMap[vet._id] = counts[i];
        });

        setAppointmentCounts(countsMap);
        setVets(response.data.vets);
        setFilteredVets(response.data.vets);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching vets:', err);
        setError(err.response?.data?.message || err.message);
        setLoading(false);
        if ([401, 403].includes(err.response?.status)) {
          localStorage.clear();
          navigate('/login');
        }
      }
    };

    fetchVets();
  }, [navigate]);

  // Filtering and sorting logic with approval status filter and appointment count sort
  useEffect(() => {
    const filtered = vets.filter(vet => {
      const matchesName = vet.name.toLowerCase().includes(filterName.toLowerCase());
      const matchesPhone = vet.phoneNumber.includes(filterPhone);
      const matchesApproval =
        filterApproval === 'all' ||
        (filterApproval === 'approved' && vet.isApproved) ||
        (filterApproval === 'pending' && !vet.isApproved);
      const matchesVetType =
        filterVetType === 'all' ||
        (filterVetType === 'clinic' && vet.vetType === 'clinic') ||
        (filterVetType === 'independent' && vet.vetType === 'independent');
      const matchesVerificationStatus =
        filterVerificationStatus === 'all' ||
        vet.verificationStatus === filterVerificationStatus;

      return matchesName && matchesPhone && matchesApproval && matchesVetType && matchesVerificationStatus;
    });

    // Sort filtered vets by appointment count respecting sortOrder
    filtered.sort((a, b) => {
      const countA = appointmentCounts[a._id] ?? 0;
      const countB = appointmentCounts[b._id] ?? 0;
      return sortOrder === 'asc' ? countA - countB : countB - countA;
    });

    setFilteredVets(filtered);
  }, [filterName, filterPhone, filterApproval, filterVetType, filterVerificationStatus, vets, appointmentCounts, sortOrder]);


  const handleApprove = async (vetId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5555/api/vets/role/vet/${vetId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedVet = response.data.vet;
      setVets(vets.map(vet => (vet._id === vetId ? updatedVet : vet)));
      alert('Veterinario aprobado exitosamente');
    } catch (err) {
      console.error('Error aprobando veterinario:', err);
      alert(err.response?.data?.message || 'Error al aprobar veterinario');
    }
  };

  const handleRemove = async (vetId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este veterinario?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5555/api/vets/role/vet/${vetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVets(vets.filter(vet => vet._id !== vetId));
      alert('Veterinario eliminado exitosamente');
    } catch (err) {
      console.error('Error eliminando veterinario:', err);
      alert(err.response?.data?.message || 'Error al eliminar veterinario');
    }
  };

  if (loading) return <div className="p-4">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

return (
  <div className="p-2 md:p-4">
    <h1 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Todos los Veterinarios</h1>

    <div className="flex gap-2 md:gap-4 mb-4 md:mb-6 flex-wrap">
      <input
        type="text"
        placeholder="Filtrar por nombre"
        value={filterName}
        onChange={(e) => setFilterName(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      />
      <input
        type="text"
        placeholder="Filtrar por teléfono"
        value={filterPhone}
        onChange={(e) => setFilterPhone(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      />
      <select
        value={filterApproval}
        onChange={(e) => setFilterApproval(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      >
        <option value="all">Todos los estados</option>
        <option value="approved">Aprobados</option>
        <option value="pending">Pendientes</option>
      </select>
      <select
        value={filterVetType}
        onChange={(e) => setFilterVetType(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      >
        <option value="all">Todos los tipos</option>
        <option value="clinic">Clínicas</option>
        <option value="independent">Independientes</option>
      </select>
      <select
        value={filterVerificationStatus}
        onChange={(e) => setFilterVerificationStatus(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      >
        <option value="all">Todos los estados de verificación</option>
        <option value="pending">Pendiente</option>
        <option value="verified">Verificado</option>
        <option value="rejected">Rechazado</option>
      </select>

      {/* New sorting dropdown */}
      <select
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      >
        <option value="desc">Ordenar por Citas: Mayor a Menor</option>
        <option value="asc">Ordenar por Citas: Menor a Mayor</option>
      </select>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {filteredVets.length === 0 ? (
        <div className="col-span-full text-center text-gray-500 py-8">No hay veterinarios que coincidan con los filtros.</div>
      ) : (
        filteredVets.map(vet => (
          <div
            key={vet._id}
            className="border rounded-xl shadow-md p-4 md:p-6 flex flex-col items-center bg-white w-full max-w-sm mx-auto"
          >
            <img
              src={avatar} // fallback avatar image
              alt={`Avatar de ${vet.name}`}
              className="w-24 h-24 object-cover rounded-full mb-4 border"
            />
            <h2 className="text-lg font-bold text-center">{vet.name}</h2>
            <p className="text-sm text-gray-600 truncate">{vet.email}</p>
            <p className="text-sm text-gray-600 truncate">{vet.phoneNumber}</p>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-xs">
                <span className="font-semibold">Tipo: </span>
                <span className={vet.vetType === 'clinic' ? 'text-blue-600' : 'text-purple-600'}>
                  {vet.vetType === 'clinic' ? '🏥 Clínica' : '👤 Independiente'}
                </span>
              </p>
              <p className="text-sm">
                {vet.isApproved ? (
                  <span className="text-green-500 font-semibold">✓ Aprobado</span>
                ) : (
                  <span className="text-red-500 font-semibold">⏳ Pendiente</span>
                )}
              </p>
              <p className="text-xs">
                <span className="font-semibold">Verificación: </span>
                <span className={
                  vet.verificationStatus === 'verified' ? 'text-green-600' :
                  vet.verificationStatus === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }>
                  {vet.verificationStatus === 'verified' ? '✓ Verificado' :
                   vet.verificationStatus === 'rejected' ? '✗ Rechazado' :
                   '⏳ Pendiente'}
                </span>
              </p>
            </div>

            <p className="text-sm mt-2 text-blue-600">
              🗓️ Citas: {appointmentCounts[vet._id] ?? 'Cargando...'}
            </p>

            <div className="mt-auto flex gap-2">
              <button
                onClick={() => navigate(`/admin/vets/${vet._id}/edit`)}
                className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => setSelectedVet(vet)}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
              >
                Ver Detalles
              </button>
              {!vet.isApproved && (
                <button
                  onClick={() => handleApprove(vet._id)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                >
                  Aprobar
                </button>
              )}
              <button
                onClick={() => handleRemove(vet._id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))
      )}
    </div>

    {/* Modal de detalles del veterinario */}
    {selectedVet && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto">
        <div className="bg-white rounded-lg md:rounded-xl shadow-xl max-w-4xl w-full p-4 md:p-6 my-4 md:my-8 max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Detalles de la Solicitud</h2>
            <button
              onClick={() => setSelectedVet(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl md:text-3xl p-1"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Información Básica</h3>
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-semibold">{selectedVet.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Correo Electrónico</p>
                <p className="font-semibold">{selectedVet.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-semibold">{selectedVet.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">RUT</p>
                <p className="font-semibold">{selectedVet.nationalId || 'No proporcionado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className={`font-semibold ${selectedVet.vetType === 'clinic' ? 'text-blue-600' : 'text-purple-600'}`}>
                  {selectedVet.vetType === 'clinic' ? '🏥 Clínica' : '👤 Independiente'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Especialidad</p>
                <p className="font-semibold">{selectedVet.specialization || 'No especificada'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Región</p>
                <p className="font-semibold">{selectedVet.region || 'No especificada'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Comuna</p>
                <p className="font-semibold">{selectedVet.comuna || 'No especificada'}</p>
              </div>
            </div>

            {/* Estado y verificación */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Estado y Verificación</h3>
              <div>
                <p className="text-sm text-gray-600">Estado de Aprobación</p>
                <p className={`font-semibold ${selectedVet.isApproved ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedVet.isApproved ? '✓ Aprobado' : '⏳ Pendiente'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado de Verificación</p>
                <p className={`font-semibold ${
                  selectedVet.verificationStatus === 'verified' ? 'text-green-600' :
                  selectedVet.verificationStatus === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {selectedVet.verificationStatus === 'verified' ? '✓ Verificado' :
                   selectedVet.verificationStatus === 'rejected' ? '✗ Rechazado' :
                   '⏳ Pendiente'}
                </p>
              </div>
              {selectedVet.verificationMetadata && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Verificado por</p>
                    <p className="font-semibold">{selectedVet.verificationMetadata.checkedBy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de verificación</p>
                    <p className="font-semibold">
                      {selectedVet.verificationMetadata.checkedAt 
                        ? new Date(selectedVet.verificationMetadata.checkedAt).toLocaleDateString('es-CL')
                        : 'N/A'}
                    </p>
                  </div>
                  {selectedVet.verificationMetadata.notes && (
                    <div>
                      <p className="text-sm text-gray-600">Notas</p>
                      <p className="font-semibold text-sm">{selectedVet.verificationMetadata.notes}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <p className="text-sm text-gray-600">Fecha de registro</p>
                <p className="font-semibold">
                  {selectedVet.createdAt 
                    ? new Date(selectedVet.createdAt).toLocaleDateString('es-CL')
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Documentos (si es clínica) */}
            {selectedVet.vetType === 'clinic' && (
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Información de Clínica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">RUT Clínica</p>
                    <p className="font-semibold">{selectedVet.clinicRut || 'No proporcionado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Razón Social</p>
                    <p className="font-semibold">{selectedVet.legalName || 'No proporcionado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nombre Comercial</p>
                    <p className="font-semibold">{selectedVet.tradeName || 'No proporcionado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dirección</p>
                    <p className="font-semibold">{selectedVet.clinicAddress?.street || 'No proporcionado'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Documentos subidos */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Documentos Subidos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedVet.frontIdImage && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cédula Frontal</p>
                    <a 
                      href={`http://localhost:5555/${selectedVet.frontIdImage}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver documento
                    </a>
                  </div>
                )}
                {selectedVet.backIdImage && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cédula Reverso</p>
                    <a 
                      href={`http://localhost:5555/${selectedVet.backIdImage}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver documento
                    </a>
                  </div>
                )}
                {selectedVet.nationalIdDocument && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Documento de Identidad</p>
                    <a 
                      href={`http://localhost:5555/${selectedVet.nationalIdDocument}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver documento
                    </a>
                  </div>
                )}
                {selectedVet.vetType === 'clinic' && selectedVet.municipalLicenseDocument && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Licencia Municipal</p>
                    <a 
                      href={`http://localhost:5555/${selectedVet.municipalLicenseDocument}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver documento
                    </a>
                  </div>
                )}
                {selectedVet.vetType === 'independent' && selectedVet.siiActivityStartDocument && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Inicio de Actividades SII</p>
                    <a 
                      href={`http://localhost:5555/${selectedVet.siiActivityStartDocument}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver documento
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={() => setSelectedVet(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cerrar
            </button>
            {!selectedVet.isApproved && (
              <button
                onClick={() => {
                  handleApprove(selectedVet._id);
                  setSelectedVet(null);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Aprobar Solicitud
              </button>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

};

export default Vets;
