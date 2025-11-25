import React from 'react';
import { useNavigate } from 'react-router-dom';

const VetGoNow360Page = () => {
  const navigate = useNavigate();

  const plans = [
    {
      id: 'basic',
      name: 'VetGoNow Care Basic',
      price: 79990,
      tag: 'Plan Básico',
      description: 'Tutores que desean mantener controles básicos y atención preventiva de bajo costo.',
      features: [
        { icon: '🩺', text: '1 consulta anual presencial o virtual' },
        { icon: '💻', text: 'Teleconsultas ilimitadas' },
        { icon: '💊', text: '10% descuento en urgencias on-demand' },
        { icon: '📋', text: 'Recordatorio automático de vacunas y antiparasitarios' }
      ],
      buttonColor: 'bg-orange-500 hover:bg-orange-600',
      highlighted: false
    },
    {
      id: 'careplus',
      name: 'VetGoNow Care+',
      price: 119990,
      tag: 'Plan Anual',
      description: 'Hogares con mascotas adultas o mayores que requieren controles más frecuentes y atención en terreno.',
      features: [
        { icon: '🏠', text: '2 visitas domiciliarias sin costo' },
        { icon: '🧪', text: '1 examen de rutina anual (bioquímico o hemograma)' },
        { icon: '💻', text: 'Teleconsultas y teleurgencias ilimitadas' },
        { icon: '💊', text: '20% descuento en urgencias presenciales' },
        { icon: '🩺', text: '15% descuento en especialidades' }
      ],
      buttonColor: 'bg-violet-600 hover:bg-violet-700',
      highlighted: true
    },
    {
      id: 'premium',
      name: 'VetGoNow Premium',
      price: 179990,
      tag: 'Plan Premium',
      description: 'Tutores con múltiples mascotas o necesidades clínicas frecuentes.',
      features: [
        { icon: '🩺', text: 'Consultas presenciales ilimitadas' },
        { icon: '🏥', text: 'Atención prioritaria en clínicas asociadas 24/7' },
        { icon: '💉', text: 'Exámenes de laboratorio, radiografías y ecografías con 25% descuento' },
        { icon: '🧾', text: 'Ficha clínica digital compartida con veterinarios externos' },
        { icon: '🧠', text: 'Teleconsultas sin límite y soporte 24/7' }
      ],
      buttonColor: 'bg-orange-500 hover:bg-orange-600',
      highlighted: false
    }
  ];

  const handleContractPlan = (planId) => {
    console.log('Contratar plan:', planId);
    alert(`Próximamente: Contratación del plan ${planId}`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Título */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8 text-center">
          Planes de Membresía VetGoNow Care
        </h1>

        {/* Grid de planes - 3 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl shadow-lg relative overflow-hidden transition-all hover:shadow-xl ${
                plan.highlighted
                  ? 'bg-violet-50 border-2 border-violet-600'
                  : 'bg-white'
              }`}
            >
              {/* Badge amarillo */}
              <div className="absolute top-4 left-4 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full z-10">
                {plan.tag}
              </div>

              <div className="p-6 md:p-8 pt-16">
                {/* Nombre del plan */}
                <h2
                  className={`text-xl md:text-2xl font-bold mb-4 mt-4 ${
                    plan.highlighted ? 'text-violet-600' : 'text-gray-900'
                  }`}
                >
                  {plan.name}
                </h2>

                {/* Precio */}
                <div className="mb-4">
                  <p className="text-3xl md:text-4xl font-bold text-gray-900">
                    {formatPrice(plan.price)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    anual — hasta en 12 cuotas sin interés
                  </p>
                </div>

                {/* Descripción */}
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  {plan.description}
                </p>

                {/* Características */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-lg flex-shrink-0">{feature.icon}</span>
                      <span className="leading-relaxed">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                {/* Botón contratar */}
                <button
                  onClick={() => handleContractPlan(plan.id)}
                  className={`w-full py-3 px-4 ${plan.buttonColor} text-white rounded-lg font-semibold transition-all active:scale-95 shadow-md`}
                >
                  Contratar plan
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Beneficios transversales */}
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
            Beneficios transversales
          </h2>
          <p className="text-gray-700 mb-4 font-medium">
            Todos los planes incluyen:
          </p>
          <ul className="space-y-3">
            {[
              'Acceso al perfil digital de la mascota y su ficha clínica completa.',
              'Recordatorios automáticos de vacunación y control antiparasitario.',
              'Acceso prioritario a veterinarios disponibles en la red VetGoNow.',
              'Historial de atenciones y descargas de comprobantes clínicos en la aplicación.',
              'Posibilidad de ampliar cobertura con mascotas adicionales (+40% del valor por cada mascota extra).'
            ].map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Condiciones generales */}
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
            Condiciones generales
          </h2>
          <ul className="space-y-2">
            {[
              'Vigencia: 12 meses desde la fecha de contratación.',
              'Renovación automática con notificación previa 30 días antes de vencimiento.',
              'Cobertura nacional sujeta a disponibilidad de veterinarios domiciliarios.',
              'Los descuentos y servicios gratuitos aplican únicamente dentro de la plataforma VetGoNow.',
              'El pago puede realizarse en una cuota anual o 12 cuotas mensuales sin interés vía Mercado Pago.'
            ].map((condition, index) => (
              <li key={index} className="text-gray-700 flex items-start gap-3">
                <span className="text-violet-600 font-semibold mt-1">•</span>
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VetGoNow360Page;
