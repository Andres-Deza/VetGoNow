import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { loadHtml2Pdf } from "../../utils/loadScript";
import RatingModal from "../../components/RatingModal";

const PrescriptionDetail = () => {
  const { appointmentId } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [pet, setPet] = useState(null);
  const [user, setUser] = useState(null);
  const [vet, setVet] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
    // Obtener el usuario actual del localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }

    const fetchPrescription = async () => {
      try {
        const res = await axios.get(`/api/appointments/${appointmentId}/prescriptionform`);
        const data = res.data.prescription;

        setPrescription(data.prescription);
        setPet(data.petId);
        setUser(data.userId);
        setVet(data.vetId);
        setAppointment({
          date: data.appointmentDate,
          time: data.scheduledTime,
        });
      } catch (err) {
        console.error("Error al obtener la receta:", err);
        setError("No se pudo cargar la receta.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
    
    // Verificar si ya existe una Calificacion
    const checkExistingRating = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_BASE || '';
        const res = await axios.get(
          `${API_BASE}/api/ratings/appointment/${appointmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success && res.data.rating) {
          setExistingRating(res.data.rating);
        }
      } catch (err) {
        // No hay Calificacion aún, está bien
        console.log('No hay Calificacion para esta cita');
      }
    };
    
    checkExistingRating();
  }, [appointmentId]);

  const handleDownload = async () => {
    try {
      await loadHtml2Pdf();
    } catch (error) {
      console.error("Error loading html2pdf:", error);
      alert("Error al cargar la herramienta de descarga. Por favor intenta nuevamente.");
      return;
    }

    if (typeof window.html2pdf === 'undefined') {
      alert("La herramienta de descarga no está disponible. Por favor recarga la página.");
      return;
    }

    // Esperar un momento para asegurar que el DOM esté completamente renderizado
    await new Promise(resolve => setTimeout(resolve, 200));

    const element = pdfRef.current;
    if (!element) {
      alert("Error: No se pudo encontrar el elemento a convertir.");
      return;
    }

    // Guardar estilos originales
    const originalStyles = {
      width: element.style.width,
      height: element.style.height,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
      position: element.style.position,
      margin: element.style.margin
    };

    // Forzar el tamaño exacto del elemento antes de capturar
    element.style.width = '210mm';
    element.style.height = '297mm';
    element.style.maxHeight = '297mm';
    element.style.overflow = 'hidden';
    element.style.position = 'relative';
    element.style.margin = '0';

    // Esperar a que se apliquen los estilos
    await new Promise(resolve => setTimeout(resolve, 200));

    const opt = {
      margin: 0,
      filename: `Receta-${appointmentId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        backgroundColor: '#ffffff',
        removeContainer: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        allowTaint: false
      },
      jsPDF: { 
        unit: "mm", 
        format: [210, 297],
        orientation: "portrait",
        compress: true,
        precision: 16
      },
      pagebreak: { 
        mode: ['avoid-all'],
        avoid: '.bg-white'
      }
    };
    
    try {
      // Cargar html2canvas directamente si está disponible
      if (typeof window.html2canvas === 'undefined') {
        // Si html2canvas no está disponible, cargarlo
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Capturar el elemento como imagen directamente con dimensiones exactas
      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        backgroundColor: '#ffffff',
        width: 794, // 210mm en píxeles a 96 DPI
        height: 1123, // 297mm en píxeles a 96 DPI
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        allowTaint: false,
        onclone: (clonedDoc) => {
          // Asegurar que el elemento clonado tenga exactamente el tamaño correcto
          const clonedElement = clonedDoc.querySelector('[data-pdf-element]') || clonedDoc.body.firstElementChild;
          if (clonedElement) {
            clonedElement.style.width = '794px';
            clonedElement.style.height = '1123px';
            clonedElement.style.maxHeight = '1123px';
            clonedElement.style.overflow = 'hidden';
            clonedElement.style.margin = '0';
            clonedElement.style.padding = '45.35px 56.69px'; // 12mm 15mm en píxeles
            clonedElement.style.boxSizing = 'border-box';
          }
        }
      });

      // Asegurar que el canvas tenga exactamente el tamaño correcto
      const targetWidth = 794;
      const targetHeight = 1123;
      
      // Si el canvas es más grande, recortarlo
      let finalCanvas = canvas;
      if (canvas.width > targetWidth || canvas.height > targetHeight) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
        finalCanvas = tempCanvas;
      }

      // Convertir canvas a imagen
      const imgData = finalCanvas.toDataURL('image/jpeg', 0.98);
      
      // Crear un nuevo PDF con jsPDF de exactamente una página
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        unit: "mm",
        format: [210, 297],
        orientation: "portrait",
        compress: true
      });

      // Agregar la imagen al PDF ocupando exactamente una página completa
      // Usar las dimensiones exactas de A4
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      
      // Asegurar que solo haya una página
      const totalPages = doc.internal.getNumberOfPages();
      if (totalPages > 1) {
        // Si por alguna razón se creó más de una página, eliminar las adicionales
        for (let i = totalPages; i > 1; i--) {
          doc.deletePage(i);
        }
      }
      
      // Guardar el PDF
      doc.save(`Receta-${appointmentId}.pdf`);
      
    } catch (error) {
      console.error("Error al generar PDF:", error);
      // Fallback: método simple de html2pdf
      try {
        await window.html2pdf().set(opt).from(element).save();
      } catch (fallbackError) {
        console.error("Error en fallback:", fallbackError);
        alert("Error al generar el PDF. Por favor intenta nuevamente.");
      }
    } finally {
      // Restaurar estilos originales
      element.style.width = originalStyles.width;
      element.style.height = originalStyles.height;
      element.style.maxHeight = originalStyles.maxHeight;
      element.style.overflow = originalStyles.overflow;
      element.style.position = originalStyles.position;
      element.style.margin = originalStyles.margin;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Receta Médica</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar PDF
            </button>
            {/* Botón de Calificar Atención - Solo visible para tutores (User), no para veterinarios */}
            {currentUser && currentUser.role !== 'Vet' && (
              <button
                onClick={() => setShowRatingModal(true)}
                className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                {existingRating ? 'Editar Calificacion' : 'Calificar Atención'}
              </button>
            )}
          </div>
    </div>

        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando receta...</p>
            </div>
    </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!loading && prescription && pet && user && vet && (
          <div ref={pdfRef} data-pdf-element className="bg-white" style={{ width: '210mm', maxHeight: '297mm', height: '297mm', padding: '12mm 15mm', fontFamily: 'Arial, sans-serif', fontSize: '10pt', lineHeight: '1.4', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', margin: '0 auto', position: 'relative' }}>
            {/* Encabezado con logo y título */}
            <div className="text-center mb-4 pb-3 border-b-2 border-gray-800">
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ letterSpacing: '0.5px' }}>VetGoNow</h1>
                <div className="w-16 h-0.5 bg-violet-600 mx-auto mt-1"></div>
              </div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mt-2">Receta Médica Veterinaria</p>
              <p className="text-xs text-gray-500 mt-1">Fecha de emisión: {new Date().toLocaleDateString('es-CL', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
                </div>

            {/* Información del Veterinario y Propietario - Diseño mejorado */}
            <div className="grid grid-cols-2 gap-5 mb-4 pb-3 border-b border-gray-200">
              <div className="pr-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-2" style={{ letterSpacing: '1px' }}>Veterinario Responsable</h3>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900">Dr. {vet.name}</p>
                  <p className="text-xs text-gray-600">{vet.email}</p>
                  {vet.specialization && (
                    <p className="text-xs text-gray-600 font-medium">Especialidad: {vet.specialization}</p>
                  )}
                </div>
    </div>

              <div className="pl-3 border-l border-gray-200">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-2" style={{ letterSpacing: '1px' }}>Propietario</h3>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-600">{user.email}</p>
                  {user.phone && (
                    <p className="text-xs text-gray-600">Teléfono: {user.phone}</p>
                  )}
                </div>
    </div>
                </div>

            {/* Información del Paciente - Compacta */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-2" style={{ letterSpacing: '1px' }}>Datos del Paciente</h3>
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Nombre</p>
                  <p className="font-bold text-gray-900 text-sm">{pet.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Raza</p>
                  <p className="font-bold text-gray-900 text-sm">{pet.breed || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Género</p>
                  <p className="font-bold text-gray-900 text-sm">{pet.gender || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Fecha de Nacimiento</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {pet.dob ? new Date(pet.dob).toLocaleDateString('es-CL') : "N/A"}
                  </p>
                </div>
    </div>
              </div>

            {/* Información de la Cita - Compacta */}
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Fecha de la Consulta</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {new Date(appointment.date).toLocaleDateString('es-CL', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Hora</p>
                  <p className="font-bold text-gray-900 text-sm">{appointment.time}</p>
                </div>
    </div>
              </div>

            {/* Prescripción Médica - Diseño mejorado */}
            <div className="mb-4 flex-1" style={{ flexShrink: 0 }}>
              <h3 className="font-bold text-base uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b-2 border-gray-800" style={{ letterSpacing: '1px' }}>
                Prescripción Médica
              </h3>

              <div className="space-y-3">
                {/* Síntomas */}
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 mb-1.5">Síntomas Observados:</h4>
                  <div className="bg-gray-50 border-l-4 border-gray-400 rounded-r p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ minHeight: '40px' }}>
                    {prescription.symptoms || "No se registraron síntomas específicos."}
                    </div>
    </div>

                {/* Medicamento */}
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 mb-1.5">Medicamento Prescrito:</h4>
                  <div className="bg-gray-50 border-l-4 border-gray-400 rounded-r p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ minHeight: '40px' }}>
                    {prescription.medication || "No se prescribió medicamento."}
                    </div>
    </div>

                {/* Dosis */}
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 mb-1.5">Dosificación:</h4>
                  <div className="bg-gray-50 border-l-4 border-gray-400 rounded-r p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ minHeight: '40px' }}>
                    {prescription.dosage || "No se especificó dosificación."}
                    </div>
    </div>

                {/* Instrucciones */}
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 mb-1.5">Instrucciones de Cuidado:</h4>
                  <div className="bg-gray-50 border-l-4 border-gray-400 rounded-r p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ minHeight: '40px' }}>
                    {prescription.instructions || "No se proporcionaron instrucciones adicionales."}
                    </div>
    </div>
                </div>
    </div>

            {/* Firma Digital - Diseño profesional */}
            <div className="pt-4 border-t-2 border-gray-300 mt-auto" style={{ flexShrink: 0 }}>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">Firma Digital del Veterinario</p>
                      <div className="border-t-2 border-gray-800 pt-2">
                        <p className="text-sm font-bold text-gray-900">Dr. {vet.name}</p>
                        {vet.specialization && (
                          <p className="text-xs text-gray-600 mt-0.5">{vet.specialization}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 italic mt-2">Documento emitido electrónicamente mediante VetGoNow</p>
                    </div>
    </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-gray-500 mb-1">ID de Cita</p>
                    <p className="text-xs font-mono text-gray-700">{appointmentId}</p>
                  </div>
    </div>
            </div>
            </div>
              
              {/* Footer minimalista */}
              <div className="text-center text-xs text-gray-500 pt-3 border-t border-gray-200">
                <p className="font-semibold text-gray-700 mb-1">VetGoNow</p>
                <p className="mb-0.5">Receta médica generada electrónicamente</p>
                <p className="text-gray-400 text-xs">© {new Date().getFullYear()} VetGoNow. Todos los derechos reservados. Este documento tiene validez legal.</p>
              </div>
          </div>
        )}

      {/* Modal de Calificacion */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        appointmentId={appointmentId}
        vetId={vet?._id || vet}
        petId={pet?._id || pet}
        existingRating={existingRating}
        vetName={vet?.name}
        vetRating={vet?.ratings?.average && vet?.ratings?.total >= 5 ? vet.ratings.average : null}
        appointmentDate={appointment?.date}
        scheduledTime={appointment?.scheduledTime}
        onSuccess={(rating) => {
          setExistingRating(rating);
          setShowRatingModal(false);
        }}
      />
      </div>
    </div>
  );
};

export default PrescriptionDetail;


