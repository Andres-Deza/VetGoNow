import React, { useState } from "react";
import axios from "axios";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTokenVerified, setIsTokenVerified] = useState(false);
  const [services, setServices] = useState([]); // servicios para veterinario

  const toggleService = (svc) => {
    setServices(prev => prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSendToken = async () => {
    try {
      await axios.post("http://localhost:5555/api/send-token/toemail", { email });
      alert("Código de verificación enviado a tu correo electrónico.");
    } catch (err) {
      alert("No se pudo enviar el código de verificación.");
      console.error(err);
    }
  };

  const handleVerifyToken = async () => {
    try {
      const res = await axios.post("http://localhost:5555/api/send-token/verify-token", {
        email,
        token,
      });

      if (res.data?.success) {
        setIsTokenVerified(true);
        alert("¡Token verificado exitosamente!");
      } else {
        setIsTokenVerified(false);
        alert("Token inválido o expirado.");
      }
    } catch (err) {
      setIsTokenVerified(false);
      alert("La verificación del token falló.");
      console.error(err);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (password !== confirmPassword) return alert("Las contraseñas no coinciden");
  if (!isTokenVerified) return alert("Por favor verifica tu correo antes de registrarte.");
  if (!role) return alert("Por favor selecciona un rol.");

  setLoading(true);
  setError("");

  try {
    const url = role === "User"
      ? "http://localhost:5555/api/users/"
      : "http://localhost:5555/api/vets/";

    // Send plain JSON, no FormData
    const response = await axios.post(url, {
      name,
      email,
      phoneNumber,
      password,
      role,
  services: role === 'Vet' ? services : [],
      token // if your backend expects this, otherwise remove it
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    alert("¡Registro exitoso!");
    console.log("Registered:", response.data);
    window.location.href = "/login"; // redirect using plain JS


  } catch (err) {
    setError(err.response?.data?.message || "Error en el registro.");
    console.error(err);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-700 text-center mb-6">Regístrate</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Image Upload */}


        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            id="name"
            name="name"
            className="w-full p-2 border border-gray-300 rounded-md text-black"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            required
          />
        </div>

        {/* Email + Get Code */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <div className="flex gap-2">
            <input
              type="email"
              id="email"
              name="email"
              className="flex-1 p-2 border border-gray-300 rounded-md text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
            <button
              type="button"
              onClick={handleSendToken}
              className="bg-blue-600 text-white px-3 rounded-md hover:bg-blue-700"
            >
              Obtener código
            </button>
          </div>
        </div>

        {/* Token + Verify */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Código de verificación</label>
          <div className="flex gap-2">
            <input
              type="text"
              id="token"
              name="token"
              className="flex-1 p-2 border border-gray-300 rounded-md text-black"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Ingresa el código enviado a tu email"
              required
            />
            <button
              type="button"
              onClick={handleVerifyToken}
              className="bg-green-600 text-white px-3 rounded-md hover:bg-green-700"
            >
              Verificar
            </button>
          </div>
          {isTokenVerified && (
            <p className="text-green-600 text-sm mt-1">¡Token verificado!</p>
          )}
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Número de teléfono</label>
          <input
            type="text"
            id="phoneNumber"
            name="phoneNumber"
            className="w-full p-2 border border-gray-300 rounded-md text-black"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Tu número de teléfono"
            required
          />
        </div>

        {/* Role */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Rol</label>
          <div className="flex gap-4">
            {["Usuario", "Veterinario"].map((r) => (
              <label key={r} className="flex items-center gap-2" id={r === "Usuario" ? "label-usuario" : "label-veterinario"}>
                <input
                  type="radio"
                  value={r === "Usuario" ? "User" : "Vet"}
                  checked={role === (r === "Usuario" ? "User" : "Vet")}
                  onChange={(e) => setRole(e.target.value)}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        {role === 'Vet' && (
          <div className="mb-4" id="vet-services">
            <label className="block text-sm font-medium mb-2">Servicios ofrecidos</label>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { key: 'consultas', label: 'Consultas en clínica' },
                { key: 'video-consultas', label: 'Video consultas' },
                { key: 'a-domicilio', label: 'Atención a domicilio' }
              ].map(s => (
                <label key={s.key} className="inline-flex items-center gap-2" id={`svc-${s.key}`}>
                  <input
                    type="checkbox"
                    value={s.key}
                    checked={services.includes(s.key)}
                    onChange={() => toggleService(s.key)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Password */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            className="w-full p-2 border border-gray-300 rounded-md text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            className="w-full p-2 border border-gray-300 rounded-md text-black"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded-full hover:bg-blue-500 disabled:opacity-50"
          disabled={loading || !isTokenVerified}
        >
          {loading ? "Registrando..." : "Registrarse"}
        </button>

        <div className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta? <a href="/login" className="text-blue-600">Iniciar sesión</a>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;
