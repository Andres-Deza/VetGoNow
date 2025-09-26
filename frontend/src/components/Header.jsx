import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-[500px] border border-black overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/header-bg.jpg")', zIndex: -1 }}
      />

      {/* Content */}
      <div className="md:w-1/2 flex flex-col justify-center gap-4 py-10 px-6 md:py-[5vw] md:px-12 text-white relative z-10">
        <p className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
          Reserva una Cita <br /> Con Veterinarios de Confianza
        </p>
        <div className="text-sm font-light">
          <p>
            Simplemente navega por nuestra extensa lista de veterinarios de
            confianza,
            <br className="hidden sm:block" />
            programa tu cita sin complicaciones.
          </p>
        </div>

        <button
          onClick={() => navigate('/vets')}
          className="mt-6 flex items-center gap-2 bg-white px-8 py-3 rounded-full text-blue-600 text-sm hover:scale-105 transition-transform duration-300"
        >
          Reservar cita <img className="w-3" src="rightarrow.png" alt="Arrow" />
        </button>
      </div>
    </div>
  );
};

export default Header;
