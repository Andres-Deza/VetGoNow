import { useState, useEffect } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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
  Filler,
} from "chart.js";
import axios from "axios";

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

const Revenue = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [revenueData, setRevenueData] = useState(null);

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5555/api/admin/revenue/stats?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setRevenueData(response.data);
      }
    } catch (error) {
      console.error("Error al obtener estadísticas de ingresos:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("es-CL").format(num);
  };

  // Preparar datos para gráfico diario (Ingresos vs Comisiones)
  const getDailyChartData = () => {
    if (!revenueData?.daily) return null;

    const revenueByDay = revenueData.daily.revenue || [];
    const commissionByDay = revenueData.daily.commission || [];

    // Crear un mapa combinado de fechas
    const dateMap = new Map();
    
    revenueByDay.forEach((item) => {
      dateMap.set(item._id, { revenue: item.revenue || 0, commission: 0 });
    });

    commissionByDay.forEach((item) => {
      const existing = dateMap.get(item._id) || { revenue: 0, commission: 0 };
      dateMap.set(item._id, { ...existing, commission: item.commission || 0 });
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    const labels = sortedDates.map((date) => {
      const d = new Date(date);
      return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
    });

    return {
      labels,
      datasets: [
        {
          label: "Ingresos Totales",
          data: sortedDates.map((date) => dateMap.get(date).revenue),
          borderColor: "rgba(34, 197, 94, 1)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Comisiones",
          data: sortedDates.map((date) => dateMap.get(date).commission),
          borderColor: "rgba(239, 68, 68, 1)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Ganancia Neta",
          data: sortedDates.map(
            (date) =>
              dateMap.get(date).revenue - dateMap.get(date).commission
          ),
          borderColor: "rgba(59, 130, 246, 1)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  // Preparar datos para gráfico mensual
  const getMonthlyChartData = () => {
    if (!revenueData?.monthly) return null;

    return {
      labels: revenueData.monthly.map((m) => m.month),
      datasets: [
        {
          label: "Ingresos Totales",
          data: revenueData.monthly.map((m) => m.revenue),
          backgroundColor: "rgba(34, 197, 94, 0.8)",
        },
        {
          label: "Comisiones",
          data: revenueData.monthly.map((m) => m.commission),
          backgroundColor: "rgba(239, 68, 68, 0.8)",
        },
        {
          label: "Ganancia Neta",
          data: revenueData.monthly.map((m) => m.net),
          backgroundColor: "rgba(59, 130, 246, 0.8)",
        },
      ],
    };
  };

  // Preparar datos para gráfico de tipos de servicio
  const getServiceTypeChartData = () => {
    if (!revenueData?.topServices) return null;

    return {
      labels: revenueData.topServices.map((s) => s.name),
      datasets: [
        {
          label: "Ingresos",
          data: revenueData.topServices.map((s) => s.revenue),
          backgroundColor: [
            "rgba(59, 130, 246, 0.8)",
            "rgba(34, 197, 94, 0.8)",
            "rgba(239, 68, 68, 0.8)",
            "rgba(251, 146, 60, 0.8)",
            "rgba(168, 85, 247, 0.8)",
          ],
        },
      ],
    };
  };

  // Preparar datos para gráfico de dona (Ingresos vs Comisiones)
  const getDoughnutChartData = () => {
    if (!revenueData?.summary) return null;

    return {
      labels: ["Comisiones", "Ganancia Neta"],
      datasets: [
        {
          data: [
            revenueData.summary.totalCommission,
            revenueData.summary.netRevenue,
          ],
          backgroundColor: ["rgba(239, 68, 68, 0.8)", "rgba(34, 197, 94, 0.8)"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">Ingresos</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error al cargar los datos de ingresos
        </div>
      </div>
    );
  }

  const { summary, growth, topServices } = revenueData;
  const dailyData = getDailyChartData();
  const monthlyData = getMonthlyChartData();
  const serviceData = getServiceTypeChartData();
  const doughnutData = getDoughnutChartData();

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-0">
          Análisis de Ingresos
        </h1>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="60">Últimos 60 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <p className="text-sm font-medium text-green-700 mb-1">
            Ingresos Totales
          </p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(summary.totalRevenue)}
          </p>
          {growth?.revenueGrowth !== undefined && (
            <p
              className={`text-sm mt-2 ${
                growth.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {growth.revenueGrowth >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(growth.revenueGrowth)}% vs período anterior
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
          <p className="text-sm font-medium text-red-700 mb-1">Comisiones</p>
          <p className="text-2xl font-bold text-red-900">
            {formatCurrency(summary.totalCommission)}
          </p>
          {growth?.commissionGrowth !== undefined && (
            <p
              className={`text-sm mt-2 ${
                growth.commissionGrowth >= 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {growth.commissionGrowth >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(growth.commissionGrowth)}% vs período anterior
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <p className="text-sm font-medium text-blue-700 mb-1">
            Ganancia Neta
          </p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(summary.netRevenue)}
          </p>
          {growth?.netGrowth !== undefined && (
            <p
              className={`text-sm mt-2 ${
                growth.netGrowth >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {growth.netGrowth >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(growth.netGrowth)}% vs período anterior
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <p className="text-sm font-medium text-purple-700 mb-1">
            Servicios Totales
          </p>
          <p className="text-2xl font-bold text-purple-900">
            {formatNumber(summary.totalServices)}
          </p>
          <p className="text-sm text-purple-600 mt-2">
            Promedio: {formatCurrency(summary.averageServiceValue)}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico diario */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Ingresos Diarios (últimos {period} días)
          </h2>
          {dailyData ? (
            <Line data={dailyData} options={chartOptions} />
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay datos disponibles
            </p>
          )}
        </div>

        {/* Gráfico de distribución */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Distribución de Ingresos
          </h2>
          {doughnutData ? (
            <div className="max-w-md mx-auto">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay datos disponibles
            </p>
          )}
        </div>
      </div>

      {/* Gráfico mensual */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          Ingresos Mensuales (últimos 12 meses)
        </h2>
        {monthlyData ? (
          <Bar data={monthlyData} options={barChartOptions} />
        ) : (
          <p className="text-gray-500 text-center py-8">
            No hay datos disponibles
          </p>
        )}
      </div>

      {/* Gráfico por tipo de servicio */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          Ingresos por Tipo de Servicio
        </h2>
        {serviceData ? (
          <Bar data={serviceData} options={barChartOptions} />
        ) : (
          <p className="text-gray-500 text-center py-8">
            No hay datos disponibles
          </p>
        )}
      </div>

      {/* Tabla de resumen por servicio */}
      {topServices && topServices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Resumen por Tipo de Servicio
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Servicio
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comisiones
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ganancia Neta
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topServices.map((service, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatNumber(service.count)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(service.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                      {formatCurrency(service.commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-bold">
                      {formatCurrency(service.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Revenue;
