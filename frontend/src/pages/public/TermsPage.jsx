import React from 'react';

const sections = [
  {
    title: '1. Identificación del Responsable',
    content: [
      'VetGoNow SpA (en adelante, “VetGoNow”) es una plataforma tecnológica que facilita la coordinación de servicios veterinarios presenciales y virtuales entre tutores de mascotas y profesionales acreditados en Chile.',
      'Razón Social: VetGoNow SpA',
      'RUT: 77.777.777-7 (ejemplo)',
      'Domicilio: Av. Providencia 1234, Oficina 501, Santiago, Región Metropolitana, Chile',
      'Correo de contacto: soporte@vetgonow.cl',
      'Teléfono de contacto: +56 2 1234 5678'
    ]
  },
  {
    title: '2. Aceptación de los Términos y Condiciones',
    content: [
      'Al registrarse, iniciar sesión o utilizar cualquier funcionalidad de VetGoNow, el usuario acepta plenamente estos Términos y Condiciones, así como las políticas complementarias (Política de Privacidad, Consentimientos Informados y Manual de Buenas Prácticas).',
      'Si el usuario no está de acuerdo con alguno de los apartados, deberá abstenerse de utilizar la plataforma.'
    ]
  },
  {
    title: '3. Definiciones',
    content: [
      '“Usuario Tutor”: Persona natural responsable de una mascota que utiliza VetGoNow para solicitar servicios veterinarios.',
      '“Profesional Veterinario”: Médico veterinario o clínica veterinaria registrada en VetGoNow para prestar servicios. Cada profesional es responsable de contar con su título y habilitación vigente ante el Servicio Agrícola y Ganadero (SAG) y el Colegio Médico Veterinario de Chile cuando corresponda.',
      '“Servicios de Urgencia”: Atención veterinaria de carácter inmediato ya sea a domicilio o en clínica, que se coordina a través de VetGoNow.',
      '“Plataforma”: Aplicación web y móvil operada por VetGoNow que permite coordinar servicios entre tutores y profesionales.'
    ]
  },
  {
    title: '4. Uso de la Plataforma',
    content: [
      'La plataforma solo puede ser utilizada por personas mayores de 18 años. Usuarios menores de edad deberán actuar a través de sus representantes legales.',
      'Cada usuario tutor declara que la información entregada sobre su identidad y la de su mascota es fidedigna, completa y actualizada.',
      'VetGoNow se reserva el derecho a suspender o cancelar cuentas en caso de uso indebido, fraude, incumplimiento de estos Términos o cuando existan indicios de riesgo para la comunidad.',
      'Los profesionales que operen en VetGoNow deben mantener sus credenciales vigentes y ser responsables de su práctica clínica conforme a la Ley N.º 20.380 sobre Protección de Animales, el Código Sanitario y demás normativa aplicable.'
    ]
  },
  {
    title: '5. Rol de VetGoNow',
    content: [
      'VetGoNow actúa como intermediario tecnológico. No presta directamente servicios veterinarios ni asume responsabilidad profesional por los diagnósticos, tratamientos o procedimientos realizados.',
      'La relación clínica se establece entre el usuario tutor y el profesional veterinario. El profesional es quien define el diagnóstico, tratamiento y cobros finales de acuerdo con la normativa vigente.',
      'VetGoNow supervisa que los profesionales cumplan con estándares mínimos de calidad y documentación, pero no garantiza la disponibilidad inmediata de atención ni los resultados clínicos.',
      'En caso de urgencias vitales, se recomienda contactar inmediatamente a un servicio veterinario de emergencia presencial o a la autoridad competente.'
    ]
  },
  {
    title: '6. Proceso de Solicitud y Pago',
    content: [
      'Los valores indicados en la plataforma corresponden a estimaciones referenciales según la información disponible (distancia, horario, complejidad declarada). El profesional puede ajustar el presupuesto final previo consentimiento del tutor.',
      'VetGoNow podrá solicitar preautorizaciones o pagos anticipados para asegurar la disponibilidad del profesional. Las transacciones se procesan mediante proveedores de pago autorizados en Chile y cumplen con la Ley N.º 19.628 sobre Protección de la Vida Privada y estándares PCI-DSS.',
      'Las boletas o facturas serán emitidas por el profesional o clínica que presta el servicio, de acuerdo con la normativa tributaria chilena.',
      'Los reembolsos o devoluciones se tratan caso a caso y se rigen por la Ley del Consumidor (Ley N.º 19.496). En caso de desacuerdo, el tutor puede recurrir al Servicio Nacional del Consumidor (SERNAC).'
    ]
  },
  {
    title: '7. Obligaciones del Usuario Tutor',
    content: [
      'Proporcionar información veraz y completa sobre la mascota, su historial médico y la urgencia que motiva la consulta.',
      'Mantenerse disponible en el lugar acordado para la atención a domicilio o presentarse en la clínica en el horario pactado.',
      'Respetar las indicaciones del profesional y proporcionar condiciones mínimas de seguridad e higiene para la atención.',
      'Informar a VetGoNow y al profesional cualquier cambio relevante (cancelaciones, reprogramaciones, agravamiento del cuadro) con la mayor anticipación posible.'
    ]
  },
  {
    title: '8. Obligaciones del Profesional Veterinario',
    content: [
      'Mantener su habilitación profesional, registro vigente y cumplimiento de las normas del Código de Ética del Colegio Médico Veterinario de Chile.',
      'Registrar en la plataforma la información clínica relevante de cada atención, resguardando la confidencialidad de acuerdo con la Ley N.º 20.584 sobre Derechos y Deberes de los Pacientes, en la medida que resulte aplicable a medicina veterinaria.',
      'Entregar diagnósticos y planes terapéuticos basados en la mejor evidencia disponible, priorizando el bienestar animal (Ley N.º 20.380).',
      'Emitir boletas o documentos tributarios conforme al Servicio de Impuestos Internos y mantener seguros de responsabilidad civil si la normativa lo exige.'
    ]
  },
  {
    title: '9. Cancelaciones y Reprogramaciones',
    content: [
      'El usuario tutor puede cancelar sin costo hasta antes de que el profesional haya iniciado el desplazamiento. Si la cancelación se produce con el profesional en ruta o ya en el domicilio/clínica, podrá aplicarse un cargo por desplazamiento.',
      'Las reprogramaciones están sujetas a disponibilidad del profesional y pueden implicar ajustes de precio.',
      'En caso de que el profesional no llegue en el horario acordado, VetGoNow gestionará un reemplazo o la devolución de los montos prepagados.'
    ]
  },
  {
    title: '10. Protección de Datos Personales',
    content: [
      'VetGoNow trata los datos personales conforme a la Ley N.º 19.628 sobre Protección de la Vida Privada y a los principios de licitud, finalidad, proporcionalidad y seguridad.',
      'Los datos del usuario y su mascota se emplean únicamente para la prestación del servicio, seguimiento clínico, facturación y comunicaciones pertinentes.',
      'El usuario puede ejercer sus derechos de acceso, rectificación, cancelación y oposición (ARCO) enviando una solicitud a datos@vetgonow.cl.',
      'La plataforma utiliza medidas técnicas y organizativas para resguardar la información (cifrado, controles de acceso, monitoreo). No obstante, se advierte que ninguna transmisión digital es completamente segura.'
    ]
  },
  {
    title: '11. Consentimientos Informados y Responsabilidad',
    content: [
      'Antes de procedimientos invasivos o de alto riesgo, el profesional deberá obtener el consentimiento informado del tutor, registrando la explicación de riesgos, beneficios y alternativas terapéuticas.',
      'VetGoNow no asume responsabilidad por daños directos o indirectos derivados de la práctica profesional, negligencias o errores clínicos. El tutor podrá ejercer acciones legales contra el profesional conforme a las normas civiles y penales vigentes.',
      'En situaciones de maltrato animal o sospecha de delito, VetGoNow y los profesionales están facultados para denunciar ante el Ministerio Público, Carabineros o PDI, según la Ley N.º 20.380.'
    ]
  },
  {
    title: '12. Propiedad Intelectual',
    content: [
      'Todos los contenidos de VetGoNow (software, marcas, textos, imágenes) están protegidos por la Ley N.º 17.336 sobre Propiedad Intelectual.',
      'El usuario se compromete a no reproducir, modificar o distribuir dichos contenidos sin autorización escrita de VetGoNow.'
    ]
  },
  {
    title: '13. Resolución de Conflictos',
    content: [
      'Cualquier conflicto entre tutor y profesional será gestionado inicialmente por el equipo de soporte de VetGoNow, quien buscará una solución amistosa.',
      'Si persiste la controversia, las partes podrán recurrir a mediación privada o a los tribunales de justicia competentes en Santiago de Chile.',
      'Para reclamos de consumo, el usuario tutor conserva el derecho de acudir al SERNAC o a los Juzgados de Policía Local, según corresponda.'
    ]
  },
  {
    title: '14. Modificaciones de los Términos',
    content: [
      'VetGoNow puede modificar estos Términos y Condiciones en cualquier momento. Las actualizaciones se publicarán en https://vetgonow.cl/terms con indicación de la fecha de vigencia.',
      'El uso continuado de la plataforma después de la publicación de cambios supone la aceptación de las nuevas condiciones.'
    ]
  },
  {
    title: '15. Contacto y Soporte',
    content: [
      'Para consultas, reclamos o solicitudes, el usuario puede escribir a soporte@vetgonow.cl o utilizar el chat de ayuda disponible en la plataforma.',
      'Horarios de atención: lunes a domingo, 08:00 a 22:00 hrs (excepto feriados irrenunciables).'
    ]
  }
];

const TermsPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Términos y Condiciones de Uso
            </h1>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed">
              Vigentes desde el 10 de noviembre de 2025. Estos Términos constituyen un contrato
              legalmente vinculante regido por la legislación de la República de Chile. Te sugerimos
              leerlos detenidamente antes de utilizar VetGoNow.
            </p>
          </header>

          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  {section.title}
                </h2>
                <div className="space-y-3 text-sm md:text-base text-gray-700 leading-relaxed">
                  {section.content.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-10 border-t border-gray-200 pt-6 text-sm md:text-base text-gray-600 leading-relaxed">
            <p>
              Última actualización: 10 de noviembre de 2025. VetGoNow revisa periódicamente estos
              Términos para asegurar el cumplimiento de la normativa chilena en materia de protección
              animal, consumo y datos personales.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;

