import React, { useState, useMemo } from 'react';

const ModernCalendar = ({ 
  selectedDate, 
  onDateSelect, 
  minDate, 
  maxDate, 
  availableDaysOfWeek = [],
  className = '' 
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      // Parsear la fecha seleccionada en hora local (evitar problemas de zona horaria)
      const [year, month, day] = selectedDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayNamesShort = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

  // Calcular los días del mes actual
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Día de la semana del primer día (0 = domingo, 6 = sábado)
    const startDay = firstDay.getDay();
    
    // Número de días en el mes
    const daysInMonth = lastDay.getDate();
    
    // Días del mes anterior para llenar la primera semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      prevDays.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      });
    }
    
    // Días del mes actual
    const currentDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      currentDays.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }
    
    // Días del siguiente mes para completar la última semana
    const totalCells = prevDays.length + currentDays.length;
    const remainingCells = 42 - totalCells; // 6 semanas * 7 días = 42
    const nextDays = [];
    for (let day = 1; day <= remainingCells; day++) {
      nextDays.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }
    
    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentMonth]);

  // Función para formatear fecha
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para verificar si una fecha es válida
  const isDateValid = (date) => {
    if (!date) return false;
    
    // Verificar que esté en el rango válido
    const dateStr = formatDateLocal(date);
    if (dateStr < minDate || dateStr > maxDate) {
      return false;
    }
    
    // Verificar que sea al menos mañana
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);
    if (dateCopy <= today) {
      return false;
    }
    
    // Verificar que el día de la semana esté disponible
    const dayOfWeek = date.getDay();
    if (availableDaysOfWeek.length > 0 && !availableDaysOfWeek.includes(dayOfWeek)) {
      return false;
    }
    
    return true;
  };

  // Función para verificar si una fecha está seleccionada
  const isDateSelected = (date) => {
    if (!selectedDate || !date) return false;
    // Parsear la fecha seleccionada en hora local (evitar problemas de zona horaria)
    const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
    const selected = new Date(selectedYear, selectedMonth - 1, selectedDay);
    
    return (
      date.getFullYear() === selected.getFullYear() &&
      date.getMonth() === selected.getMonth() &&
      date.getDate() === selected.getDate()
    );
  };

  // Navegar al mes anterior
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navegar al mes siguiente
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Manejar clic en un día
  const handleDayClick = (dayData) => {
    if (!dayData.isCurrentMonth || !isDateValid(dayData.date)) {
      return;
    }
    const dateStr = formatDateLocal(dayData.date);
    onDateSelect(dateStr);
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-4 ${className}`}>
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes anterior"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes siguiente"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Nombres de los días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNamesShort.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Días del calendario */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayData, index) => {
          const isValid = dayData.isCurrentMonth && isDateValid(dayData.date);
          const isSelected = isDateSelected(dayData.date);
          const isToday = dayData.date.toDateString() === new Date().toDateString();

          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDayClick(dayData);
              }}
              disabled={!isValid}
              className={`
                relative aspect-square rounded-lg transition-all duration-200
                ${!dayData.isCurrentMonth
                  ? 'text-gray-300 cursor-not-allowed'
                  : isValid
                  ? isSelected
                    ? 'bg-blue-600 text-white font-semibold shadow-md scale-105'
                    : 'bg-gray-50 text-gray-900 hover:bg-blue-100 hover:scale-105 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                }
                ${isToday && dayData.isCurrentMonth && !isSelected ? 'ring-2 ring-blue-300' : ''}
              `}
            >
              <span className="flex items-center justify-center h-full w-full text-sm">
                {dayData.day}
              </span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-700 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-600"></div>
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-50 border border-gray-300"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100 opacity-60"></div>
          <span>No disponible</span>
        </div>
      </div>
    </div>
  );
};

export default ModernCalendar;

