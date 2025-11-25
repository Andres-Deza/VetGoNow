import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaCheckCircle, FaNotesMedical, FaPills, FaFlask, FaClipboardList, FaSyringe, FaSpider, FaWeight } from "react-icons/fa";

const OngoingAppointment = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  const [appointment, setAppointment] = useState(null);
  const [prescription, setPrescription] = useState({
    symptoms: "",
    medication: "",
    dosage: "",
    instructions: "",
    vaccinesApplied: [],
    dewormingsApplied: [],
    weightAtConsultation: null,
  });

  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [showDewormingForm, setShowDewormingForm] = useState(false);
  const [newVaccine, setNewVaccine] = useState({ 
    name: '', // Solo se usa si type === 'Otra'
    type: '', 
    batchNumber: '', 
    manufacturer: '', 
    nextDoseDate: '' 
  });
  const [newDeworming, setNewDeworming] = useState({ 
    name: '', // Se genera automáticamente del tipo
    type: '', 
    productName: '', 
    activeIngredient: '', 
    dosage: '' 
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Verificar si es teleconsulta (no mostrar vacunas/desparasitaciones)
  const isOnlineConsultation = appointment?.appointmentType === 'online consultation';

  useEffect(() => {
    const fetchAppointment = async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!storedUser || !token) {
        alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
        navigate("/login");
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/api/appointments/${appointmentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAppointment(res.data.appointment);
      } catch (err) {
        console.error("Error al obtener la cita:", err.response?.data || err.message);
        alert("No se pudieron cargar los detalles de la cita.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [API_BASE, appointmentId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrescription((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    setPrescription((prev) => ({
      ...prev,
      weightAtConsultation: value ? parseFloat(value) : null,
    }));
  };

  const handleFinishAppointment = async () => {
    const { medication, dosage, instructions, symptoms } = prescription;
    const token = localStorage.getItem("token");

    if (!medication || !dosage || !instructions || !symptoms) {
      alert("Por favor completa todos los campos obligatorios de la receta.");
      return;
    }

    if (!token) {
      alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
      navigate("/login");
      return;
    }

    try {
      setSubmitting(true);

      // PRIMERO: Preparar y guardar la receta (si falla, no se finaliza la cita)
      const prescriptionPayload = {
        symptoms,
        medication,
        dosage,
        instructions,
        petId: appointment.petId?._id,
        userId: appointment.userId?._id,
        vetId: appointment.vetId?._id,
        appointmentDate: appointment.appointmentDate,
        scheduledTime: appointment.scheduledTime,
        vaccinesApplied: prescription.vaccinesApplied || [],
        dewormingsApplied: prescription.dewormingsApplied || [],
        weightAtConsultation: prescription.weightAtConsultation || null,
      };

      try {
        await axios.put(
          `${API_BASE}/api/appointments/${appointmentId}/prescription`,
          prescriptionPayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Receta guardada exitosamente');
      } catch (prescriptionError) {
        console.error('Error al guardar la receta:', prescriptionError);
        alert(`Error al guardar la receta: ${prescriptionError.response?.data?.message || prescriptionError.message}. Por favor intenta nuevamente.`);
        setSubmitting(false);
        return; // No continuar si falla la receta
      }

      // SEGUNDO: Marcar la cita como completada (solo si la receta se guardó correctamente)
      try {
        await axios.put(
          `${API_BASE}/api/appointments/${appointmentId}/status`,
          { status: "completed" },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Cita marcada como completada');
      } catch (statusError) {
        console.error('Error al marcar la cita como completada:', statusError);
        alert(`Error al finalizar la cita: ${statusError.response?.data?.message || statusError.message}. La receta fue guardada, pero la cita no se pudo marcar como completada.`);
        setSubmitting(false);
        return; // No continuar si falla el cambio de estado
      }

      // Mostrar mensaje de éxito
      alert("Cita finalizada exitosamente. Los datos se han guardado en el historial clínico.");
      navigate("/vet-dashboard");
    } catch (err) {
      console.error("Error finishing appointment:", err.response?.data || err.message);
      alert("Error inesperado al finalizar la cita. Por favor intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FaArrowLeft className="text-sm" />
            <span className="text-sm font-medium">Volver</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finalizar Atención</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Completa la receta y las indicaciones para el paciente</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Cargando detalles de la cita...</p>
            </div>
          </div>
        ) : appointment ? (
          <div className="space-y-4 md:space-y-6">
            {/* Información del Paciente */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={appointment.petId?.image || "/default-pet.jpg"}
                    alt={appointment.petId?.name || "Mascota"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-violet-100 text-violet-600 text-xl font-bold">${String(appointment.petId?.name || 'M').charAt(0).toUpperCase()}</div>`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-1 truncate">
                    {appointment.petId?.name || "Mascota"}
                  </h2>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(appointment.appointmentDate).toLocaleDateString('es-CL', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {appointment.scheduledTime || "Hora no especificada"}
                    </span>
                    {appointment.appointmentType && (
                      <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium">
                        {appointment.appointmentType === 'online consultation' ? 'Teleconsulta' : 
                         appointment.appointmentType === 'home visit' ? 'A Domicilio' : 
                         appointment.appointmentType === 'clinic visit' ? 'En Clínica' : 
                         appointment.appointmentType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario de Receta */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-5 md:space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <FaNotesMedical className="text-violet-600 text-lg" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Receta Médica</h2>
              </div>

              {/* Peso en la consulta (solo para presenciales) */}
              {!isOnlineConsultation && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FaWeight className="text-blue-600" />
                    Peso en la consulta (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={prescription.weightAtConsultation || ''}
                    onChange={handleWeightChange}
                    className="w-full md:w-48 border border-gray-200 rounded-xl p-3 text-sm md:text-base text-gray-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    placeholder="Ej: 5.5"
                  />
                  <p className="text-xs text-gray-500 mt-2">Este dato se guardará en el historial clínico de la mascota.</p>
                </div>
              )}

              {/* Síntomas */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FaClipboardList className="text-violet-600" />
                  Síntomas Observados <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="symptoms"
                  value={prescription.symptoms}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl p-4 resize-none text-sm md:text-base text-gray-700 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all outline-none"
                  placeholder="Describe los síntomas observados durante la consulta..."
                />
              </div>

              {/* Medicamento */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FaPills className="text-violet-600" />
                  Medicamento Prescrito <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="medication"
                  value={prescription.medication}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl p-4 resize-none text-sm md:text-base text-gray-700 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all outline-none"
                  placeholder="Indica el medicamento prescrito..."
                />
              </div>

              {/* Dosis */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FaFlask className="text-violet-600" />
                  Dosificación <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="dosage"
                  value={prescription.dosage}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl p-4 resize-none text-sm md:text-base text-gray-700 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all outline-none"
                  placeholder="Especifica la dosis y frecuencia..."
                />
              </div>

              {/* Instrucciones */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FaCheckCircle className="text-violet-600" />
                  Instrucciones Adicionales <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="instructions"
                  value={prescription.instructions}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl p-4 resize-none text-sm md:text-base text-gray-700 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all outline-none"
                  placeholder="Proporciona instrucciones adicionales para el tutor..."
                />
              </div>

              {/* Vacunas Aplicadas - Solo para consultas presenciales */}
              {!isOnlineConsultation && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FaSyringe className="text-blue-600" />
                      Vacunas Aplicadas <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVaccineForm(!showVaccineForm)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {showVaccineForm ? 'Cancelar' : '+ Agregar Vacuna'}
                    </button>
                  </div>

                  {/* Lista de vacunas agregadas */}
                  {prescription.vaccinesApplied && prescription.vaccinesApplied.length > 0 && (
                    <div className="space-y-2">
                      {prescription.vaccinesApplied.map((vaccine, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{vaccine.name || vaccine.type}</p>
                            {vaccine.type && vaccine.type !== vaccine.name && (
                              <p className="text-xs text-gray-600">Tipo: {vaccine.type}</p>
                            )}
                            {vaccine.batchNumber && (
                              <p className="text-xs text-gray-500">Lote: {vaccine.batchNumber}</p>
                            )}
                            {vaccine.nextDoseDate && (
                              <p className="text-xs text-gray-500">Próxima dosis: {new Date(vaccine.nextDoseDate).toLocaleDateString('es-CL')}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = prescription.vaccinesApplied.filter((_, i) => i !== idx);
                              setPrescription({ ...prescription, vaccinesApplied: updated });
                            }}
                            className="ml-2 text-red-600 hover:text-red-700 text-lg font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulario para agregar vacuna */}
                  {showVaccineForm && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de vacuna <span className="text-red-500">*</span></label>
                        <select
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={newVaccine.type}
                          onChange={(e) => setNewVaccine({ ...newVaccine, type: e.target.value, name: e.target.value === 'Otra' ? newVaccine.name : e.target.value })}
                        >
                          <option value="">Seleccione...</option>
                          <option value="Rabia">Rabia</option>
                          <option value="Polivalente">Polivalente</option>
                          <option value="Tos de las perreras">Tos de las perreras</option>
                          <option value="Leucemia felina">Leucemia felina</option>
                          <option value="Triple felina">Triple felina</option>
                          <option value="Otra">Otra</option>
                        </select>
                      </div>
                      {newVaccine.type === 'Otra' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de la vacuna <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={newVaccine.name}
                            onChange={(e) => setNewVaccine({ ...newVaccine, name: e.target.value })}
                            placeholder="Especifica el nombre de la vacuna"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Lote</label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={newVaccine.batchNumber}
                            onChange={(e) => setNewVaccine({ ...newVaccine, batchNumber: e.target.value })}
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Laboratorio</label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={newVaccine.manufacturer}
                            onChange={(e) => setNewVaccine({ ...newVaccine, manufacturer: e.target.value })}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Próxima dosis (opcional)</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={newVaccine.nextDoseDate}
                          onChange={(e) => setNewVaccine({ ...newVaccine, nextDoseDate: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Si es "Otra", requiere nombre; si no, el tipo ya tiene el nombre
                          const vaccineToAdd = {
                            ...newVaccine,
                            name: newVaccine.type === 'Otra' ? newVaccine.name : newVaccine.type
                          };
                          
                          if (newVaccine.type && (newVaccine.type !== 'Otra' || newVaccine.name)) {
                            setPrescription({
                              ...prescription,
                              vaccinesApplied: [...(prescription.vaccinesApplied || []), vaccineToAdd]
                            });
                            setNewVaccine({ name: '', type: '', batchNumber: '', manufacturer: '', nextDoseDate: '' });
                            setShowVaccineForm(false);
                          } else {
                            alert(newVaccine.type === 'Otra' 
                              ? "Por favor especifica el nombre de la vacuna." 
                              : "Por favor selecciona el tipo de vacuna.");
                          }
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                      >
                        Agregar Vacuna
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Desparasitaciones Aplicadas - Solo para consultas presenciales */}
              {!isOnlineConsultation && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FaSpider className="text-green-600" />
                      Desparasitaciones Aplicadas <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDewormingForm(!showDewormingForm)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {showDewormingForm ? 'Cancelar' : '+ Agregar Desparasitación'}
                    </button>
                  </div>

                  {/* Lista de desparasitaciones agregadas */}
                  {prescription.dewormingsApplied && prescription.dewormingsApplied.length > 0 && (
                    <div className="space-y-2">
                      {prescription.dewormingsApplied.map((deworming, idx) => (
                        <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{deworming.name || deworming.type}</p>
                            {deworming.productName && (
                              <p className="text-xs text-gray-600">Producto: {deworming.productName}</p>
                            )}
                            {!deworming.productName && deworming.type && (
                              <p className="text-xs text-gray-600">Tipo: {deworming.type}</p>
                            )}
                            {deworming.productName && (
                              <p className="text-xs text-gray-500">Producto: {deworming.productName}</p>
                            )}
                            {deworming.dosage && (
                              <p className="text-xs text-gray-500">Dosificación: {deworming.dosage}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = prescription.dewormingsApplied.filter((_, i) => i !== idx);
                              setPrescription({ ...prescription, dewormingsApplied: updated });
                            }}
                            className="ml-2 text-red-600 hover:text-red-700 text-lg font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulario para agregar desparasitación */}
                  {showDewormingForm && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de desparasitación <span className="text-red-500">*</span></label>
                        <select
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                          value={newDeworming.type}
                          onChange={(e) => {
                            const typeValue = e.target.value;
                            // Generar nombre automáticamente según el tipo
                            const nameMap = {
                              'Interna': 'Desparasitante interno',
                              'Externa': 'Desparasitante externo',
                              'Combinada': 'Desparasitante combinado'
                            };
                            setNewDeworming({ 
                              ...newDeworming, 
                              type: typeValue,
                              name: nameMap[typeValue] || typeValue
                            });
                          }}
                        >
                          <option value="">Seleccione...</option>
                          <option value="Interna">Interna</option>
                          <option value="Externa">Externa</option>
                          <option value="Combinada">Combinada</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Producto</label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            value={newDeworming.productName}
                            onChange={(e) => setNewDeworming({ ...newDeworming, productName: e.target.value })}
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Dosificación</label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            value={newDeworming.dosage}
                            onChange={(e) => setNewDeworming({ ...newDeworming, dosage: e.target.value })}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Principio Activo</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                          value={newDeworming.activeIngredient}
                          onChange={(e) => setNewDeworming({ ...newDeworming, activeIngredient: e.target.value })}
                          placeholder="Opcional"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (newDeworming.type) {
                            // Asegurar que el nombre se establezca correctamente
                            const dewormingToAdd = {
                              ...newDeworming,
                              name: newDeworming.name || (newDeworming.type === 'Interna' ? 'Desparasitante interno' :
                                                          newDeworming.type === 'Externa' ? 'Desparasitante externo' :
                                                          'Desparasitante combinado')
                            };
                            setPrescription({
                              ...prescription,
                              dewormingsApplied: [...(prescription.dewormingsApplied || []), dewormingToAdd]
                            });
                            setNewDeworming({ name: '', type: '', productName: '', activeIngredient: '', dosage: '' });
                            setShowDewormingForm(false);
                          } else {
                            alert("Por favor selecciona el tipo de desparasitación.");
                          }
                        }}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors"
                      >
                        Agregar Desparasitación
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botón Finalizar */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 -mx-4 md:-mx-0 md:rounded-2xl md:shadow-sm md:border md:border-gray-100">
              <button
                onClick={handleFinishAppointment}
                disabled={submitting}
                className={`w-full md:w-auto md:min-w-[200px] bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 md:py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                  submitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Finalizar Atención</span>
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Los datos se guardarán automáticamente en el historial clínico de la mascota.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-red-500 font-medium">Cita no encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OngoingAppointment;
