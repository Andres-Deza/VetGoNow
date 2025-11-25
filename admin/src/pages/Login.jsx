import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE from "../config/api.js";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await axios.post(`${API_BASE}/api/admin/login`, {
        email: formData.email,
        password: formData.password,
        role: "admin",
      });
      const { token, admin } = response.data;
      console.log("Login response:", { token, admin });
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(admin));
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Login error:", err.response ? err.response.data : err);
      setError(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center">Inicio de Sesión de Administrador</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Correo Electrónico</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Iniciar Sesión
          </button>
        </form>
        <p className="mt-4 text-center">
          ¿No tienes una cuenta? <a href="/admin/register" className="text-blue-600">Registrarse</a>
        </p>
      </div>
    </div>
  );
};

export default Login;