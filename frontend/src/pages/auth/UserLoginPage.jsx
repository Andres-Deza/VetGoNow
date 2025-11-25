import React from "react";
import RoleLoginPage from "./RoleLoginPage.jsx";

const UserLoginPage = () => (
  <RoleLoginPage
    roleKey="user"
    heroEyebrow="Acceso para tutores y tutoras"
    heroTitle="Inicia sesión en tu cuenta VetGoNow"
    heroDescription="Gestiona a tus mascotas, solicita urgencias a domicilio, agenda consultas y revisa toda la información de sus cuidados desde un solo lugar."
    cardTitle="Ingresa con tu cuenta de usuario"
    registerLink="/register/user"
    registerLinkLabel="Crea tu cuenta de usuario"
    secondaryLink={{
      prefix: "¿Eres profesional veterinario?",
      label: "Ingresa aquí",
      to: "/login/vet",
    }}
  />
);

export default UserLoginPage;

