import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, phoneNumber, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden!");
      return;
    }

    const data = { name, email, phoneNumber, password, role: "admin" };

    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5555/api/admin/register", data, {
        headers: { "Content-Type": "application/json" }
      });

      console.log("Admin registrado exitosamente:", response.data);
      alert("Registro de administrador exitoso!");
      navigate("/login");
    } catch (err) {
      console.error("Error durante el registro de administrador:", err.response ? err.response.data : err);
      setError(err.response?.data?.message || "Error al registrar administrador. Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center">Registrar Administrador</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
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
            <label className="block text-gray-700 mb-2">Número de Teléfono</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
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
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Confirmar Contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Registrando..." : "Registrar Administrador"}
          </button>
        </form>
        <p className="mt-4 text-center">
          ¿Ya tienes una cuenta? <a href="/login" className="text-blue-600">Iniciar Sesión</a>
        </p>
      </div>
    </div>
  );
};

export default Register;