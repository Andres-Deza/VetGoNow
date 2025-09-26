import React, { useEffect, useState } from "react";
import axios from "axios";
import avatar from "../assets/avatar.png";  // Adjust path if needed

const Dashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const { data } = await axios.get(
          "http://localhost:5555/api/admin/profile",
          config
        );

        setAdmin(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmin();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-semibold">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="text-red-600 text-center text-xl font-semibold mt-10">
        {error}
      </div>
    );

  return (
    <div className="p-10 max-w-3xl mx-auto bg-white rounded-2xl shadow-xl mt-10">
      <h1 className="text-4xl font-extrabold mb-10 text-center">Admin Profile</h1>
      <div className="flex items-center space-x-12">
        <img
          src={admin.image || avatar}
          alt="Admin avatar"
          className="w-32 h-32 object-cover rounded-xl shadow-lg"
        />
        <div>
          <p className="text-2xl font-semibold mb-3">{admin.name}</p>
          <p className="text-xl text-gray-800 mb-2">{admin.email}</p>
          <p className="text-xl text-gray-800 mb-2">Phone: {admin.phoneNumber}</p>
          <p className="text-gray-500 text-lg mt-4">ID: {admin._id}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
