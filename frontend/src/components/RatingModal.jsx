import React, { useEffect } from 'react';
import RatingForm from './RatingForm';

const RatingModal = ({ 
  isOpen, 
  onClose, 
  appointmentId, 
  vetId, 
  petId,
  onSuccess,
  existingRating = null,
  vetName = null,
  vetRating = null,
  appointmentDate = null,
  scheduledTime = null
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuccess = (rating) => {
    if (onSuccess) {
      onSuccess(rating);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl">
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Contenido */}
          <RatingForm
            appointmentId={appointmentId}
            vetId={vetId}
            petId={petId}
            onSuccess={handleSuccess}
            onCancel={onClose}
            existingRating={existingRating}
            vetName={vetName}
            vetRating={vetRating}
            appointmentDate={appointmentDate}
            scheduledTime={scheduledTime}
          />
        </div>
      </div>
    </div>
  );
};

export default RatingModal;

