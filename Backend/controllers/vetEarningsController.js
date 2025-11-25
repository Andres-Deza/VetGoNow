import VetEarnings from '../models/VetEarnings.js';
import CommissionConfig from '../models/CommissionConfig.js';
import Appointment from '../models/Appointment.js';
import Vet from '../models/Veterinarian.js';
import User from '../models/User.js';
import Pet from '../models/Pet.js';

/**
 * Obtener ganancias del veterinario
 */
export const getVetEarnings = async (req, res) => {
  try {
    const vetId = req.userId || req.user?.id;
    
    if (!vetId) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    // Verificar que el usuario sea un veterinario
    const vet = await Vet.findById(vetId);
    if (!vet || vet.role !== 'Vet') {
      return res.status(403).json({ 
        success: false,
        message: 'Acceso denegado. Solo veterinarios pueden ver sus ganancias.' 
      });
    }

    const { month, year, paymentStatus } = req.query;

    // Construir filtro
    const filter = { vetId };
    
    if (month && year) {
      const paymentMonth = `${year}-${String(month).padStart(2, '0')}`;
      filter.paymentMonth = paymentMonth;
    }
    
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Obtener ganancias
    const earnings = await VetEarnings.find(filter)
      .populate('appointmentId', 'appointmentDate scheduledTime appointmentType isEmergency')
      .sort({ serviceDate: -1 })
      .lean();

    // Calcular estadísticas
    const totalEarnings = earnings.reduce((sum, e) => sum + e.vetEarnings, 0);
    const totalCommission = earnings.reduce((sum, e) => sum + e.commissionAmount, 0);
    const totalRevenue = earnings.reduce((sum, e) => sum + e.totalPrice, 0);
    
    // Agrupar por mes
    const monthlyEarnings = earnings.reduce((acc, earning) => {
      const monthKey = earning.paymentMonth;
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          earnings: 0,
          commission: 0,
          revenue: 0,
          services: 0,
          paymentStatus: earning.paymentStatus
        };
      }
      acc[monthKey].earnings += earning.vetEarnings;
      acc[monthKey].commission += earning.commissionAmount;
      acc[monthKey].revenue += earning.totalPrice;
      acc[monthKey].services += 1;
      return acc;
    }, {});

    // Obtener ganancias del mes actual
    const currentDate = new Date();
    const currentMonth = VetEarnings.getPaymentMonth(currentDate);
    const currentMonthEarnings = earnings.filter(e => e.paymentMonth === currentMonth);

    return res.status(200).json({
      success: true,
      data: {
        earnings,
        summary: {
          totalEarnings,
          totalCommission,
          totalRevenue,
          totalServices: earnings.length,
          currentMonth: {
            month: currentMonth,
            earnings: currentMonthEarnings.reduce((sum, e) => sum + e.vetEarnings, 0),
            commission: currentMonthEarnings.reduce((sum, e) => sum + e.commissionAmount, 0),
            revenue: currentMonthEarnings.reduce((sum, e) => sum + e.totalPrice, 0),
            services: currentMonthEarnings.length
          }
        },
        monthlyBreakdown: Object.values(monthlyEarnings).sort((a, b) => b.month.localeCompare(a.month))
      }
    });
  } catch (error) {
    console.error('Error al obtener ganancias del veterinario:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener ganancias',
      error: error.message 
    });
  }
};

/**
 * Obtener resumen de ganancias del veterinario
 */
