import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axiosConfig';
import PetAvatar from '../../components/PetAvatar';
import CameraCapture from '../../components/CameraCapture';

const PreventiveCareAssistant = () => {
  const navigate = useNavigate();
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [activeTab, setActiveTab] = useState('summary'); // summary, calendar, nutrition, breed-detector, health-detector
  const [breedAnalysis, setBreedAnalysis] = useState(null);
  const [healthAnalysis, setHealthAnalysis] = useState(null);
  const [loadingBreed, setLoadingBreed] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (selectedPetId) {
      fetchSummary(selectedPetId);
      fetchCalendar(selectedPetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPetId]);

  const fetchPets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/preventive-care/summary/pets', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Response de fetchPets:', response.data);
      console.log('Response status:', response.status);

      if (response.data && response.data.success) {
        const petsData = response.data.data || [];
        console.log(`Mascotas recibidas: ${petsData.length}`, petsData);
        setPets(petsData);
        if (petsData.length > 0 && !selectedPetId) {
          setSelectedPetId(petsData[0]._id);
        } else if (petsData.length === 0) {
          console.warn('El backend respondió con éxito pero sin mascotas. Posibles causas:');
          console.warn('1. El usuario no tiene mascotas registradas');
          console.warn('2. Todas las mascotas están marcadas como eliminadas (isDeleted: true)');
          console.warn('3. Hay un problema con el userId en la consulta');
        }
      } else {
        console.warn('Respuesta sin éxito:', response.data);
        setPets([]);
      }
    } catch (error) {
      console.error('Error al obtener mascotas:', error);
      console.error('Error details:', error.response?.data || error.message);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (petId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/preventive-care/summary/pet/${petId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async (petId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/preventive-care/calendar/pet/${petId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setCalendar(response.data.data || []);
      } else {
        setCalendar([]);
      }
    } catch (error) {
      console.error('Error al obtener calendario:', error);
      setCalendar([]);
    }
  };


  const selectedPet = pets.find(p => p._id === selectedPetId);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tutor-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tutor-btn-primary mx-auto mb-4"></div>
          <p className="text-tutor-text-secondary">Cargando asistente de cuidado preventivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tutor-bg-primary p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-tutor-text-primary mb-2">
            Asistente de Cuidado Preventivo
          </h1>
          <p className="text-tutor-text-secondary">
            Planes personalizados y recomendaciones inteligentes para tus mascotas
          </p>
        </div>

        {/* Selector de Mascota */}
        {pets.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-tutor-text-primary mb-2">
              Selecciona una mascota
            </label>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {pets.map((pet) => (
                <button
                  key={pet._id}
                  onClick={() => setSelectedPetId(pet._id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all whitespace-nowrap ${
                    selectedPetId === pet._id
                      ? 'border-tutor-btn-primary bg-tutor-btn-primary/10'
                      : 'border-tutor-bg-secondary hover:border-tutor-btn-secondary'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <PetAvatar species={pet.species} image={pet.image} name={pet.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-tutor-text-primary">{pet.name}</p>
                    <p className="text-xs text-tutor-text-secondary">{pet.species} - {pet.breed}</p>
                  </div>
                  {(pet.alerts?.expiredVaccines > 0 || pet.alerts?.upcomingVaccines > 0) && (
                    <span className="ml-2 px-2 py-1 bg-tutor-alert-danger text-white text-xs rounded-full">
                      {pet.alerts.expiredVaccines + pet.alerts.upcomingVaccines}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && pets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-tutor-text-secondary mb-4">No tienes mascotas registradas</p>
            <button
              onClick={() => navigate('/mypets')}
              className="px-6 py-2 bg-tutor-btn-primary text-white rounded-lg hover:bg-tutor-btn-primary-dark"
            >
              Registrar Mascota
            </button>
          </div>
        ) : selectedPetId && summary ? (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-tutor-bg-secondary overflow-x-auto">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'summary'
                    ? 'text-tutor-btn-primary border-b-2 border-tutor-btn-primary'
                    : 'text-tutor-text-secondary hover:text-tutor-text-primary'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => {
                  setActiveTab('calendar');
                  fetchCalendar(selectedPetId);
                }}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'calendar'
                    ? 'text-tutor-btn-primary border-b-2 border-tutor-btn-primary'
                    : 'text-tutor-text-secondary hover:text-tutor-text-primary'
                }`}
              >
                Calendario
              </button>
              <button
                onClick={() => setActiveTab('nutrition')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'nutrition'
                    ? 'text-tutor-btn-primary border-b-2 border-tutor-btn-primary'
                    : 'text-tutor-text-secondary hover:text-tutor-text-primary'
                }`}
              >
                Nutrición y Peso
              </button>
              <button
                onClick={() => setActiveTab('breed-detector')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'breed-detector'
                    ? 'text-tutor-btn-primary border-b-2 border-tutor-btn-primary'
                    : 'text-tutor-text-secondary hover:text-tutor-text-primary'
                }`}
              >
                🐾 Detector de Raza
              </button>
              <button
                onClick={() => setActiveTab('health-detector')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'health-detector'
                    ? 'text-tutor-btn-primary border-b-2 border-tutor-btn-primary'
                    : 'text-tutor-text-secondary hover:text-tutor-text-primary'
                }`}
              >
                🏥 Detector de Enfermedades
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              {activeTab === 'summary' && <SummaryTab summary={summary} selectedPet={selectedPet} />}
              {activeTab === 'calendar' && <CalendarTab calendar={calendar} />}
              {activeTab === 'nutrition' && (
                <NutritionTab summary={summary} />
              )}
              {activeTab === 'breed-detector' && (
                <BreedDetectorTab
                  selectedPetId={selectedPetId}
                  petSpecies={pets.find(p => p._id === selectedPetId)?.species}
                  breedAnalysis={breedAnalysis}
                  loading={loadingBreed}
                  onAnalyze={async (imageFiles) => {
                    setLoadingBreed(true);
                    try {
                      const formData = new FormData();
                      // imageFiles puede ser un array o un solo archivo (compatibilidad)
                      const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
                      files.forEach((file, index) => {
                        formData.append('images', file);
                      });
                      if (pets.find(p => p._id === selectedPetId)?.species) {
                        formData.append('species', pets.find(p => p._id === selectedPetId)?.species);
                      }
                      if (selectedPetId) {
                        formData.append('petId', selectedPetId);
                      }

                      const token = localStorage.getItem('token');
                      const response = await axios.post('/api/image-analysis/breed', formData, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'multipart/form-data'
                        }
                      });

                      if (response.data && response.data.success) {
                        setBreedAnalysis(response.data.data);
                      } else {
                        alert(response.data?.message || 'Error al analizar la raza');
                      }
                    } catch (err) {
                      console.error('Error:', err);
                      alert(err.response?.data?.message || 'Error al analizar la imagen');
                    } finally {
                      setLoadingBreed(false);
                    }
                  }}
                />
              )}
              {activeTab === 'health-detector' && (
                <HealthDetectorTab
                  selectedPetId={selectedPetId}
                  petSpecies={pets.find(p => p._id === selectedPetId)?.species}
                  healthAnalysis={healthAnalysis}
                  loading={loadingHealth}
                  onReset={() => {
                    setHealthAnalysis(null);
                  }}
                  onAnalyze={async (imageFiles, userContext) => {
                    setLoadingHealth(true);
                    try {
                      const formData = new FormData();
                      // imageFiles puede ser un array o un solo archivo (compatibilidad)
                      const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
                      files.forEach((file, index) => {
                        formData.append('images', file);
                      });
                      if (pets.find(p => p._id === selectedPetId)?.species) {
                        formData.append('species', pets.find(p => p._id === selectedPetId)?.species);
                      }
                      if (selectedPetId) {
                        formData.append('petId', selectedPetId);
                      }
                      if (userContext && userContext.trim()) {
                        formData.append('context', userContext.trim());
                      }

                      const token = localStorage.getItem('token');
                      const response = await axios.post('/api/image-analysis/health', formData, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'multipart/form-data'
                        }
                      });

                      if (response.data && response.data.success) {
                        setHealthAnalysis(response.data.data);
                      } else {
                        alert(response.data?.message || 'Error al analizar la salud');
                      }
                    } catch (err) {
                      console.error('Error:', err);
                      alert(err.response?.data?.message || 'Error al analizar la imagen');
                    } finally {
                      setLoadingHealth(false);
                    }
                  }}
                />
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

// Componente de Resumen
const SummaryTab = ({ summary, selectedPet }) => {
  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-tutor-text-secondary">Vacunas</p>
          <p className="text-2xl font-bold text-tutor-text-primary">{summary.summary.totalVaccines}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-tutor-text-secondary">Desparasitaciones</p>
          <p className="text-2xl font-bold text-tutor-text-primary">{summary.summary.totalDewormings}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-tutor-text-secondary">Consultas/Cirugías</p>
          <p className="text-2xl font-bold text-tutor-text-primary">{summary.summary.totalMedicalRecords}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-sm text-tutor-text-secondary">Citas Completadas</p>
          <p className="text-2xl font-bold text-tutor-text-primary">{summary.summary.totalAppointments}</p>
        </div>
      </div>

      {/* Recordatorios Pendientes */}
      {summary.pendingReminders && summary.pendingReminders.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <h3 className="font-semibold text-tutor-text-primary mb-2">Recordatorios Pendientes</h3>
          <ul className="space-y-2">
            {summary.pendingReminders.map((reminder, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-yellow-600">⏰</span>
                <div>
                  <p className="font-medium text-tutor-text-primary">{reminder.title}</p>
                  <p className="text-sm text-tutor-text-secondary">
                    {new Date(reminder.dueDate).toLocaleDateString('es-CL')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Últimas Vacunas */}
      {summary.vaccines && summary.vaccines.length > 0 && (
        <div>
          <h3 className="font-semibold text-tutor-text-primary mb-3">Últimas Vacunas</h3>
          <div className="space-y-2">
            {summary.vaccines.map((vaccine) => (
              <div key={vaccine._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-tutor-text-primary">{vaccine.name}</p>
                  <p className="text-sm text-tutor-text-secondary">
                    {new Date(vaccine.applicationDate).toLocaleDateString('es-CL')}
                  </p>
                </div>
                {vaccine.isExpired && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Vencida</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análisis de Peso */}
      {summary.weightAnalysis && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <h3 className="font-semibold text-tutor-text-primary mb-2">Análisis de Peso</h3>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-tutor-text-secondary">Peso Actual</p>
              <p className="text-xl font-bold text-tutor-text-primary">
                {summary.weightAnalysis.currentWeight || 'No registrado'} kg
              </p>
            </div>
            {summary.weightAnalysis.weightStatus && (
              <>
                <div className="h-12 w-px bg-gray-300"></div>
                <div>
                  <p className="text-sm text-tutor-text-secondary">Estado</p>
                  <p className={`text-xl font-bold ${
                    summary.weightAnalysis.weightStatus === 'normal' ? 'text-green-600' :
                    summary.weightAnalysis.weightStatus === 'sobrepeso' ? 'text-orange-600' :
                    summary.weightAnalysis.weightStatus === 'bajo' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {summary.weightAnalysis.weightStatus === 'normal' ? 'Normal' :
                     summary.weightAnalysis.weightStatus === 'sobrepeso' ? 'Sobrepeso' :
                     summary.weightAnalysis.weightStatus === 'bajo' ? 'Bajo peso' : 'No evaluado'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Calendario
const CalendarTab = ({ calendar }) => {
  if (!calendar || calendar.length === 0) {
    return (
      <div className="text-center py-8 text-tutor-text-secondary">
        <p>No hay eventos programados en el calendario preventivo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {calendar.map((month, idx) => (
        <div key={idx} className="border-b border-tutor-bg-secondary pb-4 last:border-0">
          <h3 className="text-xl font-bold text-tutor-text-primary mb-4">{month.month}</h3>
          <div className="grid gap-3">
            {month.tasks.map((task, taskIdx) => (
              <div
                key={taskIdx}
                className={`p-4 rounded-lg border-l-4 ${
                  task.type === 'vaccine' ? 'bg-blue-50 border-blue-400' :
                  task.type === 'deworming' ? 'bg-green-50 border-green-400' :
                  'bg-purple-50 border-purple-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-tutor-text-primary">{task.title}</p>
                    <p className="text-sm text-tutor-text-secondary mt-1">{task.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Componente de Nutrición
const NutritionTab = ({ summary }) => {
  if (!summary?.weightAnalysis) {
    return (
      <div className="text-center py-8 text-tutor-text-secondary">
        <p>No hay información de peso disponible para esta mascota.</p>
        <p className="text-sm mt-2">Registra el peso de tu mascota en una consulta veterinaria para ver el análisis aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-tutor-text-primary mb-4">Análisis de Peso</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-tutor-text-secondary">Peso Actual</p>
            <p className="text-2xl font-bold text-tutor-text-primary">
              {summary.weightAnalysis.currentWeight || 'N/A'} kg
            </p>
          </div>
          <div>
            <p className="text-sm text-tutor-text-secondary">Peso Ideal</p>
            <p className="text-2xl font-bold text-tutor-text-primary">
              {summary.weightAnalysis.idealWeight?.toFixed(1) || 'N/A'} kg
            </p>
          </div>
          <div>
            <p className="text-sm text-tutor-text-secondary">Rango Ideal</p>
            <p className="text-lg font-semibold text-tutor-text-primary">
              {summary.weightAnalysis.minWeight?.toFixed(1) || 'N/A'} - {summary.weightAnalysis.maxWeight?.toFixed(1) || 'N/A'} kg
            </p>
          </div>
          <div>
            <p className="text-sm text-tutor-text-secondary">Estado</p>
            <p className={`text-xl font-bold ${
              summary.weightAnalysis.weightStatus === 'normal' ? 'text-green-600' :
              summary.weightAnalysis.weightStatus === 'sobrepeso' ? 'text-orange-600' :
              summary.weightAnalysis.weightStatus === 'bajo' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {summary.weightAnalysis.weightStatus === 'normal' ? 'Normal' :
               summary.weightAnalysis.weightStatus === 'sobrepeso' ? 'Sobrepeso' :
               summary.weightAnalysis.weightStatus === 'bajo' ? 'Bajo peso' : 'No evaluado'}
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Este análisis se basa en el peso actual y el rango ideal para la especie y raza de tu mascota.
          Para recomendaciones nutricionales personalizadas, consulta con un veterinario.
        </p>
      </div>
    </div>
  );
};

// Componente Detector de Raza
const BreedDetectorTab = ({ selectedPetId, petSpecies, breedAnalysis, loading, onAnalyze }) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showBreedTips, setShowBreedTips] = useState(false);
  const fileInputRef = useRef(null);
  const MAX_IMAGES = 3;

  const processImageFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 10MB por imagen');
      return;
    }
    
    if (selectedImages.length >= MAX_IMAGES) {
      alert(`Máximo ${MAX_IMAGES} imágenes permitidas`);
      return;
    }

    const newImages = [...selectedImages, file];
    setSelectedImages(newImages);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews([...previews, reader.result]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    filesToAdd.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`La imagen ${file.name} es muy grande. Máximo 10MB por imagen`);
        return;
      }
      processImageFile(file);
    });
    
    if (files.length > remainingSlots) {
      alert(`Solo se pueden agregar hasta ${MAX_IMAGES} imágenes. Se agregaron ${remainingSlots} de ${files.length}`);
    }
    
    // Reset input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = '';
  };

  const handleCameraCapture = (file) => {
    setShowCamera(false);
    processImageFile(file);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setPreviews(newPreviews);
  };

  const handleAnalyze = () => {
    if (selectedImages.length > 0) {
      onAnalyze(selectedImages);
    }
  };

  // Información preventiva basada en razas comunes
  const getBreedPreventiveInfo = (breedName) => {
    const breedInfo = {
      'Labrador': {
        commonIssues: ['Displasia de cadera', 'Obesidad', 'Problemas articulares'],
        recommendations: ['Control de peso regular', 'Ejercicio moderado', 'Suplementos para articulaciones'],
        vaccines: ['Óctuple anual', 'Antirrábica obligatoria']
      },
      'Pastor Alemán': {
        commonIssues: ['Displasia de cadera', 'Problemas digestivos', 'Alergias'],
        recommendations: ['Ejercicio controlado', 'Dieta específica', 'Revisiones articulares'],
        vaccines: ['Óctuple anual', 'Antirrábica obligatoria']
      },
      'Bulldog': {
        commonIssues: ['Problemas respiratorios', 'Alergias cutáneas', 'Problemas oculares'],
        recommendations: ['Evitar ejercicio intenso en calor', 'Limpieza de pliegues', 'Control de temperatura'],
        vaccines: ['Óctuple anual', 'Antirrábica obligatoria']
      },
      'Golden Retriever': {
        commonIssues: ['Displasia de cadera', 'Problemas cardíacos', 'Alergias'],
        recommendations: ['Control de peso', 'Revisiones cardíacas', 'Dieta balanceada'],
        vaccines: ['Óctuple anual', 'Antirrábica obligatoria']
      },
      'Mestizo': {
        commonIssues: ['Varían según las razas que componen la mezcla'],
        recommendations: ['Cuidados preventivos generales', 'Observación de características físicas'],
        vaccines: ['Óctuple anual', 'Antirrábica obligatoria']
      }
    };

    return breedInfo[breedName] || {
      commonIssues: ['Consulta con veterinario para información específica'],
      recommendations: ['Vacunación regular', 'Desparasitación periódica'],
      vaccines: ['Óctuple anual', 'Antirrábica obligatoria']
    };
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-tutor-text-primary mb-2">
          🐾 Detector de Raza
        </h3>
        <p className="text-tutor-text-secondary">
          Sube hasta 3 fotos de tu mascota para identificar su raza y obtener recomendaciones preventivas personalizadas
        </p>
      </div>

      {/* Recomendaciones para foto de raza */}
      {!breedAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <button
            onClick={() => setShowBreedTips(!showBreedTips)}
            className="w-full flex items-center justify-between p-4 hover:bg-blue-100 transition rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="text-blue-500 text-xl">💡</div>
              <h4 className="font-semibold text-blue-900 text-left">
                Cómo tomar una buena foto para identificar la raza
              </h4>
            </div>
            <svg
              className={`w-5 h-5 text-blue-600 transition-transform ${showBreedTips ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showBreedTips && (
            <div className="px-4 pb-4 pt-2">
              <ul className="text-sm text-blue-800 space-y-2 list-none">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Ángulo:</strong> Foto lateral o frontal, con la mascota de perfil completo o de frente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Iluminación:</strong> Buena luz natural o iluminación clara, sin sombras que oculten características</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Distancia:</strong> La mascota debe ocupar la mayor parte de la foto, incluyendo todo el cuerpo o al menos la cabeza, cuello y parte del tronco</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Enfoque:</strong> La imagen debe estar nítida y enfocada, especialmente cabeza y características distintivas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Fondo:</strong> Fondo simple y despejado que no distraiga (preferiblemente uniforme)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Pose:</strong> La mascota de pie o sentada en posición natural, sin objetos que oculten el cuerpo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Elementos visibles:</strong> Orejas, cola, patas, tipo de pelaje y estructura corporal deben ser claramente visibles</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Selector de imagen */}
      {!breedAnalysis && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {selectedImages.length === 0 ? (
              <>
                <div className="flex gap-4 justify-center mb-4">
                  <button
                    onClick={() => setShowCamera(true)}
                    disabled={selectedImages.length >= MAX_IMAGES}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📷 Tomar Foto
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedImages.length >= MAX_IMAGES}
                    className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🖼️ Elegir de Galería
                  </button>
                </div>
                <p className="text-sm text-gray-500">Puedes subir hasta {MAX_IMAGES} imágenes para mejor precisión</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {showCamera && (
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                  />
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition"
                        title="Eliminar imagen"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Imagen {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 justify-center">
                  {selectedImages.length < MAX_IMAGES && (
                    <>
                      <button
                        onClick={() => setShowCamera(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                      >
                        📷 Agregar Foto
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm"
                      >
                        🖼️ Agregar de Galería
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={loading || selectedImages.length === 0}
                    className="px-6 py-3 bg-tutor-btn-primary text-white rounded-lg hover:bg-tutor-btn-primary-dark disabled:opacity-50 transition"
                  >
                    {loading ? 'Analizando...' : `🔍 Analizar Raza (${selectedImages.length} imagen${selectedImages.length > 1 ? 'es' : ''})`}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedImages([]);
                      setPreviews([]);
                    }}
                    className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Limpiar Todo
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {selectedImages.length} de {MAX_IMAGES} imágenes seleccionadas
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resultados */}
      {breedAnalysis && (
        <div className="space-y-6">
          {/* Información de raza */}
          <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-300">
            <h4 className="text-xl font-bold text-tutor-text-primary mb-4">Identificación de Raza</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Especie</p>
                <p className="text-lg font-semibold">{breedAnalysis.species || 'No identificado'}</p>
              </div>
              
              {breedAnalysis.primaryBreed && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Raza Principal</p>
                    <p className="text-lg font-semibold">{breedAnalysis.primaryBreed.name}</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${breedAnalysis.primaryBreed.confidence}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{breedAnalysis.primaryBreed.confidence}% de seguridad</p>
                    </div>
                  </div>

                  {breedAnalysis.isMixed && breedAnalysis.secondaryBreeds && breedAnalysis.secondaryBreeds.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-2">Razas Secundarias (Mestizo)</p>
                      <div className="space-y-2">
                        {breedAnalysis.secondaryBreeds.map((breed, idx) => (
                          <div key={idx} className="bg-white rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">{breed.name}</span>
                              <span className="text-sm text-gray-600">{breed.confidence}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${breed.confidence}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {breedAnalysis.primaryBreed?.characteristics && breedAnalysis.primaryBreed.characteristics.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-2">Características Detectadas</p>
                  <div className="flex flex-wrap gap-2">
                    {breedAnalysis.primaryBreed.characteristics.map((char, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white rounded-full text-sm">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {breedAnalysis.notes && (
              <div className="mt-4 p-3 bg-white rounded text-sm text-gray-700">
                {breedAnalysis.notes}
              </div>
            )}
          </div>

          {/* Información Preventiva */}
          {breedAnalysis.primaryBreed && (
            <div className="bg-green-50 rounded-lg p-6 border-2 border-green-300">
              <h4 className="text-xl font-bold text-tutor-text-primary mb-4">
                📋 Cuidados Preventivos para {breedAnalysis.primaryBreed.name}
              </h4>
              
              {(() => {
                // Usar información preventiva del análisis de IA si está disponible, sino usar función local
                const preventiveInfo = breedAnalysis.preventiveCare || getBreedPreventiveInfo(breedAnalysis.primaryBreed.name);
                return (
                  <>
                    <div className="space-y-4">
                      {preventiveInfo.commonIssues && preventiveInfo.commonIssues.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-tutor-text-primary mb-2">⚠️ Problemas Comunes</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {preventiveInfo.commonIssues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {preventiveInfo.recommendations && preventiveInfo.recommendations.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-tutor-text-primary mb-2">💡 Recomendaciones</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {preventiveInfo.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {preventiveInfo.vaccines && preventiveInfo.vaccines.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-tutor-text-primary mb-2">💉 Vacunación</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {preventiveInfo.vaccines.map((vaccine, idx) => (
                              <li key={idx}>{vaccine}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {preventiveInfo.specialCare && preventiveInfo.specialCare.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-tutor-text-primary mb-2">✨ Cuidados Especiales</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {preventiveInfo.specialCare.map((care, idx) => (
                              <li key={idx}>{care}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <button
            onClick={() => {
              setSelectedImages([]);
              setPreviews([]);
              window.location.reload();
            }}
            className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Analizar Otra Imagen
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tutor-btn-primary mx-auto mb-4"></div>
          <p className="text-tutor-text-secondary">Analizando raza...</p>
        </div>
      )}
    </div>
  );
};

// Componente Detector de Enfermedades
const HealthDetectorTab = ({ selectedPetId, petSpecies, healthAnalysis, loading, onAnalyze, onReset }) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [context, setContext] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showHealthTips, setShowHealthTips] = useState(false);
  const fileInputRef = useRef(null);
  const MAX_IMAGES = 3;

  const processImageFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 10MB por imagen');
      return;
    }
    
    if (selectedImages.length >= MAX_IMAGES) {
      alert(`Máximo ${MAX_IMAGES} imágenes permitidas`);
      return;
    }

    const newImages = [...selectedImages, file];
    setSelectedImages(newImages);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews([...previews, reader.result]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    filesToAdd.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`La imagen ${file.name} es muy grande. Máximo 10MB por imagen`);
        return;
      }
      processImageFile(file);
    });
    
    if (files.length > remainingSlots) {
      alert(`Solo se pueden agregar hasta ${MAX_IMAGES} imágenes. Se agregaron ${remainingSlots} de ${files.length}`);
    }
    
    // Reset input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = '';
  };

  const handleCameraCapture = (file) => {
    setShowCamera(false);
    processImageFile(file);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setPreviews(newPreviews);
  };

  const handleAnalyze = () => {
    if (selectedImages.length > 0) {
      onAnalyze(selectedImages, context);
    }
  };

  const handleBookAppointment = () => {
    window.location.href = '/agendar-cita';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-tutor-text-primary mb-2">
          🏥 Detector de Enfermedades
        </h3>
        <p className="text-tutor-text-secondary">
          Sube hasta 3 fotos para detectar posibles problemas de salud y obtener recomendaciones
        </p>
        <p className="text-xs text-red-600 mt-2">
          ⚠️ Este análisis es orientativo. Siempre consulta con un veterinario para diagnóstico profesional.
        </p>
      </div>

      {/* Recomendaciones para foto de salud */}
      {!healthAnalysis && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg mb-6">
          <button
            onClick={() => setShowHealthTips(!showHealthTips)}
            className="w-full flex items-center justify-between p-4 hover:bg-orange-100 transition rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="text-orange-500 text-xl">💡</div>
              <h4 className="font-semibold text-orange-900 text-left">
                Cómo tomar una buena foto para detectar problemas de salud
              </h4>
            </div>
            <svg
              className={`w-5 h-5 text-orange-600 transition-transform ${showHealthTips ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showHealthTips && (
            <div className="px-4 pb-4 pt-2">
              <ul className="text-sm text-orange-800 space-y-2 list-none mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Área afectada:</strong> Enfócate en la zona específica donde observas el problema (piel, ojo, herida, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Distancia:</strong> Acércate lo suficiente para que la lesión o área sea claramente visible y ocupe una parte importante de la foto</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Iluminación:</strong> Buena luz natural o iluminación clara que permita ver detalles, textura y color real de la piel/pelaje</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Enfoque:</strong> La imagen debe estar muy nítida para poder apreciar detalles de lesiones, cambios de color o textura</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Múltiples ángulos:</strong> Si es posible, toma fotos desde diferentes ángulos de la misma área</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Comparación:</strong> Si hay cambios en la piel, incluye el área afectada y un área normal cercana para comparación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Sin flash directo:</strong> Evita usar flash que pueda crear reflejos o alterar los colores reales</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span><strong>Contexto adicional:</strong> En el campo de texto, describe síntomas, duración del problema y cualquier observación relevante</span>
                </li>
              </ul>
              <div className="mt-3 pt-3 border-t border-orange-300">
                <p className="text-xs text-orange-700 font-semibold mb-1">Ejemplos de áreas a fotografiar:</p>
                <p className="text-xs text-orange-700">
                  Lesiones cutáneas, ojos (si hay secreciones o cambios), orejas (si hay enrojecimiento o secreciones), heridas, masas o bultos, cambios en el pelaje, etc.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selector de imagen */}
      {!healthAnalysis && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {selectedImages.length === 0 ? (
              <>
                <div className="flex gap-4 justify-center mb-4">
                  <button
                    onClick={() => setShowCamera(true)}
                    disabled={selectedImages.length >= MAX_IMAGES}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📷 Tomar Foto
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedImages.length >= MAX_IMAGES}
                    className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🖼️ Elegir de Galería
                  </button>
                </div>
                <p className="text-sm text-gray-500">Puedes subir hasta {MAX_IMAGES} imágenes para mejor precisión</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {showCamera && (
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                  />
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition"
                        title="Eliminar imagen"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Imagen {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 justify-center">
                  {selectedImages.length < MAX_IMAGES && (
                    <>
                      <button
                        onClick={() => setShowCamera(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                      >
                        📷 Agregar Foto
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm"
                      >
                        🖼️ Agregar de Galería
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedImages([]);
                      setPreviews([]);
                    }}
                    className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Limpiar Todo
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {selectedImages.length} de {MAX_IMAGES} imágenes seleccionadas
                </p>
              </div>
            )}
          </div>

          {/* Campo de contexto */}
          {selectedImages.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-tutor-text-primary mb-2">
                📝 Contexto adicional (opcional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Describe síntomas, cambios recientes, duración del problema, comportamiento, etc. (Ej: 'Mi perro tiene un bulto que apareció hace 2 semanas y ha crecido', 'Se rasca constantemente esta zona', 'Tiene problemas para respirar')"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows="4"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {context.length}/500 caracteres. Esta información ayudará a mejorar la precisión del análisis.
              </p>
            </div>
          )}

          {/* Botón de análisis */}
          {selectedImages.length > 0 && (
            <div className="text-center">
              <button
                onClick={handleAnalyze}
                disabled={loading || selectedImages.length === 0}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-semibold"
              >
                {loading ? 'Analizando...' : `🔍 Analizar Salud (${selectedImages.length} imagen${selectedImages.length > 1 ? 'es' : ''})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resultados */}
      {healthAnalysis && (
        <div className="space-y-6">
          {healthAnalysis.hasIssues ? (
            <>
              {/* Estado General */}
              <div className={`rounded-lg p-6 border-2 ${
                healthAnalysis.overallHealth === 'urgente' ? 'bg-red-100 border-red-500' :
                healthAnalysis.overallHealth === 'atención_requerida' ? 'bg-orange-100 border-orange-500' :
                'bg-yellow-100 border-yellow-500'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">
                    {healthAnalysis.overallHealth === 'urgente' ? '🔴' :
                     healthAnalysis.overallHealth === 'atención_requerida' ? '🟠' : '🟡'}
                  </span>
                  <div>
                    <h4 className="text-xl font-bold text-tutor-text-primary">
                      {healthAnalysis.overallHealth === 'urgente' ? 'Atención Urgente Requerida' :
                       healthAnalysis.overallHealth === 'atención_requerida' ? 'Atención Requerida' :
                       'Revisión Recomendada'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {healthAnalysis.recommendation?.timeframe || 'Consulta con un veterinario lo antes posible'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Problemas Detectados */}
              {healthAnalysis.issues && healthAnalysis.issues.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-tutor-text-primary">Problemas Detectados</h4>
                  {healthAnalysis.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-5 border-l-4 ${
                        issue.urgency === 'alto' ? 'bg-red-50 border-red-500' :
                        issue.urgency === 'medio' ? 'bg-orange-50 border-orange-500' :
                        'bg-yellow-50 border-yellow-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-lg text-tutor-text-primary">{issue.type}</h5>
                          {issue.possibleCondition && (
                            <p className="text-sm text-gray-600 mt-1">
                              Posible: {issue.possibleCondition}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="mb-2">
                            <div className="w-24 bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${
                                  issue.confidence >= 70 ? 'bg-red-600' :
                                  issue.confidence >= 40 ? 'bg-orange-500' :
                                  'bg-yellow-500'
                                }`}
                                style={{ width: `${issue.confidence}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{issue.confidence}% de seguridad</p>
                          </div>
                          <span className={`px-3 py-1 text-xs rounded font-semibold ${
                            issue.urgency === 'alto' ? 'bg-red-200 text-red-800' :
                            issue.urgency === 'medio' ? 'bg-orange-200 text-orange-800' :
                            'bg-yellow-200 text-yellow-800'
                          }`}>
                            {issue.urgency === 'alto' ? '🔴 Urgencia Alta' :
                             issue.urgency === 'medio' ? '🟡 Urgencia Media' :
                             '🟢 Urgencia Baja'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">Ubicación:</span> {issue.location}
                        </div>
                        <div>
                          <span className="font-semibold">Descripción:</span> {issue.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Call to Action */}
              {healthAnalysis.recommendation?.shouldSeeVet && (
                <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 text-white shadow-lg">
                  <h4 className="text-2xl font-bold mb-3">⚠️ Consulta Veterinaria Recomendada</h4>
                  <p className="mb-4">
                    {healthAnalysis.recommendation?.recommendedAction || 
                     'Se detectaron problemas que requieren atención profesional. Por favor, agenda una consulta.'}
                  </p>
                  <button
                    onClick={handleBookAppointment}
                    className="w-full px-6 py-4 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition font-bold text-lg shadow-lg"
                  >
                    📅 Agendar Cita con Veterinario
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-green-50 rounded-lg p-6 border-2 border-green-400 text-center">
              <span className="text-4xl mb-4 block">✅</span>
              <h4 className="text-xl font-bold text-green-800 mb-2">No se detectaron problemas visibles</h4>
              <p className="text-green-700">
                {healthAnalysis.notes || 'Tu mascota parece estar en buen estado general según la imagen analizada.'}
              </p>
              <p className="text-sm text-green-600 mt-4">
                💡 Recuerda: Este análisis es orientativo. Mantén las revisiones veterinarias regulares.
              </p>
            </div>
          )}

          {healthAnalysis.notes && healthAnalysis.hasIssues && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-300">
              <p className="text-sm text-blue-800">{healthAnalysis.notes}</p>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedImages([]);
              setPreviews([]);
              setContext('');
              if (onReset) {
                onReset();
              }
            }}
            className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Analizar Otra Imagen
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-tutor-text-secondary">Analizando salud de tu mascota...</p>
        </div>
      )}
    </div>
  );
};

export default PreventiveCareAssistant;

