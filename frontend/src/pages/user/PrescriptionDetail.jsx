import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { loadHtml2Pdf } from "../../utils/loadScript";

const PrescriptionDetail = () => {
  const { appointmentId } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [pet, setPet] = useState(null);
  const [user, setUser] = useState(null);
  const [vet, setVet] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
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
  }, [appointmentId]);

  const handleDownload = async () => {
    // Cargar html2pdf solo cuando se necesite
    try {
      await loadHtml2Pdf();
    } catch (error) {
      console.error("Error loading html2pdf:", error);
      alert("Error al cargar la herramienta de descarga. Por favor intenta nuevamente.");
      return;
    }

    // Verificar que html2pdf esté disponible
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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Detalles de la receta</h1>

        {loading && <p>Cargando receta...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && prescription && pet && user && vet && (
          <>
            <button
              onClick={handleDownload}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Descargar como PDF
            </button>

            <div ref={pdfRef} data-pdf-element className="bg-white p-8 rounded-lg shadow-md text-[12px] font-sans w-full max-w-4xl mx-auto space-y-4">
              {/* Encabezado */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Receta oficial de VetGoNow</h2>
                <p className="text-xs text-gray-500">Generado el: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <h3 className="font-semibold text-xs">Vet Information</h3>
                  <p className="text-xs">Name: Dr. {vet.name}</p>
                  <p className="text-xs">Email: {vet.email}</p>
                  <p className="text-xs">Specialization: {vet.specialization || "N/A"}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-xs">User Information</h3>
                  <p className="text-xs">Name: {user.name}</p>
                  <p className="text-xs">Email: {user.email}</p>
                  <p className="text-xs">Phone: {user.phone || "N/A"}</p>
                </div>
              </div>

              {/* Pet & Appointment */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <h3 className="font-semibold text-xs">Pet Information</h3>
                  <p className="text-xs">Name: {pet.name}</p>
                  <p className="text-xs">Breed: {pet.breed}</p>
                  <p className="text-xs">Gender: {pet.gender}</p>
                  <p className="text-xs">Color: {pet.color}</p>
                  <p className="text-xs">Date of Birth: {new Date(pet.dob).toLocaleDateString()}</p>
                </div>

                <div className="flex justify-center items-center">
                  <img src={pet.image} alt={pet.name} className="h-24 w-24 rounded-full object-cover border" />
                </div>
              </div>

              {/* Prescription Section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Prescription Details</h3>

                {/* Appointment Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs"><strong>Appointment Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs"><strong>Scheduled Time:</strong> {appointment.time}</p>
                  </div>
                </div>

{/* Prescription Fields with 5-Line Boxes */}
<div className="grid grid-cols-1 gap-2">
  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Symptoms:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.symptoms || "N/A"}
    </div>
  </div>

  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Medication:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.medication || "N/A"}
    </div>
  </div>

  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Dosage:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.dosage || "N/A"}
    </div>
  </div>

  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Instructions:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.instructions || "N/A"}
    </div>
  </div>
</div>


                {/* Pet Age */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs"><strong>Pet Age:</strong> {pet ? Math.floor((new Date() - new Date(pet.dob)) / (1000 * 60 * 60 * 24 * 365)) : "N/A"} years</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t text-xs text-gray-500 text-center">
                VetGoNow &copy; {new Date().getFullYear()} | This is an electronically generated prescription.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrescriptionDetail;