export const getVetEarningsSummary = async (req, res) => {
  try {
    const vetId = req.userId || req.user?.id;
    
    if (!vetId) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    // Verificar que el usuario sea un veterinario
    const vet = await Vet.findById(vetId);
    if (!vet || vet.role !== 'Vet') {
      return res.status(403).json({ 
        success: false,
        message: 'Acceso denegado' 
      });
    }

    const currentDate = new Date();
    const currentMonth = VetEarnings.getPaymentMonth(currentDate);

    // Obtener ganancias pendientes del mes actual
    const pendingEarnings = await VetEarnings.find({
      vetId,
      paymentMonth: currentMonth,
      paymentStatus: 'pending'
    });

    const totalPending = pendingEarnings.reduce((sum, e) => sum + e.vetEarnings, 0);
    const totalPendingServices = pendingEarnings.length;

    // Obtener ganancias pagadas
    const paidEarnings = await VetEarnings.find({
      vetId,
      paymentStatus: 'paid'
    });

    const totalPaid = paidEarnings.reduce((sum, e) => sum + e.vetEarnings, 0);
    const totalPaidServices = paidEarnings.length;

    // Próxima fecha de pago (día 5 del mes siguiente)
    const nextPaymentDate = VetEarnings.getScheduledPaymentDate(currentDate);

    return res.status(200).json({
      success: true,
      data: {
        currentMonth: {
          month: currentMonth,
          pendingEarnings: totalPending,
          pendingServices: totalPendingServices,
          nextPaymentDate: nextPaymentDate
        },
        totalPaid: totalPaid,
        totalPaidServices: totalPaidServices,
        bankAccount: vet.bankAccount?.accountNumber ? {
          accountNumber: vet.bankAccount.accountNumber,
          accountType: vet.bankAccount.accountType,
          bankName: vet.bankAccount.bankName,
          accountHolderName: vet.bankAccount.accountHolderName
        } : null
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de ganancias:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener resumen',
      error: error.message 
    });
  }
};

/**
 * Actualizar información bancaria del veterinario
 */
export const updateBankAccount = async (req, res) => {
  try {
    const vetId = req.userId || req.user?.id;
    
    if (!vetId) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    const vet = await Vet.findById(vetId);
    if (!vet || vet.role !== 'Vet') {
      return res.status(403).json({ 
        success: false,
        message: 'Acceso denegado' 
      });
    }

    const { accountNumber, accountType, bankName, accountHolderName, rut } = req.body;

    // Validaciones
    if (!accountNumber || !accountType || !bankName || !accountHolderName) {
      return res.status(400).json({ 
        success: false,
        message: 'Todos los campos son requeridos: accountNumber, accountType, bankName, accountHolderName' 
      });
    }

    // Actualizar información bancaria
    vet.bankAccount = {
      accountNumber,
      accountType,
      bankName,
      accountHolderName,
      rut: rut || null,
      updatedAt: new Date()
    };

    await vet.save();

    return res.status(200).json({
      success: true,
      message: 'Información bancaria actualizada exitosamente',
      data: {
        accountNumber: vet.bankAccount.accountNumber,
        accountType: vet.bankAccount.accountType,
        bankName: vet.bankAccount.bankName,
        accountHolderName: vet.bankAccount.accountHolderName
      }
    });
  } catch (error) {
    console.error('Error al actualizar información bancaria:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al actualizar información bancaria',
      error: error.message 
    });
  }
};

/**
 * Registrar ganancia cuando se completa un servicio
 * Esta función se llamará desde otros controladores
 */
