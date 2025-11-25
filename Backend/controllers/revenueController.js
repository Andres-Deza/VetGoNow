import Appointment from '../models/Appointment.js';
import VetEarnings from '../models/VetEarnings.js';
import CommissionConfig from '../models/CommissionConfig.js';

/**
 * Obtener estadísticas detalladas de ingresos incluyendo comisiones
 */
export const getRevenueStats = async (req, res) => {
  try {
    const { period = '30' } = req.query; // días, default 30
    const days = parseInt(period);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Obtener todas las citas pagadas/completadas en el período
    const appointments = await Appointment.find({
      $or: [
        { isPaid: true },
        { status: 'completed' }
      ],
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('pricing consultationPrice appointmentType isEmergency mode createdAt appointmentDate');

    // 2. Calcular ingresos totales y por tipo
    let totalRevenue = 0;
    let totalCommission = 0;
    const revenueByType = {
      emergency_home: { revenue: 0, commission: 0, count: 0 },
      emergency_clinic: { revenue: 0, commission: 0, count: 0 },
      appointment_home: { revenue: 0, commission: 0, count: 0 },
      appointment_clinic: { revenue: 0, commission: 0, count: 0 },
      teleconsultation: { revenue: 0, commission: 0, count: 0 }
    };

    // Obtener configuraciones de comisión
    const commissionConfigs = await CommissionConfig.find({ isActive: true });
    const commissionMap = {};
    commissionConfigs.forEach(config => {
      commissionMap[config.serviceType] = config.commissionAmount || 4750;
    });

    // Calcular ingresos
    appointments.forEach(apt => {
      const price = apt.pricing?.total > 0 ? apt.pricing.total : (apt.consultationPrice || 0);
      totalRevenue += price;

      // Determinar tipo de servicio
      let serviceType;
      if (apt.isEmergency) {
        serviceType = apt.mode === 'home' ? 'emergency_home' : 'emergency_clinic';
      } else {
        if (apt.appointmentType === 'online consultation') {
          serviceType = 'teleconsultation';
        } else if (apt.appointmentType === 'home visit') {
          serviceType = 'appointment_home';
        } else {
          serviceType = 'appointment_clinic';
        }
      }

      const commission = commissionMap[serviceType] || 4750;
      totalCommission += commission;

      if (revenueByType[serviceType]) {
        revenueByType[serviceType].revenue += price;
        revenueByType[serviceType].commission += commission;
        revenueByType[serviceType].count += 1;
      }
    });

    // 3. Obtener ingresos por día para gráfico
    const revenueByDay = await Appointment.aggregate([
      {
        $match: {
          $or: [
            { isPaid: true },
            { status: 'completed' }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: {
            $sum: {
              $cond: [
                { $gt: ['$pricing.total', 0] },
                '$pricing.total',
                { $ifNull: ['$consultationPrice', 0] }
              ]
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Obtener comisiones por día (desde VetEarnings)
    const commissionsByDay = await VetEarnings.aggregate([
      {
        $match: {
          serviceDate: { $gte: startDate, $lte: endDate },
          paymentStatus: { $in: ['pending', 'paid'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$serviceDate' }
          },
          commission: { $sum: '$commissionAmount' },
          vetEarnings: { $sum: '$vetEarnings' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 5. Estadísticas mensuales (últimos 12 meses)
    const monthlyStats = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 0, 23, 59, 59);

      const monthAppointments = await Appointment.find({
        $or: [
          { isPaid: true },
          { status: 'completed' }
        ],
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).select('pricing consultationPrice');

      const monthRevenue = monthAppointments.reduce((sum, apt) => {
        return sum + (apt.pricing?.total > 0 ? apt.pricing.total : (apt.consultationPrice || 0));
      }, 0);

      const monthCommissions = await VetEarnings.aggregate([
        {
          $match: {
            serviceDate: { $gte: monthStart, $lte: monthEnd },
            paymentStatus: { $in: ['pending', 'paid'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$commissionAmount' }
          }
        }
      ]);

      const monthCommission = monthCommissions.length > 0 ? monthCommissions[0].total : 0;

      monthlyStats.push({
        month: monthStart.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        commission: monthCommission,
        net: monthRevenue - monthCommission
      });
    }

    // 6. Top servicios por ingresos
    const topServices = Object.entries(revenueByType)
      .map(([type, data]) => ({
        type,
        name: getServiceName(type),
        revenue: data.revenue,
        commission: data.commission,
        net: data.revenue - data.commission,
        count: data.count
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 7. Comparación con período anterior
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousEndDate = startDate;

    const previousAppointments = await Appointment.find({
      $or: [
        { isPaid: true },
        { status: 'completed' }
      ],
      createdAt: { $gte: previousStartDate, $lte: previousEndDate }
    }).select('pricing consultationPrice');

    const previousRevenue = previousAppointments.reduce((sum, apt) => {
      return sum + (apt.pricing?.total > 0 ? apt.pricing.total : (apt.consultationPrice || 0));
    }, 0);

    const previousCommissions = await VetEarnings.aggregate([
      {
        $match: {
          serviceDate: { $gte: previousStartDate, $lte: previousEndDate },
          paymentStatus: { $in: ['pending', 'paid'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$commissionAmount' }
        }
      }
    ]);

    const previousCommission = previousCommissions.length > 0 ? previousCommissions[0].total : 0;
    const previousNet = previousRevenue - previousCommission;

    const revenueGrowth = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : 0;

    const commissionGrowth = previousCommission > 0
      ? ((totalCommission - previousCommission) / previousCommission * 100).toFixed(1)
      : 0;

    const netRevenue = totalRevenue - totalCommission;
    const previousNetRevenue = previousRevenue - previousCommission;
    const netGrowth = previousNetRevenue > 0
      ? ((netRevenue - previousNetRevenue) / previousNetRevenue * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      period: {
        startDate,
        endDate,
        days
      },
      summary: {
        totalRevenue,
        totalCommission,
        netRevenue,
        totalServices: appointments.length,
        averageServiceValue: appointments.length > 0 ? totalRevenue / appointments.length : 0
      },
      growth: {
        revenueGrowth: parseFloat(revenueGrowth),
        commissionGrowth: parseFloat(commissionGrowth),
        netGrowth: parseFloat(netGrowth),
        previousPeriod: {
          revenue: previousRevenue,
          commission: previousCommission,
          net: previousNetRevenue
        }
      },
      byType: revenueByType,
      topServices,
      daily: {
        revenue: revenueByDay,
        commission: commissionsByDay
      },
      monthly: monthlyStats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de ingresos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de ingresos',
      error: error.message
    });
  }
};

/**
 * Helper para obtener nombre legible del tipo de servicio
 */
function getServiceName(type) {
  const names = {
    'emergency_home': 'Urgencia a Domicilio',
    'emergency_clinic': 'Urgencia en Clínica',
    'appointment_home': 'Cita a Domicilio',
    'appointment_clinic': 'Consulta en Clínica',
    'teleconsultation': 'Teleconsulta'
  };
  return names[type] || type;
}

