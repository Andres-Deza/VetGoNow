import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Users,
  Stethoscope,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Activity,
  Heart,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  Timer,
  Navigation,
  CheckCircle2
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [emergencyTimeStats, setEmergencyTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEmergencyStats, setLoadingEmergencyStats] = useState(true);
  const [error, setError] = useState(null);
  const [emergencyStatsError, setEmergencyStatsError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const { data } = await axios.get(
          "http://localhost:5555/api/admin/dashboard/stats",
          config
        );

        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchEmergencyTimeStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const { data } = await axios.get(
          "http://localhost:5555/api/admin/emergencies/time-stats",
          config
        );

        if (data.success) {
          setEmergencyTimeStats(data.stats);
        }
      } catch (err) {
        console.error("Error fetching emergency time stats:", err);
        setEmergencyStatsError(err.response?.data?.message || err.message);
      } finally {
        setLoadingEmergencyStats(false);
      }
    };

    fetchEmergencyTimeStats();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-semibold">
        Cargando estadísticas...
      </div>
    );
  if (error)
    return (
      <div className="text-red-600 text-center text-xl font-semibold mt-10 p-4">
        {error}
      </div>
    );

  if (!stats) {
    return (
      <div className="p-4 text-center text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  // Datos para gráfico de citas por día
  const appointmentsChartData = {
    labels: stats.appointmentsByDay?.map(item => {
      try {
        // item._id es un string en formato 'YYYY-MM-DD'
        const [year, month, day] = item._id.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
      } catch (e) {
        return item._id;
      }
    }) || [],
    datasets: [
      {
        label: "Citas",
        data: stats.appointmentsByDay?.map(item => item.count) || [],
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Datos para gráfico de citas por tipo
  const appointmentsByTypeData = {
    labels: ["Consulta en Clínica", "Teleconsulta", "Consulta a Domicilio"],
    datasets: [
      {
        data: [
          stats.appointmentsByType?.['clinic visit'] || 0,
          stats.appointmentsByType?.['online consultation'] || 0,
          stats.appointmentsByType?.['home visit'] || 0,
        ],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 191, 36, 0.8)",
        ],
        borderColor: [
          "rgba(59, 130, 246, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(251, 191, 36, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  // Datos para gráfico de citas por estado
  const appointmentsByStatusData = {
    labels: ["Completadas", "Programadas", "Pendientes", "Canceladas", "En Progreso"],
    datasets: [
      {
        label: "Citas",
        data: [
          stats.appointmentsByStatus?.completed || 0,
          stats.appointmentsByStatus?.scheduled || 0,
          stats.appointmentsByStatus?.pending || 0,
          (stats.appointmentsByStatus?.cancelled || 0) + 
          (stats.appointmentsByStatus?.cancelled_by_vet_on_time || 0) +
          (stats.appointmentsByStatus?.cancelled_late_by_vet || 0) +
          (stats.appointmentsByStatus?.cancelled_by_tutor || 0),
          stats.appointmentsByStatus?.in_progress || 0,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(168, 85, 247, 0.8)",
        ],
        borderColor: [
          "rgba(34, 197, 94, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(251, 191, 36, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(168, 85, 247, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  // Datos para top veterinarios
  const topVetsData = {
    labels: stats.topVetsByAppointments?.slice(0, 5).map(v => v.vetName) || [],
    datasets: [
      {
        label: "Total Citas",
        data: stats.topVetsByAppointments?.slice(0, 5).map(v => v.totalAppointments) || [],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
      },
    ],
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-2 md:p-4 lg:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Panel de Control</h1>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Usuarios */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl md:text-3xl font-bold">{stats.totals?.users || 0}</p>
              {stats.growth?.newUsersLast30Days > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +{stats.growth.newUsersLast30Days} últimos 30 días
                </p>
              )}
            </div>
            <Users className="w-8 h-8 md:w-10 md:h-10 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        {/* Total Veterinarios */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Veterinarios</p>
              <p className="text-2xl md:text-3xl font-bold">{stats.totals?.vets || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totals?.clinics || 0} clínicas, {stats.totals?.independentVets || 0} independientes
              </p>
              {stats.growth?.newVetsLast30Days > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +{stats.growth.newVetsLast30Days} últimos 30 días
                </p>
              )}
            </div>
            <Stethoscope className="w-8 h-8 md:w-10 md:h-10 text-green-500 flex-shrink-0" />
          </div>
        </div>

        {/* Total Citas */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Citas</p>
              <p className="text-2xl md:text-3xl font-bold">{stats.totals?.appointments || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.appointmentsByPeriod?.today || 0} hoy
              </p>
              {stats.growth?.newAppointmentsLast30Days > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +{stats.growth.newAppointmentsLast30Days} últimos 30 días
                </p>
              )}
            </div>
            <Calendar className="w-8 h-8 md:w-10 md:h-10 text-purple-500 flex-shrink-0" />
          </div>
        </div>

        {/* Total Urgencias */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Urgencias</p>
              <p className="text-2xl md:text-3xl font-bold">{stats.totals?.emergencies || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Tasa aceptación: {stats.emergencies?.acceptanceRate || 0}%
              </p>
            </div>
            <Heart className="w-8 h-8 md:w-10 md:h-10 text-red-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Segunda fila de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Totales */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-lg md:text-xl font-bold">{formatCurrency(stats.revenue?.total || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Este mes: {formatCurrency(stats.revenue?.thisMonth || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 flex-shrink-0" />
          </div>
        </div>

        {/* Veterinarios Pendientes */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Pendientes Aprobación</p>
              <p className="text-2xl md:text-3xl font-bold">{stats.vets?.pendingApproval || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.vets?.pendingVerification || 0} pendientes verificación
              </p>
            </div>
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-orange-500 flex-shrink-0" />
          </div>
        </div>

        {/* Tasa de Completación */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Tasa de Completación</p>
              <p className="text-2xl md:text-3xl font-bold">{stats.rates?.completionRate || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">
                Cancelación: {stats.rates?.cancellationRate || 0}%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-500 flex-shrink-0" />
          </div>
        </div>

        {/* Tasa de Conversión */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Tasa de Conversión</p>
              <p className="text-2xl md:text-3xl font-bold">{stats.rates?.conversionRate || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">
                Usuarios activos
              </p>
            </div>
            <Activity className="w-8 h-8 md:w-10 md:h-10 text-indigo-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de citas por día */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Citas - Últimos 30 Días</h2>
          <div className="h-64 md:h-80">
            <Line
              data={appointmentsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          </div>
        </div>

        {/* Gráfico de citas por tipo */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Distribución por Tipo de Consulta</h2>
          <div className="h-64 md:h-80">
            <Doughnut
              data={appointmentsByTypeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Gráfico de citas por estado y Top veterinarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de citas por estado */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Citas por Estado</h2>
          <div className="h-64 md:h-80">
            <Bar
              data={appointmentsByStatusData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          </div>
        </div>

        {/* Top veterinarios */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Top 5 Veterinarios por Citas</h2>
          <div className="h-64 md:h-80">
            <Bar
              data={topVetsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: { beginAtZero: true }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Tablas de rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Veterinarios */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Top Veterinarios</h2>
          
          {/* Mobile: Card View */}
          <div className="md:hidden space-y-3">
            {stats.topVetsByAppointments?.slice(0, 10).map((vet, index) => (
              <div key={vet.vetId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{vet.vetName}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                      vet.vetType === 'clinic' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {vet.vetType === 'clinic' ? 'Clínica' : 'Independiente'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Total Citas</p>
                    <p className="text-sm font-semibold text-gray-900">{vet.totalAppointments}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Completadas</p>
                    <p className="text-sm font-semibold text-green-600">{vet.completedAppointments}</p>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-gray-500 py-4">
                No hay datos disponibles
              </div>
            )}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Veterinario</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Tipo</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Total Citas</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Completadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.topVetsByAppointments?.slice(0, 10).map((vet, index) => (
                  <tr key={vet.vetId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-900">{vet.vetName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        vet.vetType === 'clinic' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {vet.vetType === 'clinic' ? 'Clínica' : 'Independiente'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{vet.totalAppointments}</td>
                    <td className="px-3 py-2 text-right text-green-600">{vet.completedAppointments}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="4" className="px-3 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Usuarios y Regiones */}
        <div className="space-y-6">
          {/* Top Usuarios */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Top Usuarios</h2>
            <div className="space-y-2">
              {stats.topUsersByAppointments?.slice(0, 5).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">#{index + 1}</span>
                    <span className="font-medium text-gray-900">{user.userName}</span>
                  </div>
                  <span className="font-semibold text-blue-600">{user.totalAppointments} citas</span>
                </div>
              )) || (
                <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
              )}
            </div>
          </div>

          {/* Top Regiones */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Regiones Más Activas</h2>
            <div className="space-y-2">
              {stats.topRegions?.slice(0, 5).map((region, index) => (
                <div key={region._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{region._id || 'Sin región'}</span>
                  </div>
                  <span className="font-semibold text-green-600">{region.vetCount} veterinarios</span>
                </div>
              )) || (
                <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Estadísticas de Veterinarios */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-green-500" />
            Veterinarios
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Aprobados</span>
              <span className="font-semibold text-green-600">{stats.vets?.approved || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pendientes</span>
              <span className="font-semibold text-orange-600">{stats.vets?.pendingApproval || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verificados</span>
              <span className="font-semibold text-blue-600">{stats.vets?.verified || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Con Urgencias</span>
              <span className="font-semibold text-red-600">{stats.vets?.withEmergencySupport || 0}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas de Citas */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Citas por Período
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Hoy</span>
              <span className="font-semibold">{stats.appointmentsByPeriod?.today || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Esta Semana</span>
              <span className="font-semibold">{stats.appointmentsByPeriod?.thisWeek || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Este Mes</span>
              <span className="font-semibold">{stats.appointmentsByPeriod?.thisMonth || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Últimos 30 días</span>
              <span className="font-semibold">{stats.appointmentsByPeriod?.last30Days || 0}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas de Urgencias */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Urgencias
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold">{stats.emergencies?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completadas</span>
              <span className="font-semibold text-green-600">{stats.emergencies?.byStatus?.completed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">En Progreso</span>
              <span className="font-semibold text-blue-600">{stats.emergencies?.byStatus?.in_progress || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tasa Aceptación</span>
              <span className="font-semibold text-purple-600">{stats.emergencies?.acceptanceRate || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas de Tiempos de Urgencias a Domicilio */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Timer className="w-6 h-6 text-red-500" />
          Tiempos de Respuesta - Urgencias a Domicilio
        </h2>

        {loadingEmergencyStats ? (
          <div className="text-center py-8 text-gray-500">
            Cargando estadísticas de tiempos...
          </div>
        ) : emergencyStatsError ? (
          <div className="text-center py-8 text-red-600">
            Error al cargar estadísticas: {emergencyStatsError}
          </div>
        ) : !emergencyTimeStats || emergencyTimeStats.totalEmergencies === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay urgencias a domicilio completadas aún para mostrar estadísticas.
          </div>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Tiempo promedio hasta aceptación */}
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Hasta Aceptación</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {emergencyTimeStats.averages?.timeToAccept || 0} min
                    </p>
                    {emergencyTimeStats.minimums?.timeToAccept && emergencyTimeStats.maximums?.timeToAccept && (
                      <p className="text-xs text-gray-500 mt-1">
                        {emergencyTimeStats.minimums.timeToAccept} - {emergencyTimeStats.maximums.timeToAccept} min
                      </p>
                    )}
                  </div>
                  <Clock className="w-8 h-8 text-blue-500 flex-shrink-0" />
                </div>
              </div>

              {/* Tiempo promedio hasta llegada */}
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Hasta Llegada</p>
                    <p className="text-2xl font-bold text-green-700">
                      {emergencyTimeStats.averages?.timeToArrive || 0} min
                    </p>
                    {emergencyTimeStats.minimums?.timeToArrive && emergencyTimeStats.maximums?.timeToArrive && (
                      <p className="text-xs text-gray-500 mt-1">
                        {emergencyTimeStats.minimums.timeToArrive} - {emergencyTimeStats.maximums.timeToArrive} min
                      </p>
                    )}
                  </div>
                  <Navigation className="w-8 h-8 text-green-500 flex-shrink-0" />
                </div>
              </div>

              {/* Tiempo promedio de atención */}
              <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Tiempo de Atención</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {emergencyTimeStats.averages?.timeToComplete || 0} min
                    </p>
                    {emergencyTimeStats.minimums?.timeToComplete && emergencyTimeStats.maximums?.timeToComplete && (
                      <p className="text-xs text-gray-500 mt-1">
                        {emergencyTimeStats.minimums.timeToComplete} - {emergencyTimeStats.maximums.timeToComplete} min
                      </p>
                    )}
                  </div>
                  <Stethoscope className="w-8 h-8 text-purple-500 flex-shrink-0" />
                </div>
              </div>

              {/* Tiempo total promedio */}
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Tiempo Total</p>
                    <p className="text-2xl font-bold text-red-700">
                      {emergencyTimeStats.averages?.totalTime || 0} min
                    </p>
                    {emergencyTimeStats.minimums?.totalTime && emergencyTimeStats.maximums?.totalTime && (
                      <p className="text-xs text-gray-500 mt-1">
                        {emergencyTimeStats.minimums.totalTime} - {emergencyTimeStats.maximums.totalTime} min
                      </p>
                    )}
                  </div>
                  <Timer className="w-8 h-8 text-red-500 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Estadísticas por veterinario */}
            {emergencyTimeStats.byVet && emergencyTimeStats.byVet.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Desempeño por Veterinario</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Veterinario</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Tipo</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Cantidad</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Prom. Aceptación</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Prom. Llegada</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Prom. Atención</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Prom. Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {emergencyTimeStats.byVet.map((vet, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{vet.vetName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              vet.vetType === 'clinic' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {vet.vetType === 'clinic' ? 'Clínica' : 'Independiente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{vet.count}</td>
                          <td className="px-4 py-3 text-right">
                            {vet.avgTimeToAccept !== null ? `${vet.avgTimeToAccept} min` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {vet.avgTimeToArrive !== null ? `${vet.avgTimeToArrive} min` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {vet.avgTimeToComplete !== null ? `${vet.avgTimeToComplete} min` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">
                            {vet.avgTotalTime} min
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Resumen general */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Total de urgencias analizadas:</strong> {emergencyTimeStats.totalEmergencies}
                {emergencyTimeStats.medians && (
                  <>
                    {" • "}
                    <strong>Mediana total:</strong> {emergencyTimeStats.medians.totalTime} minutos
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;