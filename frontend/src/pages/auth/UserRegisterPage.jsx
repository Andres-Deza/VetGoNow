import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UserRegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTokenVerified, setIsTokenVerified] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "";
  const navigate = useNavigate();

  const handleSendToken = async () => {
    try {
      await axios.post(`${API_BASE}/api/send-token/toemail`, { email });
      alert("Te enviamos un código de verificación a tu correo electrónico.");
    } catch (err) {
      alert("No pudimos enviar el código. Intenta nuevamente en unos minutos.");
      console.error(err);
    }
  };

  const handleVerifyToken = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/send-token/verify-token`, {
        email,
        token,
      });

      if (res.data?.success) {
        setIsTokenVerified(true);
        alert("¡Código verificado exitosamente!");
      } else {
        setIsTokenVerified(false);
        alert("El código es inválido o expiró, solicita uno nuevo.");
      }
    } catch (err) {
      setIsTokenVerified(false);
      alert("No pudimos validar tu código. Inténtalo nuevamente.");
      console.error(err);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    if (!isTokenVerified) {
      alert("Verifica tu correo antes de finalizar el registro.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post(
        `${API_BASE}/api/users/`,
        {
          name,
          email,
          phoneNumber,
          password,
          role: "User",
          token,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      alert("¡Registro exitoso! Ya puedes iniciar sesión.");
      navigate("/login/user");
    } catch (err) {
      setError(err.response?.data?.message || "No pudimos completar el registro.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vet-gray-light flex justify-center items-center px-3 sm:px-4 py-6 md:py-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 md:p-6 lg:p-8 rounded-2xl shadow-lg w-full max-w-md"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-2">
          Crea tu cuenta VetGoNow
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Regístrate como tutor o tutora para gestionar a tus mascotas, solicitar urgencias y
          agendar consultas.
        </p>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center font-medium">{error}</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary text-black"
              placeholder="Tu nombre completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary text-black"
                placeholder="tu@email.com"
                required
              />
              <button
                type="button"
                onClick={handleSendToken}
                className="bg-vet-secondary text-white px-4 py-2.5 rounded-lg hover:bg-vet-secondary-dark active:bg-vet-primary transition-all"
              >
                Obtener código
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Código de verificación</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary text-black"
                placeholder="Ingresa el código enviado a tu correo"
                required
              />
              <button
                type="button"
                onClick={handleVerifyToken}
                className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 active:bg-green-800 transition-all"
              >
                Verificar
              </button>
            </div>
            {isTokenVerified && (
              <p className="text-green-600 text-xs mt-1">¡Código verificado!</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary text-black"
              placeholder="+56 9 1234 5678"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary text-black"
              placeholder="Elige una contraseña segura"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vet-secondary text-black"
              placeholder="Vuelve a ingresar tu contraseña"
              required
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vet-secondary text-white px-4 py-3 rounded-xl font-medium text-sm md:text-base hover:bg-vet-secondary-dark active:bg-vet-primary disabled:opacity-60 transition-all active:scale-[0.97]"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p className="text-center text-xs text-gray-500">
            Al registrarte aceptas nuestros términos y condiciones y la política de privacidad.
          </p>

          <p className="text-center text-xs md:text-sm text-gray-600">
            ¿Eres profesional veterinario?{" "}
            <button
              type="button"
              onClick={() => navigate("/register/vet")}
              className="text-vet-secondary hover:underline font-medium"
            >
              Completa tu registro profesional
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default UserRegisterPage;
