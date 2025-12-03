import React from 'react';
import { useNavigate } from 'react-router-dom';

const VetRegisterTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vet-gray-light flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Registro Profesional VetGoNow
          </h1>
          <p className="text-gray-600 text-lg">
            Selecciona el tipo de cuenta que deseas crear
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Veterinario Independiente */}
          <div
            onClick={() => navigate('/register/vet/independent')}
            className="border-2 border-vet-secondary rounded-xl p-6 md:p-8 hover:border-vet-secondary-dark hover:shadow-lg transition-all cursor-pointer bg-white"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-vet-gray-light rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-vet-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Veterinario Independiente
              </h2>
              <p className="text-gray-600 mb-4">
                Para profesionales que atienden a domicilio o por telemedicina
              </p>
              <ul className="text-left text-sm text-gray-700 space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-vet-secondary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Atención a domicilio</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-vet-secondary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Telemedicina</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-vet-secondary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Urgencias a domicilio</span>
                </li>
              </ul>
              <button className="w-full bg-vet-secondary text-white py-3 px-6 rounded-lg font-semibold hover:bg-vet-secondary-dark transition-all">
                Registrarse como Independiente
              </button>
            </div>
          </div>

          {/* Clínica Veterinaria */}
          <div
            onClick={() => navigate('/register/vet/clinic')}
            className="border-2 border-vet-secondary rounded-xl p-6 md:p-8 hover:border-vet-secondary-dark hover:shadow-lg transition-all cursor-pointer bg-white"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-vet-gray-light rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-vet-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Clínica Veterinaria
              </h2>
              <p className="text-gray-600 mb-4">
                Para establecimientos con atención presencial y a domicilio, con mayor capacidad operativa.
              </p>
              <ul className="text-left text-sm text-gray-700 space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-vet-secondary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Atención presencial y a domicilio</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-vet-secondary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Urgencias presenciales y a domicilio</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-vet-secondary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Servicios adicionales (telemedicina, procedimientos, etc.)</span>
                </li>
              </ul>
              <button className="w-full bg-vet-secondary text-white py-3 px-6 rounded-lg font-semibold hover:bg-vet-secondary-dark transition-all">
                Registrarse como Clínica
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ¿Ya tienes una cuenta?{' '}
            <a href="/login/vet" className="text-vet-secondary hover:text-vet-secondary-dark font-semibold">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VetRegisterTypeSelection;

