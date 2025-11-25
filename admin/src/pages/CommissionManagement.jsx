import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, DollarSign, AlertCircle, Info, TrendingUp } from 'lucide-react';

import API_BASE from '../config/api.js';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(value || 0);
};

const CommissionManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [changeReason, setChangeReason] = useState('');

  const serviceTypeLabels = {
    emergency_home: {
      label: 'Urgencia a domicilio',
      description: 'Comisión aplicada a urgencias atendidas en el domicilio del cliente'
    },
    emergency_clinic: {
      label: 'Urgencia presencial',
      description: 'Comisión aplicada a urgencias atendidas en clínica'
    },
    appointment_clinic: {
      label: 'Cita tradicional en clínica',
      description: 'Comisión aplicada a citas agendadas en clínica'
    },
    appointment_home: {
      label: 'Cita tradicional a domicilio',
      description: 'Comisión aplicada a citas agendadas a domicilio'
    },
    teleconsultation: {
      label: 'Teleconsulta',
      description: 'Comisión aplicada a consultas por videollamada'
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/commissions/configs`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Ordenar por tipo de servicio
        const sortedConfigs = response.data.data.sort((a, b) => {
          const order = ['emergency_home', 'emergency_clinic', 'appointment_clinic', 'appointment_home', 'teleconsultation'];
          return order.indexOf(a.serviceType) - order.indexOf(b.serviceType);
        });
        setConfigs(sortedConfigs);
      }
    } catch (err) {
      console.error('Error al cargar configuraciones:', err);
      setError('No se pudieron cargar las configuraciones de comisión');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (serviceType, newAmount) => {
    if (newAmount < 0) {
      setError('El monto de la comisión no puede ser negativo');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE}/api/commissions/config`,
        {
          serviceType,
          commissionAmount: parseFloat(newAmount),
          reason: changeReason || 'Actualización de comisión'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess(`Comisión para ${serviceTypeLabels[serviceType]?.label || serviceType} actualizada exitosamente`);
        setChangeReason('');
        fetchConfigs();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error al actualizar comisión:', err);
      setError(err.response?.data?.message || 'Error al actualizar la comisión');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAll = async () => {
    if (!changeReason.trim()) {
      setError('Por favor, proporciona una razón para el cambio');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const updates = configs.map(config => ({
        serviceType: config.serviceType,
        commissionAmount: parseFloat(config.commissionAmount),
        description: config.description || serviceTypeLabels[config.serviceType]?.description || ''
      }));

      const response = await axios.put(
        `${API_BASE}/api/commissions/configs`,
        {
          configs: updates,
          reason: changeReason
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess('Todas las comisiones han sido actualizadas exitosamente');
        setChangeReason('');
        fetchConfigs();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error al actualizar comisiones:', err);
      setError(err.response?.data?.message || 'Error al actualizar las comisiones');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (index, field, value) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="text-blue-600" />
              Gestión de Comisiones
            </h1>
            <p className="text-gray-600 mt-1">
              Configura el monto de comisión que se descuenta a los veterinarios por cada servicio
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>La comisión se descuenta del precio total que paga el cliente</li>
                <li>El veterinario recibe: Precio Total - Comisión</li>
                <li>Los pagos a veterinarios se realizan el día 5 de cada mes</li>
                <li>Los cambios afectarán a los servicios completados después de la actualización</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mensajes de éxito/error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="text-green-600" size={20} />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Razón del cambio (para actualización masiva) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Razón del cambio (para auditoría)
          </label>
          <input
            type="text"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Ej: Ajuste de comisiones según nueva política"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabla de configuraciones */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Servicio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comisión Actual (CLP)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nueva Comisión (CLP)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((config, index) => (
                <tr key={config.serviceType} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {serviceTypeLabels[config.serviceType]?.label || config.serviceType}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600 max-w-md">
                      {serviceTypeLabels[config.serviceType]?.description || config.description || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(config.commissionAmount)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={config.commissionAmount || ''}
                      onChange={(e) => handleConfigChange(index, 'commissionAmount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleUpdateConfig(config.serviceType, config.commissionAmount)}
                      disabled={saving || !changeReason.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {saving ? 'Guardando...' : 'Actualizar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botón para actualizar todas */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpdateAll}
            disabled={saving || !changeReason.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Actualizar Todas las Comisiones'}
          </button>
        </div>

        {/* Historial de cambios (si está disponible) */}
        {configs.some(c => c.changeHistory && c.changeHistory.length > 0) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Historial de Cambios
            </h2>
            <div className="space-y-4">
              {configs.map((config) => {
                if (!config.changeHistory || config.changeHistory.length === 0) return null;
                
                return (
                  <div key={config.serviceType} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {serviceTypeLabels[config.serviceType]?.label || config.serviceType}
                    </h3>
                    <div className="space-y-2">
                      {config.changeHistory.slice(-5).reverse().map((change, idx) => (
                        <div key={idx} className="text-sm text-gray-600 border-l-2 border-blue-500 pl-3">
                          <p>
                            <span className="font-medium">{formatCurrency(change.oldAmount)}</span>
                            {' → '}
                            <span className="font-medium text-blue-600">{formatCurrency(change.newAmount)}</span>
                            {' - '}
                            {new Date(change.changedAt).toLocaleDateString('es-CL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {change.reason && (
                            <p className="text-xs text-gray-500 mt-1">Razón: {change.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionManagement;

