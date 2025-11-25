import Admin from "../models/Admin.js";
import Vet from "../models/Veterinarian.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Pet from "../models/Pet.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_SECRET } from "../config.js";

export const registerAdmin = async (req, res) => {
  const { name, email, phoneNumber, password, role } = req.body;

  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    admin = new Admin({
      name,
      email,
      phoneNumber,
      password,
      role: role || "admin",
    });

    await admin.save();

    const payload = {
      id: admin._id,
      role: admin.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({
      success: true,
      token,
      admin: { id: admin._id, name, email, role: admin.role },
    });
  } catch (error) {
    console.error("Error registering admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    console.log("Admin login attempt - Email:", email, "Role:", role);
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log("Admin not found for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (role && role !== "admin") {
      console.log("Invalid role for admin login:", role);
      return res.status(400).json({ message: "Invalid role for admin login" });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      console.log("Password mismatch for admin:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Admin login successful:", email);

    const payload = {
      id: admin._id,
      role: admin.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

    res.json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email, role: admin.role },
    });
  } catch (error) {
    console.error("Error logging in admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    // Assuming you get admin ID from auth middleware or request param
    const adminId = req.user.id; // or req.params.id

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Obtener estadísticas de confiabilidad de todos los veterinarios
export const getVetReliabilityStats = async (req, res) => {
  try {
    const vets = await Vet.find({})
      .select('name email phoneNumber reliability ratings vetType isApproved createdAt')
      .lean();

    // Obtener estadísticas adicionales de citas por vet
    const vetStats = await Promise.all(
      vets.map(async (vet) => {
        const vetId = vet._id;

        // Contar citas totales
        const totalAppointments = await Appointment.countDocuments({ vetId });

        // Contar citas completadas
        const completedAppointments = await Appointment.countDocuments({
          vetId,
          status: 'completed'
        });

        // Contar cancelaciones por tipo
        const lateCancellations = await Appointment.countDocuments({
          vetId,
          status: 'cancelled_late_by_vet'
        });

        const onTimeCancellations = await Appointment.countDocuments({
          vetId,
          status: 'cancelled_by_vet_on_time'
        });

        // Contar urgencias
        const totalEmergencies = await Appointment.countDocuments({
          vetId,
          isEmergency: true
        });

        const emergencyRejections = await Appointment.countDocuments({
          vetId,
          isEmergency: true,
          status: 'rejected_by_vet'
        });

        const emergencyIncidents = await Appointment.countDocuments({
          vetId,
          isEmergency: true,
          $or: [
            { status: 'incident_vet_no_arrived' },
            { status: 'incident_clinic_no_received' }
          ]
        });

        const completedEmergencies = await Appointment.countDocuments({
          vetId,
          isEmergency: true,
          status: 'completed'
        });

        // Calcular tasa de éxito
        const successRate = totalAppointments > 0
          ? ((completedAppointments / totalAppointments) * 100).toFixed(1)
          : 0;

        // Calcular tasa de incidentes de urgencias
        const emergencyIncidentRate = totalEmergencies > 0
          ? ((emergencyIncidents / totalEmergencies) * 100).toFixed(1)
          : 0;

        return {
          ...vet,
          stats: {
            totalAppointments,
            completedAppointments,
            lateCancellations,
            onTimeCancellations,
            totalEmergencies,
            emergencyRejections,
            emergencyIncidents,
            completedEmergencies,
            successRate: parseFloat(successRate),
            emergencyIncidentRate: parseFloat(emergencyIncidentRate)
          }
        };
      })
    );

    // Estadísticas generales
    const generalStats = {
      totalVets: vets.length,
      approvedVets: vets.filter(v => v.isApproved).length,
      totalAppointments: await Appointment.countDocuments(),
      totalEmergencies: await Appointment.countDocuments({ isEmergency: true }),
      totalLateCancellations: await Appointment.countDocuments({ status: 'cancelled_late_by_vet' }),
      totalEmergencyIncidents: await Appointment.countDocuments({
        isEmergency: true,
        $or: [
          { status: 'incident_vet_no_arrived' },
          { status: 'incident_clinic_no_received' }
        ]
      }),
      averageReliabilityScore: vets.length > 0
        ? (vets.reduce((sum, v) => sum + (v.reliability?.reliabilityScore || 100), 0) / vets.length).toFixed(1)
        : 100
    };

    res.json({
      success: true,
      vets: vetStats,
      generalStats
    });
  } catch (error) {
    console.error('Error fetching vet reliability stats:', error);
    res.status(500).json({ message: 'Error del servidor al obtener estadísticas' });
  }
};

// Obtener estadísticas de tiempos de urgencias a domicilio
export const getEmergencyTimeStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Filtros de fecha opcionales
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Obtener todas las urgencias a domicilio completadas
    const homeEmergencies = await Appointment.find({
      isEmergency: true,
      mode: 'home',
      status: 'completed',
      'tracking.status': 'completed',
      'tracking.acceptedAt': { $exists: true },
      'tracking.arrivedAt': { $exists: true },
      'tracking.completedAt': { $exists: true },
      ...dateFilter
    })
      .populate('vetId', 'name vetType')
      .populate('userId', 'name')
      .populate('petId', 'name')
      .lean();

    // Calcular tiempos para cada urgencia
    const emergencyTimeStats = homeEmergencies.map(emergency => {
      const createdAt = new Date(emergency.createdAt);
      const acceptedAt = emergency.tracking?.acceptedAt ? new Date(emergency.tracking.acceptedAt) : null;
      const onWayAt = emergency.tracking?.onWayAt ? new Date(emergency.tracking.onWayAt) : null;
      const arrivedAt = emergency.tracking?.arrivedAt ? new Date(emergency.tracking.arrivedAt) : null;
      const completedAt = emergency.tracking?.completedAt ? new Date(emergency.tracking.completedAt) : null;

      // Calcular tiempos en minutos
      const timeToAccept = acceptedAt ? Math.round((acceptedAt - createdAt) / 1000 / 60) : null;
      const timeToArrive = (acceptedAt && arrivedAt) ? Math.round((arrivedAt - acceptedAt) / 1000 / 60) : null;
      const timeToComplete = (arrivedAt && completedAt) ? Math.round((completedAt - arrivedAt) / 1000 / 60) : null;
      const totalTime = completedAt ? Math.round((completedAt - createdAt) / 1000 / 60) : null;

      return {
        emergencyId: emergency._id,
        createdAt,
        vetName: emergency.vetId?.name || 'N/A',
        vetType: emergency.vetId?.vetType || 'unknown',
        userName: emergency.userId?.name || 'N/A',
        petName: emergency.petId?.name || 'N/A',
        location: emergency.location?.address || 'N/A',
        timeToAccept, // minutos desde creación hasta aceptación
        timeToArrive, // minutos desde aceptación hasta llegada
        timeToComplete, // minutos desde llegada hasta completado
        totalTime, // minutos totales
        acceptedAt,
        onWayAt,
        arrivedAt,
        completedAt
      };
    }).filter(stat => stat.totalTime !== null); // Solo incluir urgencias completadas

    // Calcular estadísticas agregadas
    const totalEmergencies = emergencyTimeStats.length;
    
    if (totalEmergencies === 0) {
      return res.json({
        success: true,
        stats: {
          totalEmergencies: 0,
          averages: {
            timeToAccept: null,
            timeToArrive: null,
            timeToComplete: null,
            totalTime: null
          },
          medians: {
            timeToAccept: null,
            timeToArrive: null,
            timeToComplete: null,
            totalTime: null
          },
          minimums: {
            timeToAccept: null,
            timeToArrive: null,
            timeToComplete: null,
            totalTime: null
          },
          maximums: {
            timeToAccept: null,
            timeToArrive: null,
            timeToComplete: null,
            totalTime: null
          },
          byVet: [],
          emergencyDetails: []
        }
      });
    }

    // Calcular promedios
    const avgTimeToAccept = emergencyTimeStats
      .filter(s => s.timeToAccept !== null)
      .reduce((sum, s) => sum + s.timeToAccept, 0) / emergencyTimeStats.filter(s => s.timeToAccept !== null).length;
    
    const avgTimeToArrive = emergencyTimeStats
      .filter(s => s.timeToArrive !== null)
      .reduce((sum, s) => sum + s.timeToArrive, 0) / emergencyTimeStats.filter(s => s.timeToArrive !== null).length;
    
    const avgTimeToComplete = emergencyTimeStats
      .filter(s => s.timeToComplete !== null)
      .reduce((sum, s) => sum + s.timeToComplete, 0) / emergencyTimeStats.filter(s => s.timeToComplete !== null).length;
    
    const avgTotalTime = emergencyTimeStats
      .reduce((sum, s) => sum + s.totalTime, 0) / totalEmergencies;

    // Calcular medianas
    const sortedTimeToAccept = emergencyTimeStats
      .filter(s => s.timeToAccept !== null)
      .map(s => s.timeToAccept)
      .sort((a, b) => a - b);
    const medianTimeToAccept = sortedTimeToAccept.length > 0
      ? sortedTimeToAccept[Math.floor(sortedTimeToAccept.length / 2)]
      : null;

    const sortedTimeToArrive = emergencyTimeStats
      .filter(s => s.timeToArrive !== null)
      .map(s => s.timeToArrive)
      .sort((a, b) => a - b);
    const medianTimeToArrive = sortedTimeToArrive.length > 0
      ? sortedTimeToArrive[Math.floor(sortedTimeToArrive.length / 2)]
      : null;

    const sortedTimeToComplete = emergencyTimeStats
      .filter(s => s.timeToComplete !== null)
      .map(s => s.timeToComplete)
      .sort((a, b) => a - b);
    const medianTimeToComplete = sortedTimeToComplete.length > 0
      ? sortedTimeToComplete[Math.floor(sortedTimeToComplete.length / 2)]
      : null;

    const sortedTotalTime = emergencyTimeStats
      .map(s => s.totalTime)
      .sort((a, b) => a - b);
    const medianTotalTime = sortedTotalTime[Math.floor(sortedTotalTime.length / 2)];

    // Calcular mínimos y máximos
    const minTimeToAccept = sortedTimeToAccept.length > 0 ? Math.min(...sortedTimeToAccept) : null;
    const maxTimeToAccept = sortedTimeToAccept.length > 0 ? Math.max(...sortedTimeToAccept) : null;
    const minTimeToArrive = sortedTimeToArrive.length > 0 ? Math.min(...sortedTimeToArrive) : null;
    const maxTimeToArrive = sortedTimeToArrive.length > 0 ? Math.max(...sortedTimeToArrive) : null;
    const minTimeToComplete = sortedTimeToComplete.length > 0 ? Math.min(...sortedTimeToComplete) : null;
    const maxTimeToComplete = sortedTimeToComplete.length > 0 ? Math.max(...sortedTimeToComplete) : null;
    const minTotalTime = Math.min(...sortedTotalTime);
    const maxTotalTime = Math.max(...sortedTotalTime);

    // Agrupar por veterinario
    const byVetMap = new Map();
    emergencyTimeStats.forEach(stat => {
      const vetId = stat.vetName;
      if (!byVetMap.has(vetId)) {
        byVetMap.set(vetId, {
          vetName: stat.vetName,
          vetType: stat.vetType,
          emergencies: [],
          count: 0,
          avgTimeToAccept: 0,
          avgTimeToArrive: 0,
          avgTimeToComplete: 0,
          avgTotalTime: 0
        });
      }
      const vetStats = byVetMap.get(vetId);
      vetStats.emergencies.push(stat);
      vetStats.count++;
    });

    // Calcular promedios por vet
    const byVet = Array.from(byVetMap.values()).map(vetStat => {
      const withAccept = vetStat.emergencies.filter(e => e.timeToAccept !== null);
      const withArrive = vetStat.emergencies.filter(e => e.timeToArrive !== null);
      const withComplete = vetStat.emergencies.filter(e => e.timeToComplete !== null);

      return {
        ...vetStat,
        avgTimeToAccept: withAccept.length > 0
          ? Math.round(withAccept.reduce((sum, e) => sum + e.timeToAccept, 0) / withAccept.length)
          : null,
        avgTimeToArrive: withArrive.length > 0
          ? Math.round(withArrive.reduce((sum, e) => sum + e.timeToArrive, 0) / withArrive.length)
          : null,
        avgTimeToComplete: withComplete.length > 0
          ? Math.round(withComplete.reduce((sum, e) => sum + e.timeToComplete, 0) / withComplete.length)
          : null,
        avgTotalTime: Math.round(vetStat.emergencies.reduce((sum, e) => sum + e.totalTime, 0) / vetStat.count),
        emergencies: undefined // No incluir detalles de emergencias en el resumen
      };
    }).sort((a, b) => b.count - a.count); // Ordenar por cantidad de urgencias

    res.json({
      success: true,
      stats: {
        totalEmergencies,
        averages: {
          timeToAccept: Math.round(avgTimeToAccept),
          timeToArrive: Math.round(avgTimeToArrive),
          timeToComplete: Math.round(avgTimeToComplete),
          totalTime: Math.round(avgTotalTime)
        },
        medians: {
          timeToAccept: medianTimeToAccept,
          timeToArrive: medianTimeToArrive,
          timeToComplete: medianTimeToComplete,
          totalTime: medianTotalTime
        },
        minimums: {
          timeToAccept: minTimeToAccept,
          timeToArrive: minTimeToArrive,
          timeToComplete: minTimeToComplete,
          totalTime: minTotalTime
        },
        maximums: {
          timeToAccept: maxTimeToAccept,
          timeToArrive: maxTimeToArrive,
          timeToComplete: maxTimeToComplete,
          totalTime: maxTotalTime
        },
        byVet,
        emergencyDetails: emergencyTimeStats.sort((a, b) => b.createdAt - a.createdAt) // Más recientes primero
      }
    });
  } catch (error) {
    console.error('Error fetching emergency time stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener estadísticas de tiempos de urgencias'
    });
  }
};

