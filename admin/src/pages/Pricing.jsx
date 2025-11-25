import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Save, DollarSign, AlertCircle } from 'lucide-react';

const Pricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const [pricing, setPricing] = useState({
    emergency: {
      independent: {
        home: {
          normalHours: 19990,
          peakHours: 24990
        }
      },
      clinic: {
        home: {
          normalHours: 24990,
          peakHours: 29990
        },
        clinic: {
          normalHours: 24990,
          peakHours: 29990
        }
      },
      peakHoursRange: {
        start: 20,
        end: 8
      },
      distanceSurchargePerKm: 4500
    },
    appointments: {
      independent: {
        clinicVisit: 20000,
        homeVisit: 35000,
        teleconsultation: 0
      },
      clinic: {
        clinicVisit: 25000,
        homeVisit: 40000,
        teleconsultation: 0
      }
    }
  });

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5555/api/pricing', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success && response.data.data) {
          // Migrar estructura antigua a nueva si es necesario
          const data = response.data.data;
          const migratedData = {
            ...data,
            emergency: {
              ...data.emergency,
              independent: {
                home: data.emergency?.independent?.home || {
                  normalHours: data.emergency?.independent?.normalHours || data.emergency?.independent?.home?.normalHours || 19990,
                  peakHours: data.emergency?.independent?.peakHours || data.emergency?.independent?.home?.peakHours || 24990
                }
              },
              clinic: {
                home: data.emergency?.clinic?.home || {
                  normalHours: data.emergency?.clinic?.normalHours || data.emergency?.clinic?.home?.normalHours || 24990,
                  peakHours: data.emergency?.clinic?.peakHours || data.emergency?.clinic?.home?.peakHours || 29990
                },
                clinic: data.emergency?.clinic?.clinic || {
                  normalHours: data.emergency?.clinic?.normalHours || data.emergency?.clinic?.clinic?.normalHours || 24990,
                  peakHours: data.emergency?.clinic?.peakHours || data.emergency?.clinic?.clinic?.peakHours || 29990
                }
              },
              peakHoursRange: data.emergency?.peakHoursRange || {
                start: 20,
                end: 8
              },
              distanceSurchargePerKm: data.emergency?.distanceSurchargePerKm || 4500
            }
          };
          setPricing(migratedData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching pricing:', err);
        if ([401, 403].includes(err.response?.status)) {
          localStorage.clear();
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Error al cargar configuración de precios');
          setLoading(false);
        }
      }
    };

    fetchPricing();
  }, [navigate]);

  const handleChange = (path, value) => {
    const keys = path.split('.');
    setPricing(prev => {
      const newPricing = JSON.parse(JSON.stringify(prev)); // Deep clone
      let current = newPricing;
      
      // Crear objetos anidados si no existen
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        } else if (typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        if (i < keys.length - 2) {
          current[keys[i]] = { ...current[keys[i]] };
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value === '' ? 0 : Number(value);
      return newPricing;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.put('http://localhost:5555/api/pricing', pricing, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSuccess('Configuración de precios actualizada exitosamente');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Error updating pricing:', err);
      setError(err.response?.data?.message || 'Error al actualizar configuración de precios');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Configuración de Precios</h1>
        </div>
        <p className="text-gray-600">
          Establece los valores para servicios de urgencia y citas médicas tradicionales
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Urgencias Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">
            Servicios de Urgencia
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Configura los precios para servicios de urgencia según tipo de veterinario y horario
          </p>

          {/* Independientes - Urgencias */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Veterinarios Independientes</h3>
            <p className="text-xs text-gray-500 mb-3 italic">
              Los veterinarios independientes solo ofrecen urgencias a domicilio.
            </p>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Urgencia a Domicilio</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horario Normal
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={pricing.emergency?.independent?.home?.normalHours || 19990}
                      onChange={(e) => handleChange('emergency.independent.home.normalHours', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(pricing.emergency?.independent?.home?.normalHours || 19990)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Punta
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={pricing.emergency?.independent?.home?.peakHours || 24990}
                      onChange={(e) => handleChange('emergency.independent.home.peakHours', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(pricing.emergency?.independent?.home?.peakHours || 24990)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Clínicas - Urgencias */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Clínicas</h3>
            <p className="text-xs text-gray-500 mb-3">
              Las clínicas ofrecen urgencias tanto a domicilio como presenciales en la clínica.
            </p>
            
            {/* Urgencias a Domicilio */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Urgencia a Domicilio</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horario Normal
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={pricing.emergency?.clinic?.home?.normalHours || 24990}
                      onChange={(e) => handleChange('emergency.clinic.home.normalHours', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(pricing.emergency?.clinic?.home?.normalHours || 24990)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Punta
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={pricing.emergency?.clinic?.home?.peakHours || 29990}
                      onChange={(e) => handleChange('emergency.clinic.home.peakHours', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(pricing.emergency?.clinic?.home?.peakHours || 29990)}
                  </p>
                </div>
              </div>
            </div>

            {/* Urgencias Presenciales en Clínica */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Urgencia Presencial en Clínica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horario Normal
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={pricing.emergency?.clinic?.clinic?.normalHours || 24990}
                      onChange={(e) => handleChange('emergency.clinic.clinic.normalHours', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(pricing.emergency?.clinic?.clinic?.normalHours || 24990)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Punta
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={pricing.emergency?.clinic?.clinic?.peakHours || 29990}
                      onChange={(e) => handleChange('emergency.clinic.clinic.peakHours', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(pricing.emergency?.clinic?.clinic?.peakHours || 29990)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de Hora Punta */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-700 mb-3">Rango de Hora Punta</h3>
            <p className="text-sm text-gray-600 mb-3">
              Define el horario considerado como "hora punta" (valores de 0 a 23)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora Inicio
                </label>
                <input
                  type="number"
                  value={pricing.emergency.peakHoursRange.start}
                  onChange={(e) => handleChange('emergency.peakHoursRange.start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="23"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplo: 20 = 8:00 PM
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora Fin
                </label>
                <input
                  type="number"
                  value={pricing.emergency.peakHoursRange.end}
                  onChange={(e) => handleChange('emergency.peakHoursRange.end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="23"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplo: 8 = 8:00 AM (puede cruzar medianoche)
                </p>
              </div>
            </div>
          </div>

          {/* Recargo por Distancia */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Recargo por Distancia</h3>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recargo por Kilómetro (solo domicilio)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={pricing.emergency.distanceSurchargePerKm}
                  onChange={(e) => handleChange('emergency.distanceSurchargePerKm', e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="100"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(pricing.emergency.distanceSurchargePerKm)} por km
              </p>
            </div>
          </div>
        </div>

        {/* Citas Tradicionales Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">
            Citas Médicas Tradicionales
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Configura los precios para citas programadas según tipo de veterinario y modalidad
          </p>

          {/* Independientes - Citas */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Veterinarios Independientes</h3>
            <p className="text-xs text-gray-500 mb-3 italic">
              Nota: Los veterinarios independientes no ofrecen consulta en clínica, solo a domicilio y teleconsulta.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consulta a Domicilio
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricing.appointments.independent.homeVisit}
                    onChange={(e) => handleChange('appointments.independent.homeVisit', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(pricing.appointments.independent.homeVisit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teleconsulta
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricing.appointments.independent.teleconsultation}
                    onChange={(e) => handleChange('appointments.independent.teleconsultation', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(pricing.appointments.independent.teleconsultation)}
                </p>
              </div>
            </div>
          </div>

          {/* Clínicas - Citas */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Clínicas (Valores Mayores)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consulta en Clínica
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricing.appointments.clinic.clinicVisit}
                    onChange={(e) => handleChange('appointments.clinic.clinicVisit', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(pricing.appointments.clinic.clinicVisit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consulta a Domicilio
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricing.appointments.clinic.homeVisit}
                    onChange={(e) => handleChange('appointments.clinic.homeVisit', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(pricing.appointments.clinic.homeVisit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teleconsulta
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricing.appointments.clinic.teleconsultation}
                    onChange={(e) => handleChange('appointments.clinic.teleconsultation', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(pricing.appointments.clinic.teleconsultation)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Pricing;
