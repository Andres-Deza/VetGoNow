import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StarRating from './StarRating';

const RatingForm = ({ 
  appointmentId, 
  vetId, 
  petId, 
  onSuccess, 
  onCancel, 
  existingRating = null,
  vetName = null,
  vetRating = null,
  appointmentDate = null,
  scheduledTime = null
}) => {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [categories, setCategories] = useState({
    punctuality: existingRating?.categories?.punctuality || 0,
    professionalism: existingRating?.categories?.professionalism || 0,
    communication: existingRating?.categories?.communication || 0,
    care: existingRating?.categories?.care || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCategories, setShowCategories] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // No permitir enviar si ya existe una calificación
    if (existingRating) {
      setError('Esta cita ya fue calificada y no se puede modificar');
      return;
    }
    
    if (rating === 0) {
      setError('Por favor, selecciona una calificación');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/api/ratings/appointment/${appointmentId}`,
        {
          rating,
          comment: comment.trim(),
          categories: showCategories ? categories : {}
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        if (onSuccess) {
          onSuccess(response.data.rating);
        }
      }
    } catch (err) {
      console.error('Error al guardar calificación:', err);
      setError(err.response?.data?.message || 'Error al guardar la calificación. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = (category, value) => {
    setCategories(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // Formatear la fecha de la cita
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Formatear la hora de la cita
  const formatTime = (timeString) => {
    if (!timeString) return null;
    try {
      // Si es una fecha ISO completa, extraer solo la hora
      let date;
      if (timeString.includes('T') || timeString.includes(' ')) {
        date = new Date(timeString);
      } else {
        // Si es solo hora (HH:mm), crear una fecha con esa hora
        const [hours, minutes] = timeString.split(':');
        date = new Date();
        date.setHours(parseInt(hours || 0), parseInt(minutes || 0), 0, 0);
      }
      
      return date.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) + ' hrs';
    } catch (error) {
      // Si falla, intentar formatear directamente si es formato HH:mm
      if (timeString.match(/^\d{1,2}:\d{2}$/)) {
        return `${timeString} hrs`;
      }
      return timeString;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-2xl w-full mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Califica la Atención
        </h2>
        <p className="text-gray-600">
          Tu opinión nos ayuda a mejorar el servicio
        </p>
        
        {/* Información del veterinario y fecha */}
        {(vetName || vetRating || appointmentDate) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="space-y-2">
              {vetName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Veterinario:</span>
                  <span className="text-sm font-semibold text-gray-900">Dr. {vetName}</span>
                </div>
              )}
              {vetRating !== null && vetRating !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Calificación del profesional:</span>
                  <div className="flex items-center gap-1">
                    <StarRating rating={vetRating} readonly={true} size="sm" />
                    <span className="text-sm font-semibold text-gray-900">{vetRating.toFixed(1)}</span>
                  </div>
                </div>
              )}
              {appointmentDate && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Fecha de la cita:</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">
                    {formatDate(appointmentDate)}
                    {scheduledTime && ` • ${formatTime(scheduledTime)}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {existingRating && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Esta cita ya fue calificada. Las calificaciones no se pueden modificar.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Calificación General */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Calificación General *
          </label>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            size="xl"
            showLabel={true}
          />
        </div>

        {/* Categorías Detalladas (Opcional) */}
        <div>
          <button
            type="button"
            onClick={() => setShowCategories(!showCategories)}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-2"
          >
            <svg className={`w-4 h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showCategories ? 'Ocultar' : 'Mostrar'} calificaciones detalladas (opcional)
          </button>

          {showCategories && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Puntualidad
                </label>
                <StarRating
                  rating={categories.punctuality}
                  onRatingChange={(value) => updateCategory('punctuality', value)}
                  size="md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profesionalismo
                </label>
                <StarRating
                  rating={categories.professionalism}
                  onRatingChange={(value) => updateCategory('professionalism', value)}
                  size="md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comunicación
                </label>
                <StarRating
                  rating={categories.communication}
                  onRatingChange={(value) => updateCategory('communication', value)}
                  size="md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuidado y Atención
                </label>
                <StarRating
                  rating={categories.care}
                  onRatingChange={(value) => updateCategory('care', value)}
                  size="md"
                />
              </div>
            </div>
          )}
        </div>

        {/* Comentario */}
        <div>
          <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
            Comentario (opcional)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Comparte tu experiencia con esta atención..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">
            {comment.length}/500 caracteres
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Enviar Calificación</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RatingForm;

