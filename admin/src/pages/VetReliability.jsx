import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { CSVLink } from 'react-csv';
import { AlertTriangle, CheckCircle, XCircle, TrendingDown, TrendingUp, Activity, Download } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const VetReliability = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterScore, setFilterScore] = useState('all');
  const [sortBy, setSortBy] = useState('reliabilityScore');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(
          'http://localhost:5555/api/admin/vets/reliability-stats',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err.response?.data?.message || 'Error al cargar estadísticas');
        if ([401, 403].includes(err.response?.status)) {
          localStorage.clear();
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-semibold">
        Cargando estadísticas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center text-xl font-semibold mt-10 p-4">
        {error}
      </div>
    );
  }

  if (!stats) {
    return <div className="p-4">No hay datos disponibles</div>;
  }

  // Filtrar y ordenar veterinarios
  const filteredVets = stats.vets
    .filter(vet => {
      if (filterScore === 'high') return (vet.reliability?.reliabilityScore || 100) >= 80;
      if (filterScore === 'medium') return (vet.reliability?.reliabilityScore || 100) >= 50 && (vet.reliability?.reliabilityScore || 100) < 80;
      if (filterScore === 'low') return (vet.reliability?.reliabilityScore || 100) < 50;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'reliabilityScore') {
        return (b.reliability?.reliabilityScore || 100) - (a.reliability?.reliabilityScore || 100);
      }
      if (sortBy === 'totalAppointments') {
        return (b.stats?.totalAppointments || 0) - (a.stats?.totalAppointments || 0);
      }
      if (sortBy === 'emergencyIncidents') {
        return (b.stats?.emergencyIncidents || 0) - (a.stats?.emergencyIncidents || 0);
      }
      if (sortBy === 'lateCancellations') {
        return (b.stats?.lateCancellations || 0) - (a.stats?.lateCancellations || 0);
      }
      return 0;
    });

  // Datos para gráfico de barras de score de confiabilidad
  const reliabilityBarData = {
    labels: filteredVets.slice(0, 10).map(v => v.name),
    datasets: [
      {
        label: 'Score de Confiabilidad',
        data: filteredVets.slice(0, 10).map(v => v.reliability?.reliabilityScore || 100),
        backgroundColor: filteredVets.slice(0, 10).map(v => {
          const score = v.reliability?.reliabilityScore || 100;
          if (score >= 80) return 'rgba(34, 197, 94, 0.8)'; // Verde
          if (score >= 50) return 'rgba(251, 191, 36, 0.8)'; // Amarillo
          return 'rgba(239, 68, 68, 0.8)'; // Rojo
        }),
        borderColor: filteredVets.slice(0, 10).map(v => {
          const score = v.reliability?.reliabilityScore || 100;
          if (score >= 80) return 'rgba(34, 197, 94, 1)';
          if (score >= 50) return 'rgba(251, 191, 36, 1)';
          return 'rgba(239, 68, 68, 1)';
        }),
        borderWidth: 2
      }
    ]
  };

  // Datos para gráfico de dona de distribución de scores
  const scoreDistribution = {
    high: filteredVets.filter(v => (v.reliability?.reliabilityScore || 100) >= 80).length,
    medium: filteredVets.filter(v => {
      const score = v.reliability?.reliabilityScore || 100;
      return score >= 50 && score < 80;
    }).length,
    low: filteredVets.filter(v => (v.reliability?.reliabilityScore || 100) < 50).length
  };

  const distributionData = {
    labels: ['Alto (≥80)', 'Medio (50-79)', 'Bajo (&lt;50)'],
    datasets: [
      {
        data: [scoreDistribution.high, scoreDistribution.medium, scoreDistribution.low],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Datos para gráfico de incidentes de urgencias
  const emergencyIncidentsData = {
    labels: filteredVets
      .filter(v => (v.stats?.emergencyIncidents || 0) > 0)
      .slice(0, 10)
      .map(v => v.name),
    datasets: [
      {
        label: 'Incidentes de Urgencias',
        data: filteredVets
          .filter(v => (v.stats?.emergencyIncidents || 0) > 0)
          .slice(0, 10)
          .map(v => v.stats?.emergencyIncidents || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2
      }
    ]
  };

  // Datos para gráfico de cancelaciones (tardías vs a tiempo)
  const topCancellations = filteredVets
    .filter(v => (v.stats?.lateCancellations || 0) > 0 || (v.stats?.onTimeCancellations || 0) > 0)
    .slice(0, 10);

  const cancellationsData = {
    labels: topCancellations.map(v => v.name),
    datasets: [
      {
        label: 'Cancelaciones Tardías',
        data: topCancellations.map(v => v.stats?.lateCancellations || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2
      },
      {
        label: 'Cancelaciones a Tiempo',
        data: topCancellations.map(v => v.stats?.onTimeCancellations || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2
      }
    ]
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 50) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  // Preparar datos para CSV
  const csvData = filteredVets.map(vet => ({
    'Veterinario': vet.name,
    'Email': vet.email,
    'Teléfono': vet.phoneNumber,
    'Tipo': vet.vetType === 'clinic' ? 'Clínica' : 'Independiente',
    'Score Confiabilidad': vet.reliability?.reliabilityScore || 100,
    'Citas Totales': vet.stats?.totalAppointments || 0,
    'Citas Completadas': vet.stats?.completedAppointments || 0,
    'Cancelaciones Tardías': vet.stats?.lateCancellations || 0,
    'Cancelaciones a Tiempo': vet.stats?.onTimeCancellations || 0,
    'Urgencias Totales': vet.stats?.totalEmergencies || 0,
    'Rechazos Urgencias': vet.stats?.emergencyRejections || 0,
    'Incidentes Urgencias': vet.stats?.emergencyIncidents || 0,
    'Tasa de Éxito (%)': vet.stats?.successRate || 0,
    'Tasa Incidentes Urgencias (%)': vet.stats?.emergencyIncidentRate || 0
  }));

  return (
    <div className="p-2 md:p-4 lg:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Estadísticas de Confiabilidad de Veterinarios</h1>
        <CSVLink
          data={csvData}
          filename={`vet-reliability-stats-${new Date().toISOString().split('T')[0]}.csv`}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base"
        >
          <Download className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Exportar CSV</span>
          <span className="sm:hidden">CSV</span>
        </CSVLink>
      </div>

      {/* Alertas de casos que requieren atención */}
      {(() => {
        const criticalVets = filteredVets.filter(v => {
          const score = v.reliability?.reliabilityScore || 100;
          const incidents = v.stats?.emergencyIncidents || 0;
          const lateCancels = v.stats?.lateCancellations || 0;
          return score < 50 || incidents >= 3 || lateCancels >= 5;
        });

        if (criticalVets.length > 0) {
          return (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 md:p-4 mb-4 md:mb-6 rounded-lg">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                <h2 className="text-base md:text-lg font-semibold text-red-900">Casos que Requieren Atención</h2>
              </div>
              <div className="space-y-2">
                {criticalVets.slice(0, 5).map(vet => {
                  const score = vet.reliability?.reliabilityScore || 100;
                  const incidents = vet.stats?.emergencyIncidents || 0;
                  const lateCancels = vet.stats?.lateCancellations || 0;
                  return (
                    <div key={vet._id} className="bg-white p-2 md:p-3 rounded border border-red-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm md:text-base text-gray-900">{vet.name}</p>
                          <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mt-1">
                            {score < 50 && <span>Score bajo: {score}</span>}
                            {incidents >= 3 && <span>Incidentes: {incidents}</span>}
                            {lateCancels >= 5 && <span>Cancelaciones tardías: {lateCancels}</span>}
                          </div>
                        </div>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded self-start sm:self-auto">
                          Requiere revisión
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Veterinarios</p>
              <p className="text-xl md:text-2xl font-bold">{stats.generalStats.totalVets}</p>
            </div>
            <Activity className="w-6 h-6 md:w-8 md:h-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Score Promedio</p>
              <p className="text-xl md:text-2xl font-bold">{stats.generalStats.averageReliabilityScore}</p>
            </div>
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Cancelaciones Tardías</p>
              <p className="text-xl md:text-2xl font-bold">{stats.generalStats.totalLateCancellations}</p>
            </div>
            <TrendingDown className="w-6 h-6 md:w-8 md:h-8 text-red-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Incidentes Urgencias</p>
              <p className="text-xl md:text-2xl font-bold">{stats.generalStats.totalEmergencyIncidents}</p>
            </div>
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-orange-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Top 10 - Score de Confiabilidad</h2>
          <Bar
            data={reliabilityBarData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
                title: { display: false }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: function(value) {
                      return value;
                    }
                  }
                }
              }
            }}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Distribución de Scores</h2>
          <Doughnut
            data={distributionData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { position: 'bottom' }
              }
            }}
          />
        </div>
      </div>

      {/* Gráfico de cancelaciones */}
      {topCancellations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Top 10 - Cancelaciones (Tardías vs A Tiempo)</h2>
          <Bar
            data={cancellationsData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { position: 'top' }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      )}

      {/* Gráfico de incidentes de urgencias */}
      {filteredVets.filter(v => (v.stats?.emergencyIncidents || 0) > 0).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Top 10 - Incidentes de Urgencias</h2>
          <Bar
            data={emergencyIncidentsData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: false }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      )}

      {/* Filtros y ordenamiento */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-wrap gap-2 md:gap-4">
          <select
            value={filterScore}
            onChange={(e) => setFilterScore(e.target.value)}
            className="border px-4 py-2 rounded"
          >
            <option value="all">Todos los scores</option>
            <option value="high">Alto (≥80)</option>
            <option value="medium">Medio (50-79)</option>
            <option value="low">Bajo (&lt;50)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border px-4 py-2 rounded"
          >
            <option value="reliabilityScore">Ordenar por Score</option>
            <option value="totalAppointments">Ordenar por Total Citas</option>
            <option value="emergencyIncidents">Ordenar por Incidentes</option>
            <option value="lateCancellations">Ordenar por Cancelaciones Tardías</option>
          </select>
        </div>
      </div>

      {/* Tabla de veterinarios */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Mobile: Card View */}
        <div className="md:hidden p-4 space-y-4">
          {filteredVets.slice(0, 20).map(vet => {
            const score = vet.reliability?.reliabilityScore || 100;
            return (
              <div key={vet._id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{vet.name}</p>
                    <p className="text-xs text-gray-500">{vet.email}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getScoreColor(score)}`}>
                    {getScoreIcon(score)}
                    <span className="text-sm font-semibold">{score}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <p><span className="font-medium">Citas:</span> {vet.stats?.totalAppointments || 0}</p>
                  <p><span className="font-medium">Urgencias:</span> {vet.stats?.emergencyIncidents || 0}</p>
                  <p><span className="font-medium">Cancel. Tardías:</span> {vet.stats?.lateCancellations || 0}</p>
                  <p><span className="font-medium">Tipo:</span> {vet.vetType === 'clinic' ? 'Clínica' : 'Independiente'}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veterinario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Citas Totales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancel. Tardías
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancel. A Tiempo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urgencias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rechazos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Incidentes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasa Éxito
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVets.map((vet) => {
                const score = vet.reliability?.reliabilityScore || 100;
                return (
                  <tr key={vet._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{vet.name}</div>
                          <div className="text-sm text-gray-500">{vet.email}</div>
                          <div className="text-xs text-gray-400">
                            {vet.vetType === 'clinic' ? 'Clínica' : 'Independiente'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getScoreColor(score)}`}>
                        {getScoreIcon(score)}
                        <span className="text-sm font-semibold">{score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vet.stats?.totalAppointments || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-red-600 font-semibold">
                        {vet.stats?.lateCancellations || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-green-600">
                        {vet.stats?.onTimeCancellations || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vet.stats?.totalEmergencies || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vet.stats?.emergencyRejections || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-orange-600 font-semibold">
                        {vet.stats?.emergencyIncidents || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        (vet.stats?.successRate || 0) >= 80 ? 'text-green-600' :
                        (vet.stats?.successRate || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {vet.stats?.successRate || 0}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredVets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay veterinarios que coincidan con los filtros seleccionados.
        </div>
      )}
    </div>
  );
};

export default VetReliability;