// Obtener estadísticas completas del dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Totales generales
    const totalUsers = await User.countDocuments();
    const totalVets = await Vet.countDocuments();
    const totalClinics = await Vet.countDocuments({ vetType: 'clinic' });
    const totalIndependentVets = await Vet.countDocuments({ vetType: 'independent' });
    const totalPets = await Pet.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalEmergencies = await Appointment.countDocuments({ isEmergency: true });

    // 2. Estadísticas de veterinarios
    const pendingApprovalVets = await Vet.countDocuments({ isApproved: false });
    const approvedVets = await Vet.countDocuments({ isApproved: true });
    const verifiedVets = await Vet.countDocuments({ verificationStatus: 'verified' });
    const pendingVerificationVets = await Vet.countDocuments({ verificationStatus: 'pending' });
    const rejectedVets = await Vet.countDocuments({ verificationStatus: 'rejected' });

    // 3. Estadísticas de citas por estado
    const appointmentsByStatus = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = {
      completed: 0,
      scheduled: 0,
      pending: 0,
      cancelled: 0,
      in_progress: 0,
      assigned: 0,
      cancelled_by_vet_on_time: 0,
      cancelled_late_by_vet: 0,
      cancelled_by_tutor: 0
    };

    appointmentsByStatus.forEach(item => {
      if (item._id in statusMap) {
        statusMap[item._id] = item.count;
      }
    });

    // 4. Estadísticas de citas por tipo
    const appointmentsByType = await Appointment.aggregate([
      {
        $group: {
          _id: '$appointmentType',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeMap = {
      'clinic visit': 0,
      'online consultation': 0,
      'home visit': 0
    };

    appointmentsByType.forEach(item => {
      if (item._id && item._id in typeMap) {
        typeMap[item._id] = item.count;
      }
    });

    // 5. Citas por período
    const appointmentsToday = await Appointment.countDocuments({
      appointmentDate: { $gte: todayStart }
    });
    const appointmentsThisWeek = await Appointment.countDocuments({
      appointmentDate: { $gte: weekStart }
    });
    const appointmentsThisMonth = await Appointment.countDocuments({
      appointmentDate: { $gte: monthStart }
    });
    const appointmentsLast30Days = await Appointment.countDocuments({
      appointmentDate: { $gte: last30Days }
    });

    // 6. Urgencias por estado
    const emergenciesByStatus = await Appointment.aggregate([
      { $match: { isEmergency: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const emergencyStatusMap = {
      completed: 0,
      in_progress: 0,
      assigned: 0,
      pending: 0,
      rejected_by_vet: 0,
      accepted_by_vet: 0
    };

    emergenciesByStatus.forEach(item => {
      if (item._id in emergencyStatusMap) {
        emergencyStatusMap[item._id] = item.count;
      }
    });

    // 7. Estadísticas de ingresos
    // Obtener todas las citas completadas o pagadas
    const completedAppointments = await Appointment.find({
      $or: [
        { isPaid: true },
        { status: 'completed' }
      ]
    }).select('pricing consultationPrice');

    let totalRevenue = 0;
    completedAppointments.forEach(apt => {
      const price = apt.pricing?.total > 0 ? apt.pricing.total : (apt.consultationPrice || 0);
      totalRevenue += price;
    });

    // Ingresos del mes
    const completedAppointmentsThisMonth = await Appointment.find({
      appointmentDate: { $gte: monthStart },
      $or: [
        { isPaid: true },
        { status: 'completed' }
      ]
    }).select('pricing consultationPrice');

    let revenueMonth = 0;
    completedAppointmentsThisMonth.forEach(apt => {
      const price = apt.pricing?.total > 0 ? apt.pricing.total : (apt.consultationPrice || 0);
      revenueMonth += price;
    });

    // 8. Crecimiento últimos 30 días
    // Extraer timestamp del ObjectId (los primeros 4 bytes contienen el timestamp en segundos)
    const allUsersRecent = await User.find({}).select('_id').lean();
    const allVetsRecent = await Vet.find({}).select('_id').lean();
    
    const newUsersLast30Days = allUsersRecent.filter(user => {
      try {
        const objectId = user._id.toString();
        const timestamp = parseInt(objectId.substring(0, 8), 16) * 1000;
        return new Date(timestamp) >= last30Days;
      } catch {
        return false;
      }
    }).length;
    
    const newVetsLast30Days = allVetsRecent.filter(vet => {
      try {
        const objectId = vet._id.toString();
        const timestamp = parseInt(objectId.substring(0, 8), 16) * 1000;
        return new Date(timestamp) >= last30Days;
      } catch {
        return false;
      }
    }).length;
    
    const newAppointmentsLast30Days = await Appointment.countDocuments({
      createdAt: { $gte: last30Days }
    });

    // 9. Top veterinarios por citas
    const topVetsByAppointments = await Appointment.aggregate([
      {
        $match: { vetId: { $ne: null } }
      },
      {
        $group: {
          _id: '$vetId',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'veterinarians',
          localField: '_id',
          foreignField: '_id',
          as: 'vet'
        }
      },
      { $unwind: { path: '$vet', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vetId: '$_id',
          vetName: { $ifNull: ['$vet.name', 'Desconocido'] },
          vetType: { $ifNull: ['$vet.vetType', 'unknown'] },
          totalAppointments: '$count',
          completedAppointments: '$completed'
        }
      }
    ]);

    // 10. Top usuarios por citas
    const topUsersByAppointments = await Appointment.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          userName: { $ifNull: ['$user.name', 'Desconocido'] },
          totalAppointments: '$count'
        }
      }
    ]);

    // 11. Regiones más activas
    const topRegions = await Vet.aggregate([
      {
        $match: { region: { $ne: null, $ne: '' } }
      },
      {
        $group: {
          _id: '$region',
          vetCount: { $sum: 1 }
        }
      },
      { $sort: { vetCount: -1 } },
      { $limit: 10 }
    ]);

    // 12. Citas por día últimos 30 días (para gráfico)
    const appointmentsByDay = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 13. Tasa de conversión (usuarios con citas vs sin citas)
    const usersWithAppointments = await Appointment.distinct('userId');
    const usersWithoutAppointments = totalUsers - usersWithAppointments.length;
    const conversionRate = totalUsers > 0 
      ? ((usersWithAppointments.length / totalUsers) * 100).toFixed(1)
      : 0;

    // 14. Tasa de completación y cancelación
    const completionRate = totalAppointments > 0
      ? ((statusMap.completed / totalAppointments) * 100).toFixed(1)
      : 0;
    
    const cancellationRate = totalAppointments > 0
      ? (((statusMap.cancelled + statusMap.cancelled_by_vet_on_time + 
          statusMap.cancelled_late_by_vet + statusMap.cancelled_by_tutor) / totalAppointments) * 100).toFixed(1)
      : 0;

    // 15. Tasa de aceptación de urgencias
    const emergencyAcceptanceRate = totalEmergencies > 0
      ? ((emergencyStatusMap.accepted_by_vet / totalEmergencies) * 100).toFixed(1)
      : 0;

    // 16. Veterinarios con soporte de urgencias
    const vetsWithEmergencySupport = await Vet.countDocuments({ supportsEmergency: true });

    res.json({
      success: true,
      stats: {
        // Totales generales
        totals: {
          users: totalUsers,
          vets: totalVets,
          clinics: totalClinics,
          independentVets: totalIndependentVets,
          pets: totalPets,
          appointments: totalAppointments,
          emergencies: totalEmergencies
        },
        // Veterinarios
        vets: {
          total: totalVets,
          approved: approvedVets,
          pendingApproval: pendingApprovalVets,
          verified: verifiedVets,
          pendingVerification: pendingVerificationVets,
          rejected: rejectedVets,
          withEmergencySupport: vetsWithEmergencySupport
        },
        // Citas por estado
        appointmentsByStatus: statusMap,
        // Citas por tipo
        appointmentsByType: typeMap,
        // Citas por período
        appointmentsByPeriod: {
          today: appointmentsToday,
          thisWeek: appointmentsThisWeek,
          thisMonth: appointmentsThisMonth,
          last30Days: appointmentsLast30Days
        },
        // Urgencias
        emergencies: {
          total: totalEmergencies,
          byStatus: emergencyStatusMap,
          acceptanceRate: parseFloat(emergencyAcceptanceRate)
        },
        // Ingresos
        revenue: {
          total: totalRevenue,
          thisMonth: revenueMonth,
          currency: 'CLP'
        },
        // Crecimiento
        growth: {
          newUsersLast30Days,
          newVetsLast30Days,
          newAppointmentsLast30Days
        },
        // Rankings
        topVetsByAppointments,
        topUsersByAppointments,
        topRegions,
        // Gráficos
        appointmentsByDay,
        // Tasas
        rates: {
          conversionRate: parseFloat(conversionRate),
          completionRate: parseFloat(completionRate),
          cancellationRate: parseFloat(cancellationRate),
          emergencyAcceptanceRate: parseFloat(emergencyAcceptanceRate)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error del servidor al obtener estadísticas del dashboard' 
    });
  }
};
