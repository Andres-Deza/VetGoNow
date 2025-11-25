import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <div id="footer" className="mt-auto w-full bg-gray-200 pt-8 px-10"> {/* Added side paddings here */}
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 text-sm">

        {/* Left Section */}
        <div>
          <Logo
            onDarkBackground={false}
            className="mb-5 h-12 w-auto"
            alt="VetGoNow Logo"
          />
          <p className="w-full md:w-2/3 text-gray-700 leading-6">
            VetGoNow está aquí para ayudarte a conectarte con veterinarios de confianza para las necesidades de tu mascota y ganado.
            Reserva citas y obtén atención profesional a través de nuestra plataforma.
          </p>
        </div>

        {/* Company Section */}
        <div>
          <p className="text-xl font-medium mb-5 text-gray-700">EMPRESA</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li
              className="cursor-pointer hover:text-blue-500"
              onClick={() => navigate("/")}
            >
              Inicio
            </li>
            <li
              className="cursor-pointer hover:text-blue-500"
              onClick={() => navigate("/about")}
            >
              Acerca de Nosotros
            </li>
            <li
              className="cursor-pointer hover:text-blue-500"
              onClick={() => navigate("/privacy-policy")}
            >
              Política de Privacidad
            </li>
          </ul>
        </div>

        {/* Get in Touch Section */}
        <div>
          <p className="text-xl font-medium mb-5 text-gray-700">CONTÁCTANOS</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>+9779862971796</li>
            <li>support@vetgonow.com</li> {/* Replace with your support email */}
          </ul>
        </div>

      </div>

      {/* Footer Bottom */}
      <div>
        <hr />
        <p className="py-5 text-sm text-center text-gray-700">
          Copyright 2025 @ VetGoNow - Todos los Derechos Reservados.
        </p>
      </div>
    </div>
  );
};

export default Footer;
