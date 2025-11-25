import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config/api.js';
// Avatar por defecto - usar imagen del backend o placeholder
const defaultAvatar = '/avatar.png';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsersAndPets = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No se encontró token. Por favor inicia sesión.');

        const response = await axios.get(`${API_BASE}/api/users/role/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const fetchedUsers = response.data.users;

        const usersWithPets = await Promise.all(
          fetchedUsers.map(async user => {
            try {
              const petRes = await axios.get(`${API_BASE}/api/pets/userpet/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              return { ...user, pets: petRes.data.pets || [] };
            } catch (err) {
              console.error(`❌ Error fetching pets for user ${user._id}:`, err);
              return { ...user, pets: [] };
            }
          })
        );

        setUsers(usersWithPets);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching users:', err);
        setError(err.response?.data?.message || err.message);
        setLoading(false);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };

    fetchUsersAndPets();
  }, [navigate]);

const handleRemove = async (userId) => {
  if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario y todas sus mascotas?')) return;

  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No se encontró token');

    // Delete all pets of the user
    await axios.delete(`${API_BASE}/api/pets/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Then delete the user
    await axios.delete(`${API_BASE}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Update local state
    setUsers(users.filter(user => user._id !== userId));
    alert('Usuario y sus mascotas eliminados exitosamente');
  } catch (err) {
    console.error('Error eliminando usuario y mascotas:', err);
    alert(err.response?.data?.message || 'Error al eliminar usuario y mascotas');
  }
};



  if (loading) return <div className="p-4">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

return (
  <div className="p-2 md:p-4 lg:p-6">
    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">Gestionar Usuarios</h1>
    {users.length === 0 ? (
      <p className="text-center text-gray-500 py-8">No se encontraron usuarios.</p>
    ) : (
      <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map(user => (
          <div
            key={user._id}
            className="w-full min-h-[200px] md:h-[220px] max-w-xs mx-auto bg-white rounded-lg md:rounded-xl shadow-md p-3 md:p-4 flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-center space-x-4 mb-3">
              <img
                src={user.avatar || defaultAvatar} // fallback avatar image path
                alt={`Avatar de ${user.name}`}
                className="w-14 h-14 rounded-full object-cover shadow"
              />
              <div className="flex flex-col">
                <p className="text-xs text-gray-500 truncate">ID: {user._id}</p>
                <h2 className="text-lg font-semibold truncate">{user.name}</h2>
                <p className="text-sm text-gray-700 truncate">{user.email}</p>
              </div>
            </div>

            <div className="text-sm text-gray-700 overflow-y-auto max-h-12 flex items-center gap-2">
              <span className="font-medium mr-2">Mascotas:</span>
              {user.pets.length > 0 ? (
                user.pets.map(pet => (
                  <div key={pet._id} className="flex items-center space-x-1">
                    <img
                      src={pet.image || '/default-pet.png'} // fallback image if none
                      alt={`Mascota ${pet.name}`}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>{pet.name}</span>
                  </div>
                ))
              ) : (
                'Sin mascotas'
              )}
            </div>

            <button
              onClick={() => handleRemove(user._id)}
              className="mt-3 md:mt-4 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 text-sm self-start transition-colors"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

};

export default Users;
