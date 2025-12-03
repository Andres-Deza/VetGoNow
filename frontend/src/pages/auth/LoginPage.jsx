import React, { useEffect } from "react";
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

const loginOptions = [
  {
    title: "Ingresar como Usuario Tutor",
    description: "Accede a tus mascotas, agendas, teleurgencias y seguimiento en tiempo real.",
    actionLabel: "Entrar como Usuario",
    to: "/login/user",
    icon: "/owner.png",
  },
  {
    title: "Ingresar como Veterinario",
    description: "Gestiona urgencias, citas, disponibilidad y tu panel profesional.",
    actionLabel: "Entrar como Veterinario",
    to: "/login/vet",
    icon: "/veterinarian.png",
  },
];

const LoginPage = () => {
  const navigate = useNavigate();

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
    } catch (error) {
      console.warn("No se pudo parsear el usuario almacenado:", error);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-vet-secondary text-white flex flex-col">
      <header className="px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-vet-secondary-light opacity-90 text-sm md:text-base">Elige tu experiencia</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">¿Cómo deseas ingresar a VetGoNow?</h1>
          <p className="text-vet-secondary-light opacity-80 mt-3 md:mt-4 text-sm md:text-base">
            Separamos los accesos para que tengas un flujo pensado especialmente para ti,
            ya seas cuidador de mascotas o profesional veterinario.
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 pb-12">
        <div className="max-w-4xl mx-auto grid gap-6 md:gap-8 md:grid-cols-2">
          {loginOptions.map((option) => (
            <article
              key={option.to}
              className="bg-white text-gray-900 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl transition-transform duration-200"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-vet-gray-light flex items-center justify-center">
                    <img src={option.icon} alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <h2 className="text-xl font-semibold">{option.title}</h2>
                </div>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                  {option.description}
                </p>
              </div>

              <Link
                to={option.to}
                className="mt-6 inline-flex items-center justify-center px-4 py-3 md:py-3.5 bg-vet-accent text-white font-medium rounded-xl hover:bg-vet-accent-dark transition-colors"
              >
                {option.actionLabel}
              </Link>
            </article>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-10 bg-white/10 rounded-2xl p-6 md:p-8 backdrop-blur">
          <h3 className="text-lg font-semibold">¿Aún no tienes una cuenta?</h3>
          <p className="text-sm md:text-base text-vet-secondary-light opacity-90 mt-2">
            Si eres tutor o tutora de mascotas,{" "}
            <Link to="/register/user" className="underline font-medium">
              crea tu cuenta aquí
            </Link>
            . ¿Eres profesional veterinario?{" "}
            <Link to="/register/vet" className="underline font-medium">
              completa tu registro profesional
            </Link>{" "}
            para validar tu título chileno y comenzar a recibir solicitudes.
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