export const recordVetEarning = async (appointment) => {
  try {
    // Asegurar que tenemos el documento completo del appointment con todos los campos
    let appointmentDoc = appointment;
    
    // Si appointment es un objeto pero puede estar incompleto, o es solo un ID, obtener el documento completo
    const AppointmentModel = (await import('../models/Appointment.js')).default;
    if (typeof appointment === 'string' || appointment._id || !appointment.pricing) {
      appointmentDoc = await AppointmentModel.findById(appointment._id || appointment);
      
      if (!appointmentDoc) {
        console.error(`No se encontró el appointment ${appointment._id || appointment}`);
        return null;
      }
    }
    
    // Obtener el vetId real (puede ser un ObjectId o un objeto poblado)
    const vetId = appointmentDoc.vetId?._id || appointmentDoc.vetId;
    
    if (!vetId || !appointmentDoc.isPaid) {
      console.log(`No se registra ganancia - vetId: ${vetId}, isPaid: ${appointmentDoc.isPaid}`);
      return null; // No registrar si no hay veterinario asignado o no está pagado
    }
    
    // Usar appointmentDoc de ahora en adelante
    appointment = appointmentDoc;

    // Determinar tipo de servicio
    let serviceType;
    if (appointment.isEmergency) {
      serviceType = appointment.mode === 'home' ? 'emergency_home' : 'emergency_clinic';
    } else {
      if (appointment.appointmentType === 'online consultation') {
        serviceType = 'teleconsultation';
      } else if (appointment.appointmentType === 'home visit') {
        serviceType = 'appointment_home';
      } else {
        serviceType = 'appointment_clinic';
      }
    }

    // Obtener configuración de comisión
    let commissionConfig = await CommissionConfig.findOne({ serviceType });

    if (!commissionConfig) {
      console.warn(`No se encontró configuración de comisión para ${serviceType}, inicializando...`);
      // Inicializar configuraciones por defecto
      await CommissionConfig.initializeDefaults();
      commissionConfig = await CommissionConfig.findOne({ serviceType });
      if (!commissionConfig) {
        console.error(`Error: No se pudo crear configuración por defecto para ${serviceType}`);
        return null;
      }
    }

    const commissionAmount = commissionConfig.commissionAmount || 4750;
    
    // Para urgencias, el precio está en pricing.total
    // Para citas normales, está en consultationPrice
    let totalPrice = 0;
    if (appointment.isEmergency) {
      totalPrice = appointment.pricing?.total || appointment.consultationPrice || 0;
      console.log(`Urgencia - pricing.total: ${appointment.pricing?.total}, consultationPrice: ${appointment.consultationPrice}`);
    } else {
      totalPrice = appointment.consultationPrice || 0;
    }
    
    console.log(`Registrando ganancia - Tipo: ${serviceType}, Precio Total: ${totalPrice}, Comisión: ${commissionAmount}, Ganancia Net: ${Math.max(0, totalPrice - commissionAmount)}`);
    
    const vetEarnings = Math.max(0, totalPrice - commissionAmount);

    // Calcular mes de pago y fecha programada
    const serviceDate = appointment.appointmentDate || new Date();
    const paymentMonth = VetEarnings.getPaymentMonth(serviceDate);
    const scheduledPaymentDate = VetEarnings.getScheduledPaymentDate(serviceDate);

    // Obtener información adicional para metadata
    const pet = await Pet.findById(appointment.petId);
    const user = await User.findById(appointment.userId);

    // Verificar si ya existe un registro para este appointment
    const existingEarning = await VetEarnings.findOne({ appointmentId: appointment._id });
    if (existingEarning) {
      console.log(`Ya existe un registro de ganancia para el appointment ${appointment._id}`);
      return existingEarning;
    }

    // Obtener el vetId real (puede ser un ObjectId o un objeto poblado)
    const vetIdValue = appointment.vetId?._id || appointment.vetId;
    
    // Crear registro de ganancia
    const vetEarning = new VetEarnings({
      vetId: vetIdValue,
      appointmentId: appointment._id,
      serviceType,
      totalPrice,
      commissionAmount,
      vetEarnings,
      serviceDate,
      paymentMonth,
      scheduledPaymentDate,
      paymentStatus: 'pending',
      metadata: {
        petName: pet?.name || 'N/A',
        tutorName: user?.name || 'N/A',
        appointmentType: appointment.appointmentType || 'N/A',
        isEmergency: appointment.isEmergency || false
      }
    });

    await vetEarning.save();

    console.log(`Ganancia registrada para vet ${vetIdValue}: ${vetEarnings} CLP (Comisión: ${commissionAmount} CLP, Precio Total: ${totalPrice} CLP)`);

    return vetEarning;
  } catch (error) {
    console.error('Error al registrar ganancia del veterinario:', error);
    return null;
  }
};

