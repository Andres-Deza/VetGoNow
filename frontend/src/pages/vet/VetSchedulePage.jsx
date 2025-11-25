import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import { format } from 'date-fns';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import CancelAppointmentModal from '../../components/vet/CancelAppointmentModal';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';

// Configurar moment en español
moment.locale('es');

// Localizer para react-big-calendar
const localizer = momentLocalizer(moment);

const VetSchedulePage = () => {
  const navigate = useNavigate();
  const vet = JSON.parse(localStorage.getItem('user') || '{}');
  const vetId = vet?.id;
  const token = localStorage.getItem('token');

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
    blockType: 'single', // 'single', 'recurring', 'week'
    recurringDaysOfWeek: [], // [1, 3, 5] = Lunes, Miércoles, Viernes
    endDate: '', // Para bloqueos recurrentes
    isInfinite: false, // Para horarios recurrentes sin fecha de fin
    weekStartDate: '',
    weekEndDate: ''
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentOptionsModal, setShowAppointmentOptionsModal] = useState(false);
  const [appointmentToHandle, setAppointmentToHandle] = useState(null);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [unblockForm, setUnblockForm] = useState({
    method: 'dateRange', // 'dateRange', 'blockType', 'selected'
    startDate: '',
    endDate: '',
    blockType: '',
    selectedSlotIds: []
  });

  // Fetch schedule data
  const fetchSchedule = useCallback(async () => {
    if (!vetId || !token) {
      setError('No se pudo obtener la sesión del veterinario');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 7);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 30);

      const { data } = await axios.get(
        `${API_BASE}/api/appointments/schedule/${vetId}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Transform appointments to calendar events
      const appointmentEvents = (data.appointments || []).map((apt) => {
        const [hours, minutes] = apt.scheduledTime.split(':').map(Number);
        const startDate = new Date(apt.appointmentDate);
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1); // 1 hour default (appointments are 1 hour long)

        return {
          id: apt._id,
          title: `${apt.petId?.name || 'Mascota'} - ${apt.userId?.name || 'Tutor'}`,
          start: startDate,
          end: endDate,
          resource: {
            type: 'appointment',
            appointment: apt,
            status: apt.status,
            appointmentType: apt.appointmentType
          }
        };
      });

      // Transform blocked slots to calendar events
      const blockedEvents = (data.blockedSlots || []).map((block) => {
        const [startHours, startMinutes] = block.startTime.split(':').map(Number);
        const [endHours, endMinutes] = block.endTime.split(':').map(Number);
        const startDate = new Date(block.date);
        startDate.setHours(startHours, startMinutes, 0, 0);
        const endDate = new Date(block.date);
        endDate.setHours(endHours, endMinutes, 0, 0);

        return {
          id: block._id,
          title: `🚫 Bloqueado: ${block.reason || 'Horario no disponible'}`,
          start: startDate,
          end: endDate,
          resource: {
            type: 'blocked',
            blockedSlot: block
          }
        };
      });

      setEvents([...appointmentEvents, ...blockedEvents]);
      setError(null);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('No se pudo cargar la agenda. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [vetId, token, currentDate]);

  React.useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Event style getter
  const eventStyleGetter = (event) => {
    const isBlocked = event.resource?.type === 'blocked';
    const isEmergency = event.resource?.appointment?.isEmergency;
    const status = event.resource?.status;

    let backgroundColor = '#3174ad'; // Default blue
    let borderColor = '#265985';

    if (isBlocked) {
      backgroundColor = '#dc2626'; // Red
      borderColor = '#991b1b';
    } else if (isEmergency) {
      backgroundColor = '#ef4444'; // Red for emergencies
      borderColor = '#dc2626';
    } else if (status === 'completed') {
      backgroundColor = '#10b981'; // Green
      borderColor = '#059669';
    } else if (status === 'scheduled') {
      backgroundColor = '#3b82f6'; // Blue
      borderColor = '#2563eb';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '2px',
        borderRadius: '4px',
        color: 'white',
        padding: '2px 4px',
        fontSize: '12px'
      }
    };
  };

  // Handle slot selection (for blocking)
  const handleSelectSlot = useCallback(({ start, end }) => {
    const now = new Date();
    if (start < now) {
      alert('No puedes bloquear horarios en el pasado');
      return;
    }

    setSelectedSlot({ start, end });
    setBlockForm({
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      reason: '',
      blockType: 'single',
      recurringDaysOfWeek: [],
      endDate: '',
      weekStartDate: format(start, 'yyyy-MM-dd'),
      weekEndDate: format(end, 'yyyy-MM-dd')
    });
    setShowBlockModal(true);
  }, []);

  // Handle event click
  const handleSelectEvent = useCallback((event) => {
    if (event.resource?.type === 'blocked') {
      // Show option to unblock
      if (window.confirm('¿Deseas desbloquear este horario?')) {
        handleUnblock(event.id);
      }
    } else {
      // Show options modal: cancel or open
      const appointment = event.resource?.appointment;
      if (appointment) {
        setAppointmentToHandle(appointment);
        setShowAppointmentOptionsModal(true);
      }
    }
  }, []);

  // Handle ver detalles
  const handleViewDetails = useCallback(() => {
    if (!appointmentToHandle) return;
    
    setShowAppointmentOptionsModal(false);
    const appointment = appointmentToHandle;
    
    if (appointment.isEmergency) {
      navigate(`/vet/emergency/${appointment._id}/navigate`);
    } else if (appointment.appointmentType === 'online consultation') {
      navigate(`/video-call/${appointment._id}`);
    } else {
      navigate(`/prescription-form/${appointment._id}`);
    }
    
    setAppointmentToHandle(null);
  }, [appointmentToHandle, navigate]);

  // Handle cancelar cita
  const handleCancelAppointment = useCallback(() => {
    if (!appointmentToHandle) return;
    
    setShowAppointmentOptionsModal(false);
    const appointment = appointmentToHandle;
    
    setSelectedAppointment({
      ...appointment,
      petName: appointment.petId?.name || 'Mascota',
      userName: appointment.userId?.name || 'Tutor'
    });
    setCancelModalOpen(true);
    
    setAppointmentToHandle(null);
  }, [appointmentToHandle]);

  // Block time slot
  const handleBlock = async () => {
    // Validaciones según el tipo de bloqueo
    if (blockForm.blockType === 'week') {
      if (!blockForm.weekStartDate || !blockForm.weekEndDate) {
        alert('Por favor selecciona el rango de fechas de la semana');
        return;
      }
    } else if (blockForm.blockType === 'recurring') {
      if (!blockForm.date || !blockForm.startTime || !blockForm.endTime) {
        alert('Por favor completa todos los campos para el horario fijo');
        return;
      }
      if (!blockForm.isInfinite && !blockForm.endDate) {
        alert('Por favor selecciona una fecha de fin o marca "Sin fecha de fin"');
        return;
      }
      if (blockForm.recurringDaysOfWeek.length === 0) {
        alert('Por favor selecciona al menos un día de la semana');
        return;
      }
    } else {
      // single
      if (!blockForm.date || !blockForm.startTime || !blockForm.endTime) {
        alert('Por favor completa todos los campos');
        return;
      }
    }

    try {
      const response = await axios.post(
        `${API_BASE}/api/appointments/schedule/${vetId}/block`,
        blockForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowBlockModal(false);
      setBlockForm({ 
        date: '', 
        startTime: '', 
        endTime: '', 
        reason: '',
        blockType: 'single',
        recurringDaysOfWeek: [],
        endDate: '',
        isInfinite: false,
        weekStartDate: '',
        weekEndDate: ''
      });
      
      const message = response.data.count 
        ? `Se bloquearon ${response.data.count} horarios exitosamente`
        : 'Horario bloqueado exitosamente';
      alert(message);
      
      fetchSchedule();
    } catch (err) {
      console.error('Error blocking slot:', err);
      alert(err.response?.data?.message || 'Error al bloquear el horario');
    }
  };

  // Toggle día de la semana para bloqueo recurrente
  const toggleDayOfWeek = (day) => {
    setBlockForm(prev => ({
      ...prev,
      recurringDaysOfWeek: prev.recurringDaysOfWeek.includes(day)
        ? prev.recurringDaysOfWeek.filter(d => d !== day)
        : [...prev.recurringDaysOfWeek, day].sort()
    }));
  };

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Unblock time slot (individual)
  const handleUnblock = async (slotId) => {
    try {
      await axios.delete(
        `${API_BASE}/api/appointments/schedule/block/${slotId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchSchedule();
      alert('Horario desbloqueado exitosamente');
    } catch (err) {
      console.error('Error unblocking slot:', err);
      alert('Error al desbloquear el horario');
    }
  };

  // Unblock multiple slots (masivo)
  const handleUnblockMultiple = async () => {
    try {
      let payload = {};

      if (unblockForm.method === 'dateRange') {
        if (!unblockForm.startDate || !unblockForm.endDate) {
          alert('Por favor selecciona un rango de fechas');
          return;
        }
        payload.dateRange = {
          startDate: unblockForm.startDate,
          endDate: unblockForm.endDate
        };
        if (unblockForm.blockType) {
          payload.blockType = unblockForm.blockType;
        }
      } else if (unblockForm.method === 'blockType') {
        if (!unblockForm.blockType) {
          alert('Por favor selecciona un tipo de bloqueo');
          return;
        }
        payload.blockType = unblockForm.blockType;
      } else if (unblockForm.method === 'selected') {
        if (unblockForm.selectedSlotIds.length === 0) {
          alert('Por favor selecciona al menos un horario bloqueado');
          return;
        }
        payload.slotIds = unblockForm.selectedSlotIds;
      }

      const { data } = await axios.post(
        `${API_BASE}/api/appointments/schedule/${vetId}/unblock-multiple`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`${data.deletedCount} horario(s) desbloqueado(s) exitosamente`);
      setShowUnblockModal(false);
      setUnblockForm({
        method: 'dateRange',
        startDate: '',
        endDate: '',
        blockType: '',
        selectedSlotIds: []
      });
      fetchSchedule();
    } catch (err) {
      console.error('Error unblocking multiple slots:', err);
      alert('Error al desbloquear los horarios');
    }
  };

  // Handle cancel success
  const handleCancelSuccess = (data) => {
    fetchSchedule();
    setCancelModalOpen(false);
    setSelectedAppointment(null);
    if (data.isLate) {
      alert('Cita cancelada. Esta cancelación tardía afectará tu reputación en la plataforma.');
    }
  };

  // Custom toolbar component
  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const changeView = (viewName) => {
      toolbar.onView(viewName);
    };

    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 p-4 bg-white rounded-lg shadow-sm gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
          >
            ← Anterior
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition text-sm font-medium"
          >
            Hoy
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
          >
            Siguiente →
          </button>
        </div>
        <h2 className="text-xl font-bold text-gray-800 text-center">{toolbar.label}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeView('month')}
            className={`px-3 py-2 rounded-lg transition text-sm font-medium ${
              toolbar.view === 'month' ? 'bg-violet-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => changeView('week')}
            className={`px-3 py-2 rounded-lg transition text-sm font-medium ${
              toolbar.view === 'week' ? 'bg-violet-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => changeView('day')}
            className={`px-3 py-2 rounded-lg transition text-sm font-medium ${
              toolbar.view === 'day' ? 'bg-violet-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Día
          </button>
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Agenda</h1>
            <p className="text-gray-600">Gestiona tus citas y horarios disponibles</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Configurar horario laboral: Por defecto Lunes a Viernes (1-5), 8:00-18:00
                const today = new Date();
                const nextMonday = new Date(today);
                const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7;
                nextMonday.setDate(today.getDate() + daysUntilMonday);
                
                setBlockForm({ 
                  date: format(nextMonday, 'yyyy-MM-dd'),
                  startTime: '08:00',
                  endTime: '18:00',
                  reason: 'Horario laboral',
                  blockType: 'recurring',
                  recurringDaysOfWeek: [1, 2, 3, 4, 5], // Por defecto Lunes a Viernes, pero el usuario puede cambiar
                  endDate: '',
                  isInfinite: true, // Sin fecha de fin
                  weekStartDate: '',
                  weekEndDate: ''
                });
                setShowBlockModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-semibold hover:from-violet-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Bloquear Horario
            </button>
            <button
              onClick={() => setShowUnblockModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Desbloquear Horarios
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 overflow-hidden">
          <style>{`
            .rbc-calendar {
              font-family: inherit;
            }
            .rbc-header {
              padding: 10px 3px;
              font-weight: 600;
              border-bottom: 2px solid #e5e7eb;
            }
            .rbc-time-slot {
              border-top: 1px solid #f3f4f6;
            }
            .rbc-time-content {
              border-top: 2px solid #e5e7eb;
            }
            .rbc-day-slot .rbc-time-slot {
              border-top: 1px solid #f3f4f6;
            }
            .rbc-today {
              background-color: #fef3c7;
            }
            .rbc-off-range-bg {
              background-color: #f9fafb;
            }
            .rbc-selected-cell {
              background-color: #ede9fe;
            }
            .rbc-toolbar {
              margin-bottom: 0;
            }
            .rbc-toolbar button {
              color: #374151;
              border: 1px solid #d1d5db;
            }
            .rbc-toolbar button:hover {
              background-color: #f3f4f6;
            }
            .rbc-toolbar button.rbc-active {
              background-color: #7c3aed;
              color: white;
              border-color: #7c3aed;
            }
          `}</style>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600, minHeight: 500 }}
            date={currentDate}
            defaultView="week"
            view={view}
            onView={setView}
            onNavigate={setCurrentDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            messages={{
              next: 'Siguiente',
              previous: 'Anterior',
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Agenda',
              date: 'Fecha',
              time: 'Hora',
              event: 'Evento',
              noEventsInRange: 'No hay eventos en este rango'
            }}
            min={new Date(1970, 1, 1, 8, 0)} // 8 AM
            max={new Date(1970, 1, 1, 20, 0)} // 8 PM
            step={30}
            timeslots={2}
            components={{
              toolbar: CustomToolbar
            }}
            culture="es"
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Cita Agendada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Urgencia / Bloqueado</span>
          </div>
        </div>

        {/* Block Modal */}
        {showBlockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Bloquear Horario</h2>
              
              <div className="space-y-4">
                {/* Tipo de bloqueo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de bloqueo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBlockForm({ ...blockForm, blockType: 'single' })}
                      className={`px-3 py-2 rounded-lg transition text-sm ${
                        blockForm.blockType === 'single'
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Un día
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockForm({ ...blockForm, blockType: 'recurring' })}
                      className={`px-3 py-2 rounded-lg transition text-sm ${
                        blockForm.blockType === 'recurring'
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Horario fijo
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockForm({ ...blockForm, blockType: 'week' })}
                      className={`px-3 py-2 rounded-lg transition text-sm ${
                        blockForm.blockType === 'week'
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Semana completa
                    </button>
                  </div>
                </div>

                {/* Bloqueo de semana completa */}
                {blockForm.blockType === 'week' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fecha inicio de semana
                      </label>
                      <input
                        type="date"
                        value={blockForm.weekStartDate}
                        onChange={(e) => setBlockForm({ ...blockForm, weekStartDate: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fecha fin de semana
                      </label>
                      <input
                        type="date"
                        value={blockForm.weekEndDate}
                        onChange={(e) => setBlockForm({ ...blockForm, weekEndDate: e.target.value })}
                        min={blockForm.weekStartDate}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                )}

                {/* Bloqueo recurrente (horario fijo) */}
                {blockForm.blockType === 'recurring' && (
                  <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                    <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        Horario Fijo Recurrente
                      </p>
                      <p className="text-xs text-green-700">
                        Selecciona los días de la semana y el horario. Los horarios fuera de este rango quedarán bloqueados de forma recurrente.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Selecciona los días de la semana
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {dayNames.map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleDayOfWeek(index)}
                            className={`px-3 py-2 rounded-lg text-sm transition ${
                              blockForm.recurringDaysOfWeek.includes(index)
                                ? 'bg-violet-600 text-white'
                                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fecha de inicio
                      </label>
                      <input
                        type="date"
                        value={blockForm.date}
                        onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Se recomienda iniciar el próximo lunes
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Hora Inicio
                        </label>
                        <input
                          type="time"
                          value={blockForm.startTime}
                          onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Hora Fin
                        </label>
                        <input
                          type="time"
                          value={blockForm.endTime}
                          onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={blockForm.isInfinite}
                          onChange={(e) => {
                            setBlockForm({ 
                              ...blockForm, 
                              isInfinite: e.target.checked,
                              endDate: e.target.checked ? '' : blockForm.endDate
                            });
                          }}
                          className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Sin fecha de fin (aplicar indefinidamente)
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Si está marcado, el horario se aplicará semanalmente durante 1 año. Puedes desbloquear días específicos si necesitas excepciones.
                      </p>
                    </div>
                    {!blockForm.isInfinite && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Fecha de fin (hasta cuándo se repetirá)
                        </label>
                        <input
                          type="date"
                          value={blockForm.endDate}
                          onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                          min={blockForm.date}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    )}
                    {blockForm.isInfinite && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          <strong>Nota:</strong> Este horario se aplicará en los días seleccionados y se repetirá semanalmente durante 1 año. 
                          Los horarios fuera de este rango quedarán bloqueados para citas. Puedes desbloquear días específicos si necesitas excepciones.
                        </p>
                      </div>
                    )}
                  </div>
                )}


                {/* Bloqueo único (día específico) */}
                {blockForm.blockType === 'single' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={blockForm.date}
                        onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Hora Inicio
                        </label>
                        <input
                          type="time"
                          value={blockForm.startTime}
                          onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Hora Fin
                        </label>
                        <input
                          type="time"
                          value={blockForm.endTime}
                          onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Motivo (común para todos) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Motivo (opcional)
                  </label>
                  <input
                    type="text"
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                    placeholder="Ej: Reunión, Descanso, Vacaciones, etc."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setBlockForm({ 
                      date: '', 
                      startTime: '', 
                      endTime: '', 
                      reason: '',
                      blockType: 'single',
                      recurringDaysOfWeek: [],
                      endDate: '',
                      isInfinite: false,
                      weekStartDate: '',
                      weekEndDate: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBlock}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                >
                  Bloquear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de desbloqueo masivo */}
        {showUnblockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Desbloquear Horarios</h2>
              
              <div className="space-y-4">
                {/* Método de desbloqueo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Método de desbloqueo
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setUnblockForm({ ...unblockForm, method: 'dateRange' })}
                      className={`px-3 py-2 rounded-lg transition text-sm ${
                        unblockForm.method === 'dateRange'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Por rango de fechas
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnblockForm({ ...unblockForm, method: 'blockType' })}
                      className={`px-3 py-2 rounded-lg transition text-sm ${
                        unblockForm.method === 'blockType'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Por tipo de bloqueo
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnblockForm({ ...unblockForm, method: 'selected' })}
                      className={`px-3 py-2 rounded-lg transition text-sm ${
                        unblockForm.method === 'selected'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Seleccionar manualmente
                    </button>
                  </div>
                </div>

                {/* Desbloqueo por rango de fechas */}
                {unblockForm.method === 'dateRange' && (
                  <div className="space-y-4 p-4 bg-red-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Fecha inicio
                        </label>
                        <input
                          type="date"
                          value={unblockForm.startDate}
                          onChange={(e) => setUnblockForm({ ...unblockForm, startDate: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Fecha fin
                        </label>
                        <input
                          type="date"
                          value={unblockForm.endDate}
                          onChange={(e) => setUnblockForm({ ...unblockForm, endDate: e.target.value })}
                          min={unblockForm.startDate}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Tipo de bloqueo (opcional)
                      </label>
                      <select
                        value={unblockForm.blockType}
                        onChange={(e) => setUnblockForm({ ...unblockForm, blockType: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Todos los tipos</option>
                        <option value="single">Un día</option>
                        <option value="recurring">Horario fijo</option>
                        <option value="week">Semana completa</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Desbloqueo por tipo */}
                {unblockForm.method === 'blockType' && (
                  <div className="space-y-4 p-4 bg-red-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Tipo de bloqueo a desbloquear
                      </label>
                      <select
                        value={unblockForm.blockType}
                        onChange={(e) => setUnblockForm({ ...unblockForm, blockType: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Selecciona un tipo</option>
                        <option value="single">Un día</option>
                        <option value="recurring">Horario fijo</option>
                        <option value="week">Semana completa</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-600">
                      Se desbloquearán todos los horarios de este tipo, sin importar la fecha.
                    </p>
                  </div>
                )}

                {/* Desbloqueo manual (seleccionar desde el calendario) */}
                {unblockForm.method === 'selected' && (
                  <div className="space-y-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Haz clic en los horarios bloqueados (en rojo) en el calendario para seleccionarlos. 
                      Luego presiona "Desbloquear seleccionados".
                    </p>
                    <p className="text-xs text-gray-600">
                      Horarios seleccionados: {unblockForm.selectedSlotIds.length}
                    </p>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. 
                    Los horarios desbloqueados estarán disponibles inmediatamente para que los tutores puedan agendar citas.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUnblockModal(false);
                    setUnblockForm({
                      method: 'dateRange',
                      startDate: '',
                      endDate: '',
                      blockType: '',
                      selectedSlotIds: []
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnblockMultiple}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Desbloquear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de opciones para citas */}
        {showAppointmentOptionsModal && appointmentToHandle && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {appointmentToHandle.petId?.name || 'Mascota'} - {appointmentToHandle.userId?.name || 'Tutor'}
              </h3>
              <p className="text-gray-600 mb-6">
                ¿Qué deseas hacer con esta cita?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleViewDetails}
                  className="w-full px-6 py-3 bg-vet-primary text-white rounded-xl font-semibold hover:bg-vet-primary-light transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver detalles
                </button>
                <button
                  onClick={handleCancelAppointment}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar cita
                </button>
                <button
                  onClick={() => {
                    setShowAppointmentOptionsModal(false);
                    setAppointmentToHandle(null);
                  }}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all active:scale-95"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de cancelación */}
        <CancelAppointmentModal
          appointment={selectedAppointment}
          isOpen={cancelModalOpen}
          onClose={() => {
            setCancelModalOpen(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleCancelSuccess}
        />
      </div>
    </div>
  );
};

export default VetSchedulePage;

