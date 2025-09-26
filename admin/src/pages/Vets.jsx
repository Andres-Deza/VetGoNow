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
  const [filterApproval, setFilterApproval] = useState('all'); // new filter state
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
        if (!token) throw new Error('No token found. Please log in.');

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

      return matchesName && matchesPhone && matchesApproval;
    });

    // Sort filtered vets by appointment count respecting sortOrder
    filtered.sort((a, b) => {
      const countA = appointmentCounts[a._id] ?? 0;
      const countB = appointmentCounts[b._id] ?? 0;
      return sortOrder === 'asc' ? countA - countB : countB - countA;
    });

    setFilteredVets(filtered);
  }, [filterName, filterPhone, filterApproval, vets, appointmentCounts, sortOrder]);


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
      alert('Vet approved successfully');
    } catch (err) {
      console.error('❌ Error approving vet:', err);
      alert(err.response?.data?.message || 'Failed to approve vet');
    }
  };

  const handleRemove = async (vetId) => {
    if (!window.confirm('Are you sure you want to remove this vet?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5555/api/vets/role/vet/${vetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVets(vets.filter(vet => vet._id !== vetId));
      alert('Vet removed successfully');
    } catch (err) {
      console.error('❌ Error removing vet:', err);
      alert(err.response?.data?.message || 'Failed to remove vet');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

return (
  <div className="p-4">
    <h1 className="text-2xl font-semibold mb-4">All Vets</h1>

    <div className="flex gap-4 mb-6 flex-wrap">
      <input
        type="text"
        placeholder="Filter by name"
        value={filterName}
        onChange={(e) => setFilterName(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      />
      <input
        type="text"
        placeholder="Filter by phone number"
        value={filterPhone}
        onChange={(e) => setFilterPhone(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      />
      <select
        value={filterApproval}
        onChange={(e) => setFilterApproval(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      >
        <option value="all">All</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
      </select>

      {/* New sorting dropdown */}
      <select
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
        className="border px-4 py-2 rounded w-full sm:w-auto"
      >
        <option value="desc">Sort by Appointments: High to Low</option>
        <option value="asc">Sort by Appointments: Low to High</option>
      </select>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {filteredVets.length === 0 ? (
        <div>No vets match your filters.</div>
      ) : (
        filteredVets.map(vet => (
          <div
            key={vet._id}
            className="border rounded-xl shadow-md p-6 flex flex-col items-center bg-white"
            style={{ width: "280px", height: "360px" }} // fixed size box
          >
            <img
              src={avatar} // fallback avatar image
              alt={vet.name}
              className="w-24 h-24 object-cover rounded-full mb-4 border"
            />
            <h2 className="text-lg font-bold text-center">{vet.name}</h2>
            <p className="text-sm text-gray-600 truncate">{vet.email}</p>
            <p className="text-sm text-gray-600 truncate">{vet.phoneNumber}</p>
            <p className="text-sm mt-1">
              {vet.isApproved ? (
                <span className="text-green-500">Approved</span>
              ) : (
                <span className="text-red-500">Pending</span>
              )}
            </p>

            <p className="text-sm mt-2 text-blue-600">
              🗓️ Appointments: {appointmentCounts[vet._id] ?? 'Loading...'}
            </p>

            <div className="mt-auto flex gap-2">
              {!vet.isApproved && (
                <button
                  onClick={() => handleApprove(vet._id)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                >
                  Approve
                </button>
              )}
              <button
                onClick={() => handleRemove(vet._id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

};

export default Vets;
