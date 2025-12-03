import React from "react";
import RoleLoginPage from "./RoleLoginPage.jsx";

const VetLoginPage = () => (
  <RoleLoginPage
    roleKey="vet"
    heroEyebrow="Acceso exclusivo para veterinarios en Chile"
    heroTitle="Bienvenido al panel profesional de VetGoNow"
    heroDescription="Gestiona urgencias, consulta tus citas, actualiza tu disponibilidad y mantén tus datos profesionales al día. Validamos tu identidad con tu título y RUT chileno."
    cardTitle="Ingresa con tu cuenta profesional"
    registerLink="/register/vet"
    registerLinkLabel="Completa tu registro profesional"
    secondaryLink={{
      prefix: "¿Eres tutor o tutora?",
      label: "Inicia sesión aquí",
      to: "/login/user",
    }}
  />
);

export default VetLoginPage;

