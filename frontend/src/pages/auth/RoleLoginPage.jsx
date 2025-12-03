import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const isTokenValid = (token) => {
  if (!token) return false;

  try {
    const [, payload] = token.split(".");
    if (!payload) return false;

    const decoded = JSON.parse(atob(payload));
    if (!decoded?.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp > now;
  } catch (error) {
    console.warn("Token inválido:", error);
    return false;
  }
};

const RoleLoginPage = ({
  roleKey,
  heroEyebrow,
  heroTitle,
  heroDescription,
  cardTitle,
  registerLink,
  registerLinkLabel,
  secondaryLink,
  bottomNote,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");

    if (!token || !userString) return;
    if (!isTokenValid(token)) return;

    try {
      const userData = JSON.parse(userString);
      if (!userData?.role) return;

      if (userData.role === "Vet") {
        navigate("/vet/emergencies", { replace: true });
        return;
      }
      if (userData.role === "Admin") {
        navigate("/admin-dashboard", { replace: true });
        return;
      }
      navigate("/user/home", { replace: true });
    } catch (parseError) {
      console.warn("No se pudo parsear el usuario almacenado:", parseError);
    }
  }, [navigate]);

  useEffect(() => {
    const storedMessage = sessionStorage.getItem("authErrorMessage");
    if (storedMessage) {
      setError(storedMessage);
      sessionStorage.removeItem("authErrorMessage");
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: roleKey }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Credenciales inválidas");
        return;
      }

      if (!data?.user || !data?.token) {
        setError(data.message || "No se pudo iniciar sesión.");
        return;
      }

      // Manejo especial para veterinarios no aprobados
      if (roleKey === "vet" && data.approved === false) {
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/waitingpage");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const intended = localStorage.getItem("intendedRoute");
      if (intended) {
        localStorage.removeItem("intendedRoute");
        navigate(intended, { replace: true });
        return;
      }

      const userRole = data.user.role;
      if (userRole === "Vet") {
        navigate("/vet/emergencies");
      } else if (userRole === "Admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/user/home");
      }
    } catch (fetchError) {
      console.error("Error al iniciar sesión:", fetchError);
      setError("Ocurrió un error. Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vet-secondary flex flex-col text-white">
      <header className="bg-vet-secondary px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          {heroEyebrow && <p className="text-vet-secondary-light text-sm md:text-base">{heroEyebrow}</p>}
          <h1 className="text-2xl md:text-3xl font-bold mt-2">{heroTitle}</h1>
          {heroDescription && (
            <p className="text-vet-secondary-light opacity-90 mt-3 text-sm md:text-base leading-relaxed">
              {heroDescription}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-8 md:py-12">
        <img
          src="/Logo.png"
          alt="VetGoNow"
          className="w-16 h-16 md:w-20 md:h-20 mb-6 md:mb-8 drop-shadow-lg"
        />

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white text-gray-900 rounded-2xl shadow-2xl p-4 md:p-6"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-2 md:mb-4 text-gray-900">
            {cardTitle}
          </h2>
          {bottomNote && roleKey === "vet" && (
            <div className="bg-amber-50 text-amber-700 text-xs md:text-sm rounded-lg px-4 py-3 mb-4 border border-amber-200">
              {bottomNote}
            </div>
          )}

          <div className="mb-3 md:mb-4">
            <label htmlFor="email" className="block text-sm md:text-base font-medium mb-1 md:mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-vet-secondary"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="mb-3 md:mb-4">
            <label
              htmlFor="password"
              className="block text-sm md:text-base font-medium mb-1 md:mb-2"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-vet-secondary"
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vet-secondary text-white px-4 md:px-6 py-3 md:py-3.5 rounded-lg font-medium text-sm md:text-base hover:bg-vet-secondary-dark active:bg-vet-primary disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

          {error && (
            <p className="text-center text-red-500 mt-3 text-sm md:text-base font-medium">{error}</p>
          )}

          <div className="mt-4 md:mt-5 text-center text-xs md:text-sm">
            <p className="text-gray-700">
              ¿No tienes cuenta?{" "}
              <Link to={registerLink} className="text-vet-secondary hover:underline font-medium">
                {registerLinkLabel}
              </Link>
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-vet-secondary hover:underline font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {secondaryLink && (
              <div className="mt-3 text-gray-600">
                {secondaryLink.prefix}{" "}
                <Link to={secondaryLink.to} className="text-vet-secondary hover:underline font-medium">
                  {secondaryLink.label}
                </Link>
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

export default RoleLoginPage;

