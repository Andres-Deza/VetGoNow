import React from "react";
import { Link } from "react-router-dom";

const registerOptions = [
  {
    title: "Quiero registrarme como Usuario Tutor",
    description:
      "Administra a tus mascotas, agenda consultas, solicita urgencias a domicilio y lleva el control de su salud en un solo lugar.",
    actionLabel: "Crear cuenta de usuario",
    to: "/register/user",
    icon: "/owner.png",
    accent: "Usuarios",
  },
  {
    title: "Soy profesional veterinario",
    description:
      "Completa tu registro profesional, valida tu título chileno y ofrece tus servicios de urgencia, clínica y telemedicina en VetGoNow.",
    actionLabel: "Registrarme como veterinario",
    to: "/register/vet",
    icon: "/veterinarian.png",
    accent: "Profesionales",
  },
];

const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-vet-secondary text-white flex flex-col">
      <header className="px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-vet-secondary-light text-sm md:text-base">Selecciona el tipo de cuenta</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">
            ¿Cómo quieres comenzar en VetGoNow?
          </h1>
          <p className="text-vet-secondary-light opacity-90 mt-3 md:mt-4 text-sm md:text-base">
            Crea una cuenta pensada para tus necesidades: como tutor o tutora de mascotas, o como
            profesional veterinario verificado en Chile.
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 pb-12">
        <div className="max-w-4xl mx-auto grid gap-6 md:gap-8 md:grid-cols-2">
          {registerOptions.map((option) => (
            <article
              key={option.to}
              className="bg-white text-gray-900 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl transition-transform duration-200"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-vet-gray-light flex items-center justify-center">
                    <img src={option.icon} alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-vet-secondary">
                      {option.accent}
                    </p>
                    <h2 className="text-xl font-semibold">{option.title}</h2>
                  </div>
                </div>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                  {option.description}
                </p>
              </div>

              <Link
                to={option.to}
                className="mt-6 inline-flex items-center justify-center px-4 py-3 md:py-3.5 bg-vet-secondary text-white font-medium rounded-xl hover:bg-vet-secondary-dark transition-colors"
              >
                {option.actionLabel}
              </Link>
            </article>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-10 bg-white/10 rounded-2xl p-6 md:p-8 backdrop-blur">
          <h3 className="text-lg font-semibold">¿Ya tienes una cuenta?</h3>
          <p className="text-sm md:text-base text-vet-secondary-light opacity-90 mt-2">
            Si eres tutor o tutora, puedes{" "}
            <Link to="/login/user" className="underline font-medium">
              iniciar sesión aquí
            </Link>
            . ¿Eres veterinario y necesitas acceder a tu panel profesional?{" "}
            <Link to="/login/vet" className="underline font-medium">
              Entra por este enlace
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
