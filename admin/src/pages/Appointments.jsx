import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api.js';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterVet, setFilterVet] = useState('');
  const [filterPet, setFilterPet] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [vetNames, setVetNames] = useState({});
  const [ownerNames, setOwnerNames] = useState({});
  const [petNames, setPetNames] = useState({});

  const fetchVetName = async (vetId) => {
    if (!vetId) return 'Veterinario Desconocido';
    const id = typeof vetId === 'object' ? vetId._id || vetId?.$oid : vetId;
    if (vetNames[id]) return vetNames[id];

    try {
      const { data } = await axios.get(`${API_BASE}/api/vets/findvetsname/all/${id}`);
      return data.name;
    } catch (err) {
      console.error('Error obteniendo nombre del veterinario:', err);
      return 'Veterinario Desconocido';
    }
  };

  const fetchOwnerName = async (ownerId) => {
    if (!ownerId) return 'Dueño Desconocido';
    const id = typeof ownerId === 'object' ? ownerId._id : ownerId;
    if (ownerNames[id]) return ownerNames[id];

    try {
      const { data } = await axios.get(`${API_BASE}/api/users/findownersname/all/${id}`);
      return data.user.name;
    } catch {
      return 'Dueño Desconocido';
    }
  };

  const fetchPetName = async (petId) => {
    if (!petId) return 'Mascota Desconocida';
    const id = typeof petId === 'object' ? petId._id : petId;
    if (petNames[id]) return petNames[id];

    try {
      const { data } = await axios.get(`${API_BASE}/api/pets/findpetsname/all/${id}`);
      return data.pet.name;
    } catch {
      return 'Mascota Desconocida';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No se encontró token, por favor inicia sesión.');

        const { data } = await axios.get(`${API_BASE}/api/appointments/allappointments/fetching`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let appointments = data.appointments;

        // Sort appointments by date (descending)
        appointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));

        const getId = (item) => typeof item === 'object' ? item._id : item;

        const uniqueVetIds = [...new Set(appointments.map(a => getId(a.vetId)))];
        const uniqueOwnerIds = [...new Set(appointments.map(a => getId(a.userId)))];
        const uniquePetIds = [...new Set(appointments.map(a => getId(a.petId)))];

        const vets = {};
        for (const id of uniqueVetIds) {
          vets[id] = await fetchVetName(id);
        }
        const owners = {};
        for (const id of uniqueOwnerIds) {
          owners[id] = await fetchOwnerName(id);
        }
        const pets = {};
        for (const id of uniquePetIds) {
          pets[id] = await fetchPetName(id);
        }

        setVetNames(vets);
        setOwnerNames(owners);
        setPetNames(pets);
        setAppointments(appointments);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Error al cargar las citas');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAppointments = appointments.filter(app => {
    const vetName = vetNames[app.vetId?._id || app.vetId] || '';
    const ownerName = ownerNames[app.userId?._id || app.userId] || '';
    const petName = petNames[app.petId?._id || app.petId] || '';

    const matchesVet = vetName.toLowerCase().includes(filterVet.toLowerCase());
    const matchesOwner = ownerName.toLowerCase().includes(filterOwner.toLowerCase());
    const matchesPet = petName.toLowerCase().includes(filterPet.toLowerCase());
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;

    return matchesVet && matchesOwner && matchesPet && matchesStatus;
  });

  if (loading) return <div className="p-4">Cargando citas...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-2 md:p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Todas las Citas</h1>

      {/* Filters */}
      <div className="flex gap-2 md:gap-4 mb-4 md:mb-6 flex-wrap items-center">
        <input
          type="text"
          placeholder="Filtrar por Veterinario"
          value={filterVet}
          onChange={e => setFilterVet(e.target.value)}
          className="border px-4 py-2 rounded w-full sm:w-auto"
        />
        <input
          type="text"
          placeholder="Filtrar por Mascota"
          value={filterPet}
          onChange={e => setFilterPet(e.target.value)}
          className="border px-4 py-2 rounded w-full sm:w-auto"
        />
        <input
          type="text"
          placeholder="Filtrar por Dueño"
          value={filterOwner}
          onChange={e => setFilterOwner(e.target.value)}
          className="border px-4 py-2 rounded w-full sm:w-auto"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border px-4 py-2 rounded w-full sm:w-auto"
        >
          <option value="all">Todos los Estados</option>
          <option value="pending">Pendiente</option>
          <option value="completed">Completada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <button
          onClick={() => {
            setFilterVet('');
            setFilterPet('');
            setFilterOwner('');
            setFilterStatus('all');
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded text-sm md:text-base whitespace-nowrap"
        >
          Limpiar Filtros
        </button>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No se encontraron citas que coincidan con los filtros.</div>
      ) : (
        <>
          {/* Mobile: Card View */}
          <div className="md:hidden space-y-3">
            {filteredAppointments.map(app => {
              const vetId = app.vetId?._id || app.vetId;
              const userId = app.userId?._id || app.userId;
              const petId = app.petId?._id || app.petId;

              return (
                <div key={app._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{vetNames[vetId] || 'Cargando...'}</p>
                      <p className="text-sm text-gray-600">{ownerNames[userId] || 'Cargando...'}</p>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-white text-xs font-semibold whitespace-nowrap ml-2
                        ${
                          app.status === 'completed' ? 'bg-green-600' :
                          app.status === 'pending' ? 'bg-yellow-500' :
                          app.status === 'cancelled' ? 'bg-red-600' :
                          'bg-gray-400'
                        }`}
                    >
                      {app.status === 'pending' ? 'Pendiente' : 
                       app.status === 'completed' ? 'Completada' : 
                       app.status === 'cancelled' ? 'Cancelada' : 
                       app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Mascota:</span> {petNames[petId] || 'Cargando...'}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(app.appointmentDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Hora:</span> {app.scheduledTime}</p>
                    <p><span className="font-medium">Tipo:</span> {app.appointmentType}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                  <th className="p-3 border-b">Veterinario</th>
                  <th className="p-3 border-b">Dueño</th>
                  <th className="p-3 border-b">Mascota</th>
                  <th className="p-3 border-b">Fecha</th>
                  <th className="p-3 border-b">Hora</th>
                  <th className="p-3 border-b">Tipo</th>
                  <th className="p-3 border-b">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(app => {
                  const vetId = app.vetId?._id || app.vetId;
                  const userId = app.userId?._id || app.userId;
                  const petId = app.petId?._id || app.petId;

                  return (
                    <tr key={app._id} className="border-b hover:bg-gray-50 text-sm">
                      <td className="p-3">{vetNames[vetId] || 'Cargando...'}</td>
                      <td className="p-3">{ownerNames[userId] || 'Cargando...'}</td>
                      <td className="p-3">{petNames[petId] || 'Cargando...'}</td>
                      <td className="p-3">{new Date(app.appointmentDate).toLocaleDateString()}</td>
                      <td className="p-3">{app.scheduledTime}</td>
                      <td className="p-3">{app.appointmentType}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-white text-xs font-semibold
                            ${
                              app.status === 'completed' ? 'bg-green-600' :
                              app.status === 'pending' ? 'bg-yellow-500' :
                              app.status === 'cancelled' ? 'bg-red-600' :
                              'bg-gray-400'
                            }`}
                        >
                          {app.status === 'pending' ? 'Pendiente' : 
                           app.status === 'completed' ? 'Completada' : 
                           app.status === 'cancelled' ? 'Cancelada' : 
                           app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Appointments;
