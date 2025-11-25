import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaDollarSign, FaCreditCard, FaCalendarAlt, FaCheckCircle, FaClock, FaBan, FaUniversity } from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(value || 0);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const VetEarningsPage = () => {
  const [summary, setSummary] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountNumber: '',
    accountType: 'checking',
    bankName: '',
    accountHolderName: '',
    rut: ''
  });
  const [submittingBank, setSubmittingBank] = useState(false);
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    fetchEarningsSummary();
    fetchEarnings();
  }, [monthFilter]);

  const fetchEarningsSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/vet/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSummary(response.data.data);
        // Si no tiene cuenta bancaria, mostrar formulario
        if (!response.data.data.bankAccount) {
          setShowBankForm(true);
        }
        // Pre-llenar formulario si tiene cuenta
        if (response.data.data.bankAccount) {
          setBankForm({
            accountNumber: response.data.data.bankAccount.accountNumber || '',
            accountType: response.data.data.bankAccount.accountType || 'checking',
            bankName: response.data.data.bankAccount.bankName || '',
            accountHolderName: response.data.data.bankAccount.accountHolderName || '',
            rut: ''
          });
        }
      }
    } catch (err) {
      console.error('Error al obtener resumen de ganancias:', err);
      setError('No se pudo cargar el resumen de ganancias');
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (monthFilter) {
        const [year, month] = monthFilter.split('-');
        params.year = year;
        params.month = month;
      }
      
      const response = await axios.get(`${API_BASE}/api/vet/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      if (response.data.success) {
        setEarnings(response.data.data.earnings || []);
      }
    } catch (err) {
      console.error('Error al obtener ganancias:', err);
    }
  };

  const handleUpdateBankAccount = async (e) => {
    e.preventDefault();
    setSubmittingBank(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE}/api/vet/bank-account`, bankForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert('Información bancaria actualizada exitosamente');
        setShowBankForm(false);
        fetchEarningsSummary();
      }
    } catch (err) {
      console.error('Error al actualizar cuenta bancaria:', err);
      alert(err.response?.data?.message || 'Error al actualizar información bancaria');
    } finally {
      setSubmittingBank(false);
    }
  };

  const getServiceTypeLabel = (serviceType) => {
    const labels = {
      emergency_home: 'Urgencia a domicilio',
      emergency_clinic: 'Urgencia presencial',
      appointment_clinic: 'Cita en clínica',
      appointment_home: 'Cita a domicilio',
      teleconsultation: 'Teleconsulta'
    };
    return labels[serviceType] || serviceType;
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: FaClock, label: 'Pendiente' },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: FaCalendarAlt, label: 'Programado' },
      paid: { color: 'bg-green-100 text-green-800', icon: FaCheckCircle, label: 'Pagado' },
      failed: { color: 'bg-red-100 text-red-800', icon: FaBan, label: 'Fallido' }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="text-xs" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando ganancias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Ganancias</h1>

        {/* Resumen */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendiente este mes</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.currentMonth?.pendingEarnings || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">{summary.currentMonth?.pendingServices || 0} servicios</p>
                </div>
                <FaClock className="text-3xl text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total pagado</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalPaid || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">{summary.totalPaidServices || 0} servicios</p>
                </div>
                <FaCheckCircle className="text-3xl text-green-600" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Próximo pago</p>
                  <p className="text-lg font-bold text-purple-900">
                    {summary.currentMonth?.nextPaymentDate 
                      ? formatDate(summary.currentMonth.nextPaymentDate)
                      : 'No disponible'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Día 5 del mes siguiente</p>
                </div>
                <FaCalendarAlt className="text-3xl text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Información bancaria */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FaUniversity />
              Información bancaria
            </h2>
            <button
              onClick={() => setShowBankForm(!showBankForm)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showBankForm ? 'Cancelar' : summary?.bankAccount ? 'Editar' : 'Agregar'}
            </button>
          </div>

          {showBankForm ? (
            <form onSubmit={handleUpdateBankAccount} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de cuenta
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de cuenta
                  </label>
                  <select
                    value={bankForm.accountType}
                    onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="checking">Cuenta corriente</option>
                    <option value="savings">Cuenta de ahorros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del titular
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountHolderName}
                    onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT del titular (opcional)
                  </label>
                  <input
                    type="text"
                    value={bankForm.rut}
                    onChange={(e) => setBankForm({ ...bankForm, rut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12.345.678-9"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingBank}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingBank ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          ) : summary?.bankAccount ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Banco:</span> {summary.bankAccount.bankName}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Cuenta:</span> {summary.bankAccount.accountNumber}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Tipo:</span> {summary.bankAccount.accountType === 'checking' ? 'Cuenta corriente' : 'Cuenta de ahorros'}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Titular:</span> {summary.bankAccount.accountHolderName}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">
              No has agregado información bancaria. Por favor agrega tu cuenta para recibir los pagos.
            </p>
          )}
        </div>

        {/* Filtro por mes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por mes
          </label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {monthFilter && (
            <button
              onClick={() => setMonthFilter('')}
              className="ml-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {/* Lista de ganancias */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comisión
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ganancia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No hay ganancias registradas para este período
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => (
                  <tr key={earning._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(earning.serviceDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getServiceTypeLabel(earning.serviceType)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(earning.totalPrice)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">
                      -{formatCurrency(earning.commissionAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      {formatCurrency(earning.vetEarnings)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getPaymentStatusBadge(earning.paymentStatus)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VetEarningsPage;

