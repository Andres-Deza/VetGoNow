import React, { useState, useRef } from 'react';
import axios from '../config/axiosConfig';

const ImageAnalysisModal = ({ isOpen, onClose, petId, petSpecies, onAnalysisComplete }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('La imagen es muy grande. Máximo 10MB');
        return;
      }
      
      setSelectedImage(file);
      setError(null);
      setAnalysisResult(null);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhoto = () => {
    cameraInputRef.current?.click();
  };

  const handleChooseFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Por favor selecciona una imagen primero');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (petSpecies) {
        formData.append('species', petSpecies);
      }
      if (petId) {
        formData.append('petId', petId);
      }

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/image-analysis/analyze', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.success) {
        setAnalysisResult(response.data.data);
        if (onAnalysisComplete) {
          onAnalysisComplete(response.data.data);
        }
      } else {
        setError(response.data?.message || 'Error al analizar la imagen');
      }
    } catch (err) {
      console.error('Error al analizar imagen:', err);
      if (err.response?.status === 429) {
        setError('Se ha alcanzado el límite de solicitudes. Por favor, intenta más tarde.');
      } else {
        setError(err.response?.data?.message || 'Error al analizar la imagen. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setPreview(null);
    setAnalysisResult(null);
    setError(null);
    onClose();
  };

  const handleBookAppointment = () => {
    // Redirigir a agendar cita
    window.location.href = '/agendar-cita';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-tutor-text-primary">
            Análisis de Imagen con IA
          </h2>
          <button
            onClick={handleClose}
            className="text-tutor-text-secondary hover:text-tutor-text-primary text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!analysisResult ? (
            <>
              {/* Selección de imagen */}
              <div className="mb-6">
                <p className="text-tutor-text-secondary mb-4">
                  Sube una foto de tu mascota para analizar su raza y detectar posibles problemas de salud.
                </p>

                <div className="flex gap-4 mb-4">
                  <button
                    onClick={handleTakePhoto}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    📷 Tomar Foto
                  </button>
                  <button
                    onClick={handleChooseFromGallery}
                    className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                  >
                    🖼️ Elegir de Galería
                  </button>
                </div>

                {/* Inputs ocultos */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Preview de imagen */}
                {preview && (
                  <div className="mt-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="mt-4 w-full px-6 py-3 bg-tutor-btn-primary text-white rounded-lg hover:bg-tutor-btn-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Analizando...
                        </span>
                      ) : (
                        '🔍 Analizar Imagen'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Resultados del análisis */
            <div className="space-y-6">
              {/* Análisis de Raza */}
              {analysisResult.breedAnalysis && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-tutor-text-primary mb-4">
                    🐾 Identificación de Raza
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold">Especie:</span>{' '}
                      {analysisResult.breedAnalysis.species || 'No identificado'}
                    </div>
                    
                    {analysisResult.breedAnalysis.primaryBreed && (
                      <div>
                        <span className="font-semibold">Raza Principal:</span>{' '}
                        {analysisResult.breedAnalysis.primaryBreed.name} ({analysisResult.breedAnalysis.primaryBreed.confidence}% de seguridad)
                      </div>
                    )}

                    {analysisResult.breedAnalysis.isMixed && analysisResult.breedAnalysis.secondaryBreeds && analysisResult.breedAnalysis.secondaryBreeds.length > 0 && (
                      <div>
                        <span className="font-semibold">Razas Secundarias:</span>
                        <ul className="list-disc list-inside ml-4">
                          {analysisResult.breedAnalysis.secondaryBreeds.map((breed, idx) => (
                            <li key={idx}>
                              {breed.name} ({breed.confidence}%)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.breedAnalysis.notes && (
                      <div className="text-sm text-gray-600 mt-2">
                        {analysisResult.breedAnalysis.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Análisis de Salud */}
              {analysisResult.healthAnalysis && (
                <div className={`rounded-lg p-6 ${
                  analysisResult.healthAnalysis.hasIssues 
                    ? 'bg-red-50 border-2 border-red-300' 
                    : 'bg-green-50 border-2 border-green-300'
                }`}>
                  <h3 className="text-xl font-bold text-tutor-text-primary mb-4">
                    🏥 Análisis de Salud
                  </h3>

                  {analysisResult.healthAnalysis.hasIssues ? (
                    <>
                      <div className="mb-4">
                        <span className="font-semibold text-red-800">Estado General:</span>{' '}
                        <span className="text-red-700">
                          {analysisResult.healthAnalysis.overallHealth === 'atención_requerida' 
                            ? '⚠️ Atención Requerida' 
                            : '⚠️ Revisar'}
                        </span>
                      </div>

                      {analysisResult.healthAnalysis.issues && analysisResult.healthAnalysis.issues.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold">Problemas Detectados:</h4>
                          {analysisResult.healthAnalysis.issues.map((issue, idx) => (
                            <div key={idx} className="bg-white rounded p-3 border border-red-200">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold">{issue.type}</span>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  issue.urgency === 'alto' ? 'bg-red-200 text-red-800' :
                                  issue.urgency === 'medio' ? 'bg-yellow-200 text-yellow-800' :
                                  'bg-gray-200 text-gray-800'
                                }`}>
                                  {issue.urgency === 'alto' ? '🔴 Urgencia Alta' :
                                   issue.urgency === 'medio' ? '🟡 Urgencia Media' :
                                   '🟢 Urgencia Baja'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700">
                                <div><span className="font-semibold">Ubicación:</span> {issue.location}</div>
                                <div className="mt-1">{issue.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {analysisResult.recommendations?.shouldSeeVet && (
                        <div className="mt-6 p-4 bg-red-100 rounded-lg border-2 border-red-300">
                          <p className="font-semibold text-red-800 mb-2">
                            ⚠️ Se recomienda consultar con un veterinario
                          </p>
                          {analysisResult.recommendations.vetConsultationReason && (
                            <p className="text-red-700 text-sm mb-4">
                              {analysisResult.recommendations.vetConsultationReason}
                            </p>
                          )}
                          <button
                            onClick={handleBookAppointment}
                            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                          >
                            📅 Agendar Cita con Veterinario
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-green-800">
                      <p className="font-semibold mb-2">✅ No se detectaron problemas visibles</p>
                      <p className="text-sm">{analysisResult.healthAnalysis.notes || 'La mascota parece estar en buen estado general.'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Recomendaciones */}
              {analysisResult.recommendations && analysisResult.recommendations.suggestions && analysisResult.recommendations.suggestions.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-300">
                  <h3 className="text-xl font-bold text-tutor-text-primary mb-4">
                    💡 Recomendaciones
                  </h3>
                  <ul className="space-y-2">
                    {analysisResult.recommendations.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    setSelectedImage(null);
                    setPreview(null);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Analizar Otra Imagen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalysisModal;

