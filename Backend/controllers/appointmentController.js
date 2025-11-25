import Appointment from '../models/Appointment.js';
import Pet from '../models/Pet.js';
import Vet from '../models/Veterinarian.js';
import User from '../models/User.js';
import BlockedSlot from '../models/BlockedSlot.js';
import PricingConfig from '../models/PricingConfig.js';
import { recordVetEarning } from './vetEarningsController.js';
import nodemailer from 'nodemailer';
import { SMTP_CONFIG, EMAIL_FROM, FRONTEND_URL } from '../config.js';


// Transporter de email para notificaciones
const emailTransporter = nodemailer.createTransport({
  host: SMTP_CONFIG.host,
  port: Number(SMTP_CONFIG.port),
  secure: SMTP_CONFIG.secure,
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.pass,
  },
});

// Helper para formatear fechas
const formatDate = (date, formatStr) => {
  if (!date) return '';
  const d = new Date(date);
  if (formatStr === 'dd/MM/yyyy') {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return d.toLocaleDateString('es-CL');
};

// Helper para enviar email de cancelación de cita
const sendCancellationEmail = async (userEmail, userName, vetName, appointmentDate, scheduledTime, petName, isLate, reason, appointmentType = null, isEmergency = false) => {
  try {
    const formattedDate = formatDate(appointmentDate, 'dd/MM/yyyy');
    
    // Determinar tipo de servicio
    let serviceType = 'Cita';
    if (isEmergency) {
      serviceType = 'Urgencia';
    } else if (appointmentType === 'online consultation') {
      serviceType = 'Teleconsulta';
    } else if (appointmentType === 'clinic visit') {
      serviceType = 'Consulta en clínica';
    } else if (appointmentType === 'home visit') {
      serviceType = 'Consulta a domicilio';
    }
    
    const subject = isLate 
      ? `⚠️ ${serviceType} cancelada - ${vetName}` 
      : `${serviceType} cancelada - ${vetName}`;
    
    const mailOptions = {
      from: EMAIL_FROM || SMTP_CONFIG.user,
      to: userEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: ${isLate ? '#dc2626' : '#7c3aed'}; margin: 0;">
                ${isLate ? `⚠️ ${serviceType} Cancelada` : `${serviceType} Cancelada`}
              </h1>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hola <strong>${userName}</strong>,
            </p>
            
            ${isLate ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #991b1b; margin: 0; font-weight: 600;">
                  ${isEmergency ? 'Lamentamos informarte que tu urgencia fue cancelada con poca anticipación.' : `Lamentamos informarte que el profesional ${vetName} canceló tu ${serviceType.toLowerCase()} con poca anticipación.`}
                </p>
              </div>
            ` : `
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                ${isEmergency ? `Te informamos que tu urgencia fue ${appointmentType === null ? 'rechazada' : 'cancelada'} por el profesional.` : `Te informamos que el profesional <strong>${vetName}</strong> ha cancelado tu ${serviceType.toLowerCase()}.`}
              </p>
            `}
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #111827; margin-top: 0; font-size: 18px;">Detalles ${isEmergency ? 'de la urgencia' : 'de la cita'}:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">Tipo de servicio:</td>
                  <td style="padding: 8px 0; color: #111827;">${serviceType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Mascota:</td>
                  <td style="padding: 8px 0; color: #111827;">${petName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Fecha:</td>
                  <td style="padding: 8px 0; color: #111827;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Hora:</td>
                  <td style="padding: 8px 0; color: #111827;">${scheduledTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Profesional:</td>
                  <td style="padding: 8px 0; color: #111827;">${vetName}</td>
                </tr>
              </table>
            </div>
            
            ${reason ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Motivo:</strong> ${reason}
                </p>
              </div>
            ` : ''}
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="color: #1e40af; margin: 0 0 15px 0; font-weight: 600;">
                ${isEmergency 
                  ? (isLate 
                    ? 'Estamos buscando otro profesional disponible de inmediato para atender tu urgencia' 
                    : 'El sistema está buscando otro profesional disponible para tu urgencia')
                  : (isLate 
                    ? 'Estamos buscando otro profesional disponible para ti' 
                    : 'Puedes reagendar tu cita cuando gustes')}
              </p>
              <a href="${FRONTEND_URL}/appointments" 
                 style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
                Ver mis citas
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              Saludos,<br>
              <strong>Equipo VetGoNow</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
            <p style="margin: 5px 0 0 0;">
              © ${new Date().getFullYear()} VetGoNow. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `,
      text: `
        Hola ${userName},

        ${isLate ? `Lamentamos informarte que el profesional ${vetName} canceló tu cita con poca anticipación.` : `Te informamos que el profesional ${vetName} ha cancelado tu cita.`}

        Detalles de la ${isEmergency ? 'urgencia' : 'cita'}:
        - Tipo de servicio: ${serviceType}
        - Mascota: ${petName}
        - Fecha: ${formattedDate}
        - Hora: ${scheduledTime}
        - Profesional: ${vetName}
        ${reason ? `- Motivo: ${reason}` : ''}

        ${isEmergency 
          ? (isLate 
            ? 'Estamos buscando otro profesional disponible de inmediato para atender tu urgencia.' 
            : 'El sistema está buscando otro profesional disponible para tu urgencia.')
          : (isLate 
            ? 'Estamos buscando otro profesional disponible para ti.' 
            : 'Puedes reagendar tu cita cuando gustes.')}

        Visita ${FRONTEND_URL}/appointments para ver tus citas.

        Saludos,
        Equipo VetGoNow
      `
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`Email de cancelación enviado a: ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error enviando email de cancelación:', error);
    // No lanzar error para no interrumpir el flujo de cancelación
    return false;
  }
};

/**
 * Estima el precio de una cita tradicional antes de crearla
 */
export const estimateAppointmentPricing = async (req, res) => {
  try {
    const { vetId, appointmentType } = req.body;

    if (!vetId || !appointmentType) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere vetId y appointmentType'
      });
    }

    // Obtener veterinario
    const vet = await Vet.findById(vetId);
    if (!vet) {
      return res.status(404).json({
        success: false,
        message: 'Veterinario no encontrado'
      });
    }

    // Obtener configuración de precios (sin caché para obtener valores actualizados)
    let pricingConfig = await PricingConfig.findOne().sort({ updatedAt: -1 });
    if (!pricingConfig) {
      pricingConfig = await PricingConfig.create({});
    }
    // Convertir a objeto plano para evitar problemas de caché
    const config = pricingConfig.toObject();

    // Determinar tipo de vet (clinic o independent)
    const vetType = vet.vetType === 'clinic' ? 'clinic' : 'independent';
    
    // Validar que veterinarios independientes no puedan tener citas en clínica
    if (vetType === 'independent' && appointmentType === 'clinic visit') {
      return res.status(400).json({
        success: false,
        message: 'Los veterinarios independientes no ofrecen consultas en clínica. Solo ofrecen consultas a domicilio y teleconsultas.'
      });
    }
    
    const vetPrices = config.appointments[vetType] || config.appointments.independent;

    // Calcular precio según tipo de consulta
    let consultationPrice = 0;
    if (appointmentType === 'online consultation') {
      consultationPrice = vetPrices.teleconsultation || 0;
    } else if (appointmentType === 'clinic visit') {
      consultationPrice = vetPrices.clinicVisit || 20000;
    } else if (appointmentType === 'home visit') {
      consultationPrice = vetPrices.homeVisit || 35000;
    }

    res.json({
      success: true,
      pricing: {
        consultationPrice,
        currency: 'CLP',
        appointmentType,
        vetType
      }
    });
  } catch (error) {
    console.error('Error estimating appointment pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular el precio',
      error: error.message
    });
  }
};

// ✅ Create a new appointment
export const createAppointment = async (req, res) => {
  try {
    const { userId, vetId, petId, appointmentDate, scheduledTime, appointmentType, payment } = req.body;

    // Error Handling - Check if required fields exist
    if (!userId || !vetId || !petId || !appointmentDate || !scheduledTime || !appointmentType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Convert date properly - Parsear en hora local para evitar problemas de UTC
    // appointmentDate viene como string "YYYY-MM-DD" desde el frontend
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
    
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // Validar que la fecha y hora sean en el futuro
    // Usar hora local de Chile
    const now = new Date();
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
    
    if (appointmentDateTime <= now) {
      return res.status(400).json({ 
        message: "No puedes reservar una cita en el pasado. Por favor selecciona una fecha y hora futura." 
      });
    }

    // Validar que la mascota existe y no está eliminada
    const pet = await Pet.findOne({ _id: petId, isDeleted: { $ne: true } });
    if (!pet) {
      return res.status(404).json({ message: "Mascota no encontrada o eliminada." });
    }

    // Validar que la mascota pertenece al usuario
    if (pet.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "No tienes permiso para agendar citas con esta mascota." });
    }

    // Obtener información del veterinario para validar horarios de atención
    const vet = await Vet.findById(vetId);
    if (!vet) {
      return res.status(404).json({ message: "Veterinario no encontrado." });
    }

    // Validar que veterinarios independientes no puedan tener citas en clínica
    if (vet.vetType === 'independent' && appointmentType === 'clinic visit') {
      return res.status(400).json({ 
        message: "Los veterinarios independientes no ofrecen consultas en clínica. Solo ofrecen consultas a domicilio y teleconsultas." 
      });
    }

    // Validar que las teleconsultas estén habilitadas si es una consulta en línea
    if (appointmentType === 'online consultation' && !vet.teleconsultationsEnabled) {
      return res.status(400).json({ 
        message: "Este veterinario no tiene habilitadas las teleconsultas en este momento." 
      });
    }

    // Validar que sea al menos el día siguiente (no validar día hábil, depende de horarios configurados)
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const appointmentDateOnly = new Date(year, month - 1, day);
    
    // Solo validar que no sea hoy o en el pasado
    if (appointmentDateOnly.getTime() < todayLocal.getTime()) {
      return res.status(400).json({ 
        message: "Solo se pueden agendar citas para mañana en adelante." 
      });
    }

    // Validar que el horario esté dentro de los horarios de atención del vet/clínica
    if (!vet.openingHours || vet.openingHours.length === 0) {
      return res.status(400).json({ 
        message: "El veterinario no tiene horarios de atención configurados." 
      });
    }

    const appointmentDayOfWeek = appointmentDateTime.getDay(); // 0 = domingo, 1 = lunes, etc.
    // MongoDB guarda: 0 = domingo, 1 = lunes, ..., 6 = sábado
    const daySchedule = vet.openingHours.find(h => h.day === appointmentDayOfWeek);
    
    if (!daySchedule) {
      return res.status(400).json({ 
        message: "El veterinario no atiende en este día de la semana." 
      });
    }

    // Si está abierto 24h, permitir cualquier hora
    if (daySchedule.open24h) {
      // No hay restricciones de horario
    } else if (daySchedule.open && daySchedule.close) {
      // Validar que el horario esté dentro del rango configurado
      const [openHour, openMin] = daySchedule.open.split(':').map(Number);
      const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;
      const appointmentTimeMinutes = hours * 60 + minutes;
      
      // Validar que el horario esté dentro del rango (considerando que las citas son de 1 hora)
      // El horario de inicio debe estar antes del horario de cierre
      if (appointmentTimeMinutes < openTime || appointmentTimeMinutes >= closeTime) {
        return res.status(400).json({ 
          message: `El horario seleccionado está fuera del horario de atención (${daySchedule.open} - ${daySchedule.close}).` 
        });
      }
    } else {
      // Si no tiene horarios específicos configurados para este día, rechazar
      return res.status(400).json({ 
        message: "El veterinario no tiene horarios específicos configurados para este día." 
      });
    }

    // Validar que no haya conflicto de horario considerando solapamientos
    // Las citas duran 1 hora, por lo que debemos verificar rangos de tiempo
    // Constante: duración de las citas en minutos
    const APPOINTMENT_DURATION_MINUTES = 60;
    
    // Calcular hora de inicio y fin de la nueva cita en minutos desde medianoche
    const [startHours, startMinutes] = scheduledTime.split(':').map(Number);
    const appointmentStartMinutes = startHours * 60 + startMinutes;
    const appointmentEndMinutes = appointmentStartMinutes + APPOINTMENT_DURATION_MINUTES;
    
    // Buscar todas las citas del mismo vet en el mismo día que no estén canceladas
    // Excluir urgencias (isEmergency: false o no definido) ya que son inmediatas y no programadas
    const existingAppointments = await Appointment.find({
      vetId,
      appointmentDate: parsedDate,
      isEmergency: { $ne: true }, // Excluir urgencias
      $and: [
        { status: { $ne: 'cancelled' } },
        {
          $or: [
            { isPaid: true },
            { status: { $in: ['scheduled', 'completed', 'in_progress'] } }
          ]
        }
      ]
    }).populate('petId', 'name');
    
    // Verificar solapamientos con todas las citas existentes
    for (const existing of existingAppointments) {
      const [existingHours, existingMinutes] = existing.scheduledTime.split(':').map(Number);
      const existingStartMinutes = existingHours * 60 + existingMinutes;
      const existingEndMinutes = existingStartMinutes + APPOINTMENT_DURATION_MINUTES;
      
      // Verificar si hay solapamiento
      // Solapamiento ocurre si: (nuevaInicio < existenteFin) && (nuevaFin > existenteInicio)
      const hasOverlap = (appointmentStartMinutes < existingEndMinutes) && 
                         (appointmentEndMinutes > existingStartMinutes);
      
      if (hasOverlap) {
        const existingTimeFormatted = existing.scheduledTime;
        const existingPetName = existing.petId?.name || 'otra cita';
        return res.status(409).json({ 
          message: `Este horario se solapa con una cita existente a las ${existingTimeFormatted} (${existingPetName}). Por favor selecciona otro horario disponible.` 
        });
      }
    }

    // Validar que el horario no esté bloqueado (considerando solapamientos)
    // Reutilizar appointmentDateOnly que ya fue declarado arriba
    const appointmentDateEnd = new Date(parsedDate);
    appointmentDateEnd.setHours(23, 59, 59, 999);

    // Buscar bloqueos que se solapen con la nueva cita (duración de 1 hora)
    const blockedSlots = await BlockedSlot.find({
      vetId,
      date: {
        $gte: appointmentDateOnly,
        $lte: appointmentDateEnd
      }
    });

    // Verificar solapamientos con bloqueos existentes
    for (const block of blockedSlots) {
      const [blockStartHours, blockStartMins] = block.startTime.split(':').map(Number);
      const [blockEndHours, blockEndMins] = block.endTime.split(':').map(Number);
      const blockStartMinutesTotal = blockStartHours * 60 + blockStartMins;
      const blockEndMinutesTotal = blockEndHours * 60 + blockEndMins;
      
      // Verificar si hay solapamiento entre la cita y el bloqueo
      const hasOverlap = (appointmentStartMinutes < blockEndMinutesTotal) && 
                         (appointmentEndMinutes > blockStartMinutesTotal);
      
      if (hasOverlap) {
        return res.status(409).json({ 
          message: "Este horario está bloqueado y no está disponible para agendar." 
        });
      }
    }

    // Determinar precio según tipo de consulta usando configuración
    const isOnlineConsultation = appointmentType === 'online consultation';
    
    // Obtener configuración de precios (sin caché para obtener valores actualizados)
    let pricingConfig = await PricingConfig.findOne().sort({ updatedAt: -1 });
    if (!pricingConfig) {
      pricingConfig = await PricingConfig.create({});
    }
    // Convertir a objeto plano para evitar problemas de caché
    const config = pricingConfig.toObject();
    
    // Determinar tipo de vet (clinic o independent)
    const vetType = vet.vetType === 'clinic' ? 'clinic' : 'independent';
    const vetPrices = config.appointments[vetType] || config.appointments.independent;
    
    // Calcular precio según tipo de consulta
    let consultationPrice = 0;
    if (isOnlineConsultation) {
      consultationPrice = vetPrices.teleconsultation || 0;
    } else if (appointmentType === 'clinic visit') {
      consultationPrice = vetPrices.clinicVisit || 20000;
    } else if (appointmentType === 'home visit') {
      consultationPrice = vetPrices.homeVisit || 35000;
    }
    
    // Determinar isPaid según método de pago y precio
    // Solo marcar como pagada automáticamente si:
    // - Es teleconsulta Y el precio es 0 (gratis)
    // - O el método de pago es dev_bypass o cash
    // Para mercadopago, isPaid será false hasta que se confirme el pago
    const paymentMethod = payment?.method || (isOnlineConsultation && consultationPrice === 0 ? null : 'mercadopago');
    
    // Validar que el usuario tenga al menos una tarjeta guardada (excepto dev_bypass, cash, o si no requiere pago)
    if (paymentMethod && paymentMethod !== 'dev_bypass' && paymentMethod !== 'cash') {
      const SavedCard = (await import('../models/SavedCard.js')).default;
      const hasCard = await SavedCard.findOne({
        userId,
        isActive: true,
        provider: 'mercadopago'
      });

      if (!hasCard) {
        return res.status(400).json({
          success: false,
          message: 'Debes tener al menos una tarjeta guardada para realizar pagos. Por favor, agrega una tarjeta en la sección de configuración.',
          code: 'NO_CARD_SAVED'
        });
      }
    }
    
    let isPaid = false;
    if (paymentMethod === 'dev_bypass' || paymentMethod === 'cash') {
      isPaid = true;
    } else if (isOnlineConsultation && consultationPrice === 0) {
      isPaid = true; // Teleconsulta gratis se marca como pagada
    } else {
      isPaid = false; // Requiere pago
    }
    
    console.log(`Tipo de consulta: ${appointmentType}`);
    console.log(`Tipo de vet: ${vetType}`);
    console.log(`Precio: $${consultationPrice} CLP`);
    console.log(`Método de pago: ${paymentMethod || 'N/A'}`);
    console.log(`Estado de pago: ${isPaid ? 'PAGADO' : 'PENDIENTE'}`);

    // Para citas agendadas (no urgencias), automáticamente se aceptan (status: 'scheduled')
    // Las urgencias quedan como 'pending' hasta que el vet las acepte
    const appointmentStatus = 'scheduled'; // Las citas agendadas se aceptan automáticamente

    // Create the appointment with appointmentType
    const newAppointment = new Appointment({
      userId,
      vetId,
      petId,
      appointmentDate: parsedDate,
      scheduledTime,
      appointmentType,
      consultationPrice,
      isPaid,
      status: appointmentStatus, // Aceptada automáticamente
      payment: {
        method: paymentMethod,
        savedTokenId: payment?.savedTokenId || null,
        transactionId: null
      }
    });

    const savedAppointment = await newAppointment.save();
    console.log("Appointment saved:", savedAppointment);
    console.log("Appointment ID:", savedAppointment._id);
    console.log(`Estado de pago: ${savedAppointment.isPaid ? 'PAGADO' : 'PENDIENTE'}`);


    return res.status(201).json({ 
      message: "Appointment created successfully.", 
      appointment: savedAppointment 
    });


  } catch (error) {
    console.error("Error creating appointment:", error);
    return res.status(500).json({ message: "Server error. Could not create appointment." });
  }
};



// Get all appointments for a user
export const getAppointmentsForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("getAppointmentsForUser - Decoded userId from token:", req.userId);
    console.log("getAppointmentsForUser - Requested userId from params:", userId);

    // Ensure the userId in token matches the userId in the request (convertir ambos a string para comparar)
    const tokenUserId = String(req.userId || req.user?.id || '');
    const paramUserId = String(userId || '');

    if (tokenUserId !== paramUserId) {
      console.log("UserId mismatch:", { tokenUserId, paramUserId });
      return res.status(403).json({ message: "You can only access your own appointments." });
    }

    const appointments = await Appointment.find({ userId: paramUserId })
      .populate('vetId', 'name profileImage specialization')
      .populate('petId', 'name image species breed')
      .sort({ appointmentDate: -1 });

    // Retornar array vacío en lugar de 404 si no hay citas
    return res.status(200).json({ appointments: appointments || [] });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({ message: "Server error. Could not fetch appointments." });
  }
};

// Get completed appointments without rating (for reminder)
export const getUnratedCompletedAppointments = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Importar Rating aquí para evitar dependencia circular
    const Rating = (await import('../models/Rating.js')).default;

    // Obtener todas las citas completadas del usuario
    const completedAppointments = await Appointment.find({
      userId,
      $or: [
        { status: 'completed' },
        { 'tracking.status': 'completed' }
      ]
    })
      .populate('vetId', 'name profileImage')
      .populate('petId', 'name image')
      .sort({ appointmentDate: -1 })
      .limit(10);

    // Obtener todas las calificaciones existentes
    const ratings = await Rating.find({ 
      appointmentId: { $in: completedAppointments.map(apt => apt._id) }
    });

    const ratedAppointmentIds = new Set(ratings.map(r => r.appointmentId.toString()));

    // Filtrar citas sin calificar y sin recordatorio mostrado
    const unratedAppointments = completedAppointments.filter(apt => {
      const isRated = ratedAppointmentIds.has(apt._id.toString());
      const reminderShown = apt.ratingReminderShown || false;
      return !isRated && !reminderShown;
    });

    res.json({
      success: true,
      appointments: unratedAppointments,
      count: unratedAppointments.length
    });
  } catch (error) {
    console.error('Error fetching unrated appointments:', error);
    res.status(500).json({ message: 'Error al obtener citas sin calificar', error: error.message });
  }
};

// Mark rating reminder as shown
export const markRatingReminderShown = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    if (appointment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No tienes permiso para esta acción' });
    }

    appointment.ratingReminderShown = true;
    await appointment.save();

    res.json({
      success: true,
      message: 'Recordatorio marcado como mostrado'
    });
  } catch (error) {
    console.error('Error marking rating reminder:', error);
    res.status(500).json({ message: 'Error al marcar recordatorio', error: error.message });
  }
};

// Update appointment status with logging
export const updateAppointmentStatus = async (req, res) => {
  console.log("Incoming request to update appointment status",req.body,req.params.appointmentId);

  try {
    const { status } = req.body;
    const appointmentId = req.params.appointmentId;
    const io = req.app.get('io'); // Get io from app

    // Validate inputs
    if (!appointmentId || !status) {
      console.warn("Missing appointmentId or status");
      return res.status(400).json({ message: "Appointment ID and status are required." });
    }

    const validStatuses = [
      'pending', 
      'scheduled', 
      'completed', 
      'cancelled',
      'cancelled_by_vet_on_time',
      'cancelled_late_by_vet',
      'cancelled_by_tutor',
      'no_show_vet',
      'no_show_tutor'
    ];
    
    if (!validStatuses.includes(status)) {
      console.warn("Invalid status:", status);
      return res.status(400).json({ message: "Invalid status provided." });
    }

    // Get appointment first to check if it's an emergency
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.warn("No appointment found with ID:", appointmentId);
      return res.status(404).json({ message: "Appointment not found." });
    }

    const isEmergency = appointment.isEmergency;
    const updateData = { status };

    // If it's an emergency and being completed, also update tracking.status
    if (isEmergency && status === 'completed') {
      updateData['tracking.status'] = 'completed';
      updateData['tracking.completedAt'] = new Date();
    }

    console.log("Attempting to update appointment in DB...");
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    ).populate('userId', 'name').populate('vetId', 'name');

    if (!updatedAppointment) {
      console.warn("No appointment found with ID:", appointmentId);
      return res.status(404).json({ message: "Appointment not found." });
    }

    // If it's an emergency and being completed, handle emergency-specific logic
    if (isEmergency && status === 'completed') {
      // Liberar veterinario
      if (updatedAppointment.vetId) {
        await Vet.findByIdAndUpdate(updatedAppointment.vetId._id || updatedAppointment.vetId, {
          currentStatus: 'available',
          activeEmergency: null
        });
      }
      
      // Registrar ganancia del veterinario si el servicio está pagado
      if (updatedAppointment.isPaid) {
        await recordVetEarning(updatedAppointment);
      }

      // Emit socket events to notify both panels
      if (io) {
        const emergencyNamespace = io.of('/emergency');
        
        // Notify all connected clients in the emergency room
        emergencyNamespace.to(`emergency:${appointmentId}`).emit('status:updated', {
          status: 'completed',
          message: 'Urgencia completada',
          appointmentId
        });

        // Notify user specifically
        if (updatedAppointment.userId) {
          const userId = updatedAppointment.userId._id || updatedAppointment.userId;
          emergencyNamespace.to(`user:${userId}`).emit('emergency:completed', {
            appointmentId,
            message: 'Tu urgencia ha sido completada'
          });
        }

        // Notify vet specifically
        if (updatedAppointment.vetId) {
          const vetId = updatedAppointment.vetId._id || updatedAppointment.vetId;
          emergencyNamespace.to(`vet:${vetId}`).emit('emergency:completed', {
            appointmentId,
            message: 'Urgencia completada exitosamente'
          });
        }

        // Request rating
        emergencyNamespace.to(`emergency:${appointmentId}`).emit('request:rating');
      }
    }

    console.log("Appointment updated:", updatedAppointment);

    return res.status(200).json({
      message: "Appointment status updated successfully.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return res.status(500).json({ message: "Server error. Could not update appointment status." });
  }
};

// Update emergency tracking status
export const updateTrackingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { appointmentId } = req.params;
    const io = req.app.get('io');

    if (!appointmentId || !status) {
      return res.status(400).json({ 
        success: false,
        message: "Appointment ID and status are required." 
      });
    }

    // Validar que el status sea válido para tracking
    const validTrackingStatuses = ['accepted', 'on-way', 'arrived', 'tutor-arrived', 'in-service', 'completed', 'cancelled'];
    if (!validTrackingStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid tracking status. Must be one of: ${validTrackingStatuses.join(', ')}` 
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: "Appointment not found." 
      });
    }

    // Verificar que sea una urgencia
    if (!appointment.isEmergency) {
      return res.status(400).json({ 
        success: false,
        message: "This endpoint is only for emergency appointments." 
      });
    }

    // Verificar que el veterinario sea el asignado
    const vetId = req.userId || req.user?.id;
    if (appointment.vetId?.toString() !== vetId?.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "You can only update tracking status for your own assigned emergencies." 
      });
    }

    // Actualizar tracking.status
    const updateData = {
      'tracking.status': status
    };

    // Si se actualiza a tutor-arrived, registrar la fecha
    if (status === 'tutor-arrived') {
      updateData['tracking.tutorArrivedAt'] = new Date();
    }

    // Si se actualiza a in-service, también actualizar el status del appointment
    if (status === 'in-service') {
      updateData.status = 'in_progress';
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    ).populate('vetId').populate('petId').populate('userId');

    // Emitir evento socket para sincronizar
    if (io) {
      const emergencyNamespace = io.of('/emergency');
      emergencyNamespace.to(`emergency:${appointmentId}`).emit('status:updated', {
        status: status,
        message: `Estado actualizado a ${status}`,
        appointmentId: appointmentId
      });

      // Notificar al veterinario específicamente
      if (updatedAppointment?.vetId?._id) {
        emergencyNamespace.to(`vet:${updatedAppointment.vetId._id}`).emit('status:updated', {
          status: status,
          message: `Estado actualizado a ${status}`,
          appointmentId: appointmentId
        });
      }
    }

    res.json({
      success: true,
      message: "Tracking status updated successfully",
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error("Error updating tracking status:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error. Could not update tracking status.",
      error: error.message 
    });
  }
};



export const getAppointmentsByVetId = async (req, res) => {
  const { vetId } = req.params;
  try {
    const appointments = await Appointment.find({ vetId })
      .populate('petId', 'name breed image species')
      .populate('vetId', 'name profileImage')
      .populate('userId', 'name phoneNumber email')
      .sort({ appointmentDate: -1 });
    res.status(200).json({ appointments });
  } catch (error) {
    console.error("Error fetching vet appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};

// In your appointmentController.js
export const updatePrescription = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { medication, dosage, instructions } = req.body;

    if (!medication || !dosage || !instructions) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        prescription: { medication, dosage, instructions },
        status: "completed", // Mark the appointment as completed
      },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Registrar ganancia del veterinario si el servicio está pagado
    if (updatedAppointment.isPaid) {
      await recordVetEarning(updatedAppointment);
    }

    return res.status(200).json({
      message: "Prescription updated and appointment completed.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Error updating prescription:", error);
    return res.status(500).json({ message: "Server error. Could not update prescription." });
  }
};

// Get single appointment by ID
export const getAppointmentById = async (req, res) => {
  console.log("📥 Fetching appointment by ID:", req.params.id);

  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("userId", "fullName email")
      .populate("vetId", "fullName specialization")
      .populate("petId");

    if (!appointment) {
      console.warn("Appointment not found.");
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json({ appointment });
  } catch (error) {
    console.error("💥 Error fetching appointment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPetById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.userId;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const pet = await Pet.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Mascota no encontrada' });
    }

    // Verificar si el usuario es el dueño de la mascota
    const isOwner = pet.userId.toString() === userId.toString();
    
    // Si es el dueño, permitir acceso
    if (isOwner) {
      return res.status(200).json(pet);
    }

    // Si es un veterinario, verificar que tiene una cita con esta mascota
    // Permitir acceso a cualquier cita del veterinario (independientemente del estado)
    if (userRole === 'Vet') {
      const appointment = await Appointment.findOne({
        petId: id,
        vetId: userId
      });

      if (appointment) {
        return res.status(200).json(pet);
      }
    }

    // Si no es el dueño ni tiene una cita relacionada, denegar acceso
    return res.status(403).json({ success: false, message: 'No autorizado para acceder a esta mascota' });
  } catch (err) {
    console.error("Error fetching pet:", err);
    res.status(500).json({ success: false, message: 'Error al obtener la mascota' });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select('name'); // only return name
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getBookedTimes = async (req, res) => {
  const { vetId, date } = req.params;
  try {
    // Parsear fecha en hora local para evitar problemas de zona horaria
    let appointmentDate;
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      appointmentDate = new Date(year, month - 1, day);
    } else {
      appointmentDate = new Date(date);
    }
    
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Only consider appointments that are paid OR have status 'scheduled'/'completed'
    // This prevents unpaid appointments from blocking time slots indefinitely
    const appointments = await Appointment.find({
      vetId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      $or: [
        { isPaid: true },
        { status: { $in: ['scheduled', 'completed', 'in_progress'] } }
      ],
      status: { $ne: 'cancelled' }
    });

    // Get blocked slots for this date
    // Buscar bloqueos que coincidan con el día usando un rango que cubra todo el día
    // Usamos un rango amplio para capturar bloqueos independientemente de cómo estén guardadas las fechas
    const nextDayStart = new Date(startOfDay);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    
    const blockedSlots = await BlockedSlot.find({
      vetId,
      date: {
        $gte: startOfDay,
        $lt: nextDayStart // Menor que el inicio del día siguiente
      }
    });

    // Combine booked times from appointments
    const bookedTimes = appointments.map((appt) => appt.scheduledTime);

    // Add times from blocked slots (convert ranges to individual times if needed)
    blockedSlots.forEach((block) => {
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);
      
      // Convertir minutos totales para facilitar la comparación
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      // Generate all 60-minute slots within the blocked range (appointments are 1 hour long)
      let currentMinutes = startMinutes;
      while (currentMinutes < endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        if (!bookedTimes.includes(timeStr)) {
          bookedTimes.push(timeStr);
        }
        // Increment by 60 minutes (1 hour) for appointment slots
        currentMinutes += 60;
      }
    });

    res.json(bookedTimes);
  } catch (error) {
    console.error('Error fetching booked times:', error);
    res.status(500).json({ message: "Failed to fetch booked times" });
  }
};


export const getAllAppointments = async (req, res) => {
  try {
    // Optionally, add authorization here (req.user, etc.)

    const appointments = await Appointment.find({})
      .populate('vetId', 'name email phoneNumber')    // select fields you want from Vet
      .populate('userId', 'name email phoneNumber')   // select fields you want from User (owner)
      .populate('petId', 'name species breed');       // select fields from Pet

    res.json({ appointments });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ message: 'Server error fetching appointments' });
  }
};

// Get all appointments for calendar view (with blocked slots)
export const getVetSchedule = async (req, res) => {
  try {
    const { vetId } = req.params;
    const { startDate, endDate } = req.query;

    if (!vetId) {
      return res.status(400).json({ message: 'Vet ID is required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    end.setMonth(end.getMonth() + 1); // Default to next month

    // Get appointments
    // Excluir urgencias de la agenda ya que son inmediatas y se gestionan en el panel de urgencias
    const appointments = await Appointment.find({
      vetId,
      appointmentDate: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
      isEmergency: { $ne: true } // Excluir urgencias de la agenda
    })
      .populate('userId', 'name phoneNumber')
      .populate('petId', 'name species breed image')
      .sort({ appointmentDate: 1, scheduledTime: 1 });

    // Get blocked slots
    const blockedSlots = await BlockedSlot.find({
      vetId,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1, startTime: 1 });

    res.json({
      appointments,
      blockedSlots
    });
  } catch (error) {
    console.error('Error fetching vet schedule:', error);
    res.status(500).json({ message: 'Server error fetching schedule' });
  }
};

// Block a time slot
export const blockTimeSlot = async (req, res) => {
  try {
    const { vetId } = req.params;
    const { 
      date, 
      startTime, 
      endTime, 
      reason, 
      isRecurring, 
      recurringPattern,
      recurringDaysOfWeek,
      endDate,
      blockType,
      weekStartDate,
      weekEndDate
    } = req.body;

    // Validate that the vet exists
    const vet = await Vet.findById(vetId);
    if (!vet) {
      return res.status(404).json({ message: 'Veterinarian not found' });
    }

    const createdSlots = [];

    // Bloqueo de semana completa
    if (blockType === 'week' && weekStartDate && weekEndDate) {
      // Parsear fechas en hora local para evitar problemas de zona horaria
      let start, end;
      if (typeof weekStartDate === 'string' && weekStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [startYear, startMonth, startDay] = weekStartDate.split('-').map(Number);
        start = new Date(startYear, startMonth - 1, startDay);
      } else {
        start = new Date(weekStartDate);
      }
      
      if (typeof weekEndDate === 'string' && weekEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [endYear, endMonth, endDay] = weekEndDate.split('-').map(Number);
        end = new Date(endYear, endMonth - 1, endDay);
      } else {
        end = new Date(weekEndDate);
      }
      
      // Validar que no haya citas en esa semana
      const conflictingAppointments = await Appointment.find({
        vetId,
        appointmentDate: {
          $gte: start,
          $lte: end
        },
        status: { $ne: 'cancelled' }
      });

      if (conflictingAppointments.length > 0) {
        return res.status(409).json({
          message: 'No se puede bloquear esta semana porque ya tiene citas agendadas'
        });
      }

      // Crear un bloqueo por cada día de la semana
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        
        const blockedSlot = new BlockedSlot({
          vetId,
          date: dayStart,
          startTime: '00:00',
          endTime: '23:59',
          reason: reason || 'Semana bloqueada',
          blockType: 'week',
          isRecurring: false
        });

        await blockedSlot.save();
        createdSlots.push(blockedSlot);
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return res.status(201).json({
        message: 'Semana bloqueada exitosamente',
        blockedSlots: createdSlots,
        count: createdSlots.length
      });
    }

    // NOTA: El bloqueo de "Horario Laboral" ahora se maneja como "recurring" con isInfinite: true
    // Este bloque de código se mantiene por compatibilidad, pero debería eliminarse en el futuro
    if (blockType === 'business-hours' && recurringDaysOfWeek && recurringDaysOfWeek.length > 0) {
      // Parsear fecha en hora local para evitar problemas de zona horaria
      let startDate;
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number);
        startDate = new Date(year, month - 1, day);
      } else {
        startDate = new Date(date);
      }
      // Para horario laboral sin fin, usar fecha de 1 año en el futuro
      const recurringEndDate = new Date(startDate);
      recurringEndDate.setFullYear(recurringEndDate.getFullYear() + 1);
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      // Validar que no haya conflictos en los días seleccionados hasta la fecha de fin
      let checkDate = new Date(startDate);
      let conflictCount = 0;
      const maxChecks = 365; // Verificar máximo 365 días (1 año)
      let daysChecked = 0;

      while (checkDate <= recurringEndDate && daysChecked < maxChecks) {
        const dayOfWeek = checkDate.getDay();
        
        if (recurringDaysOfWeek.includes(dayOfWeek)) {
          const dayStart = new Date(checkDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(checkDate);
          dayEnd.setHours(23, 59, 59, 999);

          const conflictingAppointments = await Appointment.find({
            vetId,
            appointmentDate: {
              $gte: dayStart,
              $lte: dayEnd
            },
            scheduledTime: { $gte: startTime, $lt: endTime },
            status: { $ne: 'cancelled' }
          });

          if (conflictingAppointments.length > 0) {
            conflictCount += conflictingAppointments.length;
          }
        }
        
        checkDate.setDate(checkDate.getDate() + 1);
        daysChecked++;
      }

      if (conflictCount > 0) {
        return res.status(409).json({
          message: `No se puede establecer el horario laboral porque ya tiene ${conflictCount} cita(s) agendada(s) en los días laborales. Por favor, cancela o reasigna esas citas primero.`
        });
      }

      // Crear bloqueos para cada día laboral hasta 1 año en el futuro
      const currentDate = new Date(startDate);
      let slotsCreated = 0;
      const maxSlots = 260; // Aproximadamente 52 semanas * 5 días laborales

      while (currentDate <= recurringEndDate && slotsCreated < maxSlots) {
        const dayOfWeek = currentDate.getDay();
        
        if (recurringDaysOfWeek.includes(dayOfWeek)) {
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);

          const blockedSlot = new BlockedSlot({
            vetId,
            date: dayStart,
            startTime,
            endTime,
            reason: reason || 'Horario laboral',
            blockType: 'business-hours',
            isRecurring: true,
            recurringPattern: 'weekly',
            recurringDaysOfWeek: [dayOfWeek],
            endDate: recurringEndDate,
            isInfinite: true // Marcar como infinito (aunque técnicamente tiene fecha de fin)
          });

          await blockedSlot.save();
          createdSlots.push(blockedSlot);
          slotsCreated++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return res.status(201).json({
        message: 'Horario laboral establecido exitosamente. Se aplicará semanalmente de Lunes a Viernes.',
        blockedSlots: createdSlots,
        count: createdSlots.length,
        note: 'Este horario se repetirá automáticamente. Puedes desbloquear días específicos si necesitas excepciones.'
      });
    }

    // Bloqueo recurrente (horario fijo)
    if (blockType === 'recurring' && recurringDaysOfWeek && recurringDaysOfWeek.length > 0) {
      // Si isInfinite es true, usar 1 año como fecha de fin
      const isInfinite = req.body.isInfinite === true || req.body.isInfinite === 'true';
      if (!isInfinite && !endDate) {
        return res.status(400).json({ 
          message: 'Debes proporcionar una fecha de fin o marcar "Sin fecha de fin"' 
        });
      }
      // Parsear fecha en hora local para evitar problemas de zona horaria
      let startDate;
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number);
        startDate = new Date(year, month - 1, day);
      } else {
        startDate = new Date(date);
      }
      
      let recurringEndDate;
      if (isInfinite) {
        // Para horario sin fin, usar fecha de 1 año en el futuro
        recurringEndDate = new Date(startDate);
        recurringEndDate.setFullYear(recurringEndDate.getFullYear() + 1);
      } else {
        // Parsear endDate también en hora local
        if (typeof endDate === 'string' && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
          recurringEndDate = new Date(endYear, endMonth - 1, endDay);
        } else {
          recurringEndDate = new Date(endDate);
        }
      }
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      // Validar que no haya conflictos en los días seleccionados hasta la fecha de fin
      let checkDate = new Date(startDate);
      while (checkDate <= recurringEndDate) {
        const dayOfWeek = checkDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        
        if (recurringDaysOfWeek.includes(dayOfWeek)) {
          const dayStart = new Date(checkDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(checkDate);
          dayEnd.setHours(23, 59, 59, 999);

          const conflictingAppointments = await Appointment.find({
            vetId,
            appointmentDate: {
              $gte: dayStart,
              $lte: dayEnd
            },
            scheduledTime: { $gte: startTime, $lt: endTime },
            status: { $ne: 'cancelled' }
          });

          if (conflictingAppointments.length > 0) {
            return res.status(409).json({
              message: `No se puede bloquear este horario porque ya tiene citas agendadas el ${checkDate.toLocaleDateString('es-ES', { weekday: 'long' })}`
            });
          }
        }
        
        checkDate.setDate(checkDate.getDate() + 1);
      }

      // Crear bloqueos para cada día de la semana seleccionado hasta la fecha de fin
      const currentDate = new Date(startDate);
      while (currentDate <= recurringEndDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (recurringDaysOfWeek.includes(dayOfWeek)) {
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);

          const blockedSlot = new BlockedSlot({
            vetId,
            date: dayStart,
            startTime,
            endTime,
            reason: reason || 'Horario bloqueado',
            blockType: 'recurring',
            isRecurring: true,
            recurringPattern: 'weekly',
            recurringDaysOfWeek: [dayOfWeek],
            endDate: recurringEndDate,
            isInfinite: isInfinite
          });

          await blockedSlot.save();
          createdSlots.push(blockedSlot);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return res.status(201).json({
        message: isInfinite 
          ? 'Horario fijo establecido exitosamente. Se aplicará semanalmente durante 1 año.'
          : 'Horario recurrente bloqueado exitosamente',
        blockedSlots: createdSlots,
        count: createdSlots.length,
        note: isInfinite 
          ? 'Este horario se repetirá automáticamente. Puedes desbloquear días específicos si necesitas excepciones.'
          : undefined
      });
    }

    // Bloqueo único (día específico)
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date, startTime, and endTime are required' });
    }

    // Parsear fecha en hora local para evitar problemas de zona horaria
    // Si viene como "YYYY-MM-DD", parsear manualmente
    let appointmentDate;
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      appointmentDate = new Date(year, month - 1, day);
    } else {
      appointmentDate = new Date(date);
    }
    
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictingAppointments = await Appointment.find({
      vetId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      scheduledTime: { $gte: startTime, $lt: endTime },
      status: { $ne: 'cancelled' }
    });

    if (conflictingAppointments.length > 0) {
      return res.status(409).json({
        message: 'No se puede bloquear este horario porque ya tiene citas agendadas'
      });
    }

    // Usar startOfDay para guardar la fecha normalizada en hora local
    const blockedSlot = new BlockedSlot({
      vetId,
      date: startOfDay, // Usar startOfDay que ya está normalizado a medianoche en hora local
      startTime,
      endTime,
      reason: reason || 'Horario bloqueado',
      blockType: blockType || 'single',
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? recurringPattern : null
    });

    await blockedSlot.save();

    res.status(201).json({
      message: 'Horario bloqueado exitosamente',
      blockedSlot
    });
  } catch (error) {
    console.error('Error blocking time slot:', error);
    res.status(500).json({ message: 'Server error blocking time slot', error: error.message });
  }
};

// Unblock a time slot
export const unblockTimeSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    const blockedSlot = await BlockedSlot.findById(slotId);
    if (!blockedSlot) {
      return res.status(404).json({ message: 'Horario bloqueado no encontrado' });
    }

    await BlockedSlot.findByIdAndDelete(slotId);

    res.json({ message: 'Horario desbloqueado exitosamente' });
  } catch (error) {
    console.error('Error unblocking time slot:', error);
    res.status(500).json({ message: 'Server error unblocking time slot' });
  }
};

// Desbloquear múltiples slots (masivo)
export const unblockMultipleSlots = async (req, res) => {
  try {
    const { vetId } = req.params;
    const { slotIds, dateRange, blockType } = req.body;

    // Validar que el vet existe
    const vet = await Vet.findById(vetId);
    if (!vet) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    let deletedCount = 0;

    // Si se proporcionan IDs específicos
    if (slotIds && Array.isArray(slotIds) && slotIds.length > 0) {
      const result = await BlockedSlot.deleteMany({
        _id: { $in: slotIds },
        vetId
      });
      deletedCount = result.deletedCount;
    }
    // Si se proporciona un rango de fechas
    else if (dateRange && dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);

      const query = {
        vetId,
        date: {
          $gte: start,
          $lte: end
        }
      };

      // Si se especifica un tipo de bloqueo, filtrar por él
      if (blockType) {
        query.blockType = blockType;
      }

      const result = await BlockedSlot.deleteMany(query);
      deletedCount = result.deletedCount;
    }
    // Si se especifica solo un tipo de bloqueo
    else if (blockType) {
      const result = await BlockedSlot.deleteMany({
        vetId,
        blockType
      });
      deletedCount = result.deletedCount;
    }
    else {
      return res.status(400).json({ 
        message: 'Debes proporcionar slotIds, dateRange, o blockType' 
      });
    }

    res.json({ 
      message: `${deletedCount} horario(s) desbloqueado(s) exitosamente`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error unblocking multiple slots:', error);
    res.status(500).json({ message: 'Error al desbloquear horarios' });
  }
};

// Get blocked slots for a vet
export const getBlockedSlots = async (req, res) => {
  try {
    const { vetId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { vetId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const blockedSlots = await BlockedSlot.find(query).sort({ date: 1, startTime: 1 });

    res.json({ blockedSlots });
  } catch (error) {
    console.error('Error fetching blocked slots:', error);
    res.status(500).json({ message: 'Server error fetching blocked slots' });
  }
};

// Constantes de ventanas de cancelación (en horas)
const CANCEL_WINDOWS = {
  'clinic visit': 6,      // 6 horas antes para citas en clínica
  'home visit': 12,       // 12 horas antes para citas a domicilio
  'online consultation': 4 // 4 horas antes para teleconsultas
};

const HARD_LIMIT_MINUTES = 60; // No se puede cancelar menos de 60 minutos antes

// Calcular score de confiabilidad
const calculateReliabilityScore = (vet) => {
  const totalCancellations = (vet.reliability?.totalLateCancellations || 0) + 
                            (vet.reliability?.totalNoShows || 0);
  const totalOnTime = vet.reliability?.totalOnTimeCancellations || 0;
  const totalEmergencyIncidents = vet.reliability?.totalEmergencyIncidents || 0;
  const totalEmergencyFailures = vet.reliability?.totalEmergencyFailures || 0;
  const total = totalCancellations + totalOnTime + totalEmergencyIncidents;

  if (total === 0) return 100;

  // Penalización: cada cancelación tardía resta 10 puntos, cada no-show resta 15
  const latePenalty = (vet.reliability?.totalLateCancellations || 0) * 10;
  const noShowPenalty = (vet.reliability?.totalNoShows || 0) * 15;
  // Penalización fuerte por incidentes de urgencias: cada uno resta 20 puntos
  const emergencyIncidentPenalty = totalEmergencyIncidents * 20;
  
  let score = 100 - latePenalty - noShowPenalty - emergencyIncidentPenalty;
  
  // Bonus por cancelaciones a tiempo (mitiga el impacto)
  if (totalOnTime > 0 && totalCancellations > 0) {
    const onTimeRatio = totalOnTime / total;
    score += onTimeRatio * 5; // Hasta 5 puntos de bonus
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

// Rechazar urgencia (antes de aceptar) - SIN penalización
export const rejectEmergency = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const vetId = req.userId || req.user?.id;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('vetId', 'name')
      .populate('userId', 'name email')
      .populate('petId', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'Urgencia no encontrada' });
    }

    // Solo para urgencias
    if (!appointment.isEmergency) {
      return res.status(400).json({ message: 'Esta función solo aplica para urgencias' });
    }

    // Solo puede rechazar si está pendiente y no ha sido aceptada
    if (appointment.status !== 'pending' && appointment.status !== 'pending_assignment') {
      return res.status(400).json({ 
        message: 'Solo puedes rechazar urgencias que están pendientes de asignación' 
      });
    }

    // Verificar que el vet está en la lista de ofrecidos (opcional, para validación)
    // En este caso, cualquier vet puede rechazar si la urgencia está pendiente

    // Actualizar estado
    appointment.status = 'rejected_by_vet';
    appointment.cancelledBy = 'VET';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || 'Urgencia rechazada por el veterinario';
    appointment.cancellationReasonCode = 'emergency_rejected';

    await appointment.save();

    // Actualizar estadísticas del vet (sin penalización, solo registro)
    const vet = await Vet.findById(vetId);
    if (vet) {
      if (!vet.reliability) {
        vet.reliability = {
          totalLateCancellations: 0,
          totalNoShows: 0,
          totalOnTimeCancellations: 0,
          reliabilityScore: 100,
          totalEmergencyRejections: 0,
          totalEmergencyIncidents: 0,
          totalEmergencyFailures: 0
        };
      }
      vet.reliability.totalEmergencyRejections = (vet.reliability.totalEmergencyRejections || 0) + 1;
      await vet.save();
    }

    // Notificar al sistema para reasignar (vía Socket.IO)
    const io = req.app.get('io');
    if (io) {
      // Emitir evento para que el sistema ofrezca a otro vet
      io.emit('emergency:rejected', {
        appointmentId: appointment._id,
        rejectedBy: vetId,
        reason: reason || 'Rechazada por el veterinario'
      });
      
      // Notificar al usuario vía Socket.IO
      if (appointment.userId) {
        const userId = appointment.userId._id || appointment.userId;
        io.to(`user:${userId}`).emit('emergency:rejected', {
          appointmentId: appointment._id,
          message: `El profesional ${appointment.vetId?.name || 'Veterinario'} rechazó tu urgencia. El sistema está buscando otro profesional disponible.`,
          reason: reason || 'Rechazada por el veterinario'
        });
      }
    }

    // Enviar email de notificación al usuario
    if (appointment.userId && appointment.userId.email) {
      const userEmail = appointment.userId.email;
      const userName = appointment.userId.name || 'Usuario';
      const vetName = appointment.vetId?.name || 'Veterinario';
      const petName = appointment.petId?.name || 'tu mascota';
      
      await sendCancellationEmail(
        userEmail,
        userName,
        vetName,
        appointment.appointmentDate || appointment.createdAt,
        appointment.scheduledTime || 'Urgente',
        petName,
        false, // isLate - rechazo no es tardío
        appointment.cancellationReason || reason,
        null, // appointmentType - es urgencia
        true  // isEmergency
      );
    }

    res.json({
      message: 'Urgencia rechazada. El sistema buscará otro veterinario disponible.',
      appointment
    });

  } catch (error) {
    console.error('Error rejecting emergency:', error);
    res.status(500).json({ message: 'Error del servidor al rechazar la urgencia' });
  }
};

// Reportar incidente de urgencia (después de aceptar) - CON penalización
export const reportEmergencyIncident = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason, requiresReassignment } = req.body;
    const vetId = req.userId || req.user?.id;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Debes proporcionar un motivo del incidente' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('vetId', 'name')
      .populate('userId', 'name email')
      .populate('petId', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'Urgencia no encontrada' });
    }

    // Solo para urgencias
    if (!appointment.isEmergency) {
      return res.status(400).json({ message: 'Esta función solo aplica para urgencias' });
    }

    // Verificar que el vet es el dueño de la urgencia
    const appointmentVetId = appointment.vetId?._id?.toString() || appointment.vetId?.toString();
    if (appointmentVetId !== vetId?.toString()) {
      return res.status(403).json({ message: 'No tienes permiso para reportar incidente en esta urgencia' });
    }

    // Solo puede reportar incidente si ya aceptó la urgencia
    const isAccepted = ['accepted_by_vet', 'in_progress', 'assigned'].includes(appointment.status) ||
                       appointment.tracking?.status === 'accepted' ||
                       appointment.tracking?.status === 'on-way' ||
                       appointment.tracking?.status === 'arrived';

    if (!isAccepted) {
      return res.status(400).json({ 
        message: 'Solo puedes reportar incidente en urgencias que ya has aceptado' 
      });
    }

    // Determinar tipo de incidente según el modo
    let incidentStatus;
    if (appointment.mode === 'clinic') {
      incidentStatus = 'incident_clinic_no_received';
    } else {
      incidentStatus = 'incident_vet_no_arrived';
    }

    // Actualizar la urgencia
    appointment.status = incidentStatus;
    appointment.incident = {
      reportedAt: new Date(),
      reportedBy: appointment.mode === 'clinic' ? 'CLINIC' : 'VET',
      reason: reason,
      requiresReassignment: requiresReassignment !== false, // Por defecto true
      reassignedTo: null // Se asignará en el proceso de reasignación
    };

    await appointment.save();

    // Actualizar estadísticas del vet (CON penalización)
    const vet = await Vet.findById(vetId);
    if (vet) {
      if (!vet.reliability) {
        vet.reliability = {
          totalLateCancellations: 0,
          totalNoShows: 0,
          totalOnTimeCancellations: 0,
          reliabilityScore: 100,
          totalEmergencyRejections: 0,
          totalEmergencyIncidents: 0,
          totalEmergencyFailures: 0
        };
      }
      vet.reliability.totalEmergencyIncidents = (vet.reliability.totalEmergencyIncidents || 0) + 1;
      vet.reliability.totalEmergencyFailures = (vet.reliability.totalEmergencyFailures || 0) + 1;
      
      // Recalcular score de confiabilidad (incluye penalización por incidentes)
      vet.reliability.reliabilityScore = calculateReliabilityScore(vet);
      
      await vet.save();
    }

    // Notificar al tutor y disparar reasignación
    const io = req.app.get('io');
    if (io && appointment.userId) {
      const userId = appointment.userId._id || appointment.userId;
      
      io.to(`user:${userId}`).emit('emergency:incident', {
        appointmentId: appointment._id,
        message: `Lamentamos informarte que el profesional ${appointment.vetId?.name || 'Veterinario'} reportó un incidente y no podrá atender la urgencia. Estamos buscando otro profesional disponible de inmediato.`,
        reason: reason,
        requiresReassignment: true
      });

      // Emitir evento para reasignación automática
      io.emit('emergency:needs_reassignment', {
        appointmentId: appointment._id,
        originalVetId: vetId,
        mode: appointment.mode,
        location: appointment.location,
        priority: 'high'
      });
    }

    // Enviar email de notificación al usuario
    if (appointment.userId && appointment.userId.email) {
      const userEmail = appointment.userId.email;
      const userName = appointment.userId.name || 'Usuario';
      const vetName = appointment.vetId?.name || 'Veterinario';
      const petName = appointment.petId?.name || 'tu mascota';
      
      await sendCancellationEmail(
        userEmail,
        userName,
        vetName,
        appointment.appointmentDate || appointment.createdAt,
        appointment.scheduledTime || 'Urgente',
        petName,
        true, // isLate - incidente es siempre tardío/urgente
        reason,
        null, // appointmentType - es urgencia
        true  // isEmergency
      );
    }

    res.json({
      message: 'Incidente reportado. El sistema está buscando otro veterinario disponible y se ha notificado al tutor.',
      appointment,
      requiresReassignment: true
    });

  } catch (error) {
    console.error('Error reporting emergency incident:', error);
    res.status(500).json({ message: 'Error del servidor al reportar el incidente' });
  }
};

// Cancelar cita por veterinario
export const cancelAppointmentByVet = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason, reasonCode } = req.body;
    const vetId = req.userId || req.user?.id; // ID del vet desde el token

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // Obtener la cita
    const appointment = await Appointment.findById(appointmentId)
      .populate('vetId', 'name')
      .populate('userId', 'name email')
      .populate('petId', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    // Verificar que el vet es el dueño de la cita
    const appointmentVetId = appointment.vetId?._id?.toString() || appointment.vetId?.toString();
    if (appointmentVetId !== vetId?.toString()) {
      return res.status(403).json({ message: 'No tienes permiso para cancelar esta cita' });
    }

    // BLOQUEAR cancelación de urgencias aceptadas
    if (appointment.isEmergency) {
      // Si la urgencia ya fue aceptada, no se puede cancelar normalmente
      if (['accepted_by_vet', 'in_progress', 'assigned'].includes(appointment.status) || 
          appointment.tracking?.status === 'accepted' || 
          appointment.tracking?.status === 'on-way' ||
          appointment.tracking?.status === 'arrived') {
        return res.status(403).json({ 
          message: 'No puedes cancelar una urgencia que ya has aceptado. Si no puedes atender, debes reportar un incidente desde el panel de urgencias.',
          isEmergency: true,
          requiresIncidentReport: true
        });
      }
      // Si está pendiente, debe usar "rechazar" en lugar de "cancelar"
      if (appointment.status === 'pending' || appointment.status === 'pending_assignment') {
        return res.status(403).json({ 
          message: 'Para urgencias pendientes, debes usar la opción "Rechazar urgencia" en lugar de cancelar.',
          isEmergency: true,
          shouldReject: true
        });
      }
    }

    // Verificar que la cita no esté ya cancelada o completada
    if (['completed', 'cancelled', 'cancelled_by_vet_on_time', 'cancelled_late_by_vet', 'cancelled_by_tutor'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Esta cita ya está cancelada o completada' });
    }

    // Calcular fecha y hora de la cita
    const [hours, minutes] = appointment.scheduledTime.split(':').map(Number);
    const appointmentDateTime = new Date(appointment.appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const timeDiffMs = appointmentDateTime - now;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    const timeDiffMinutes = timeDiffMs / (1000 * 60);

    // Verificar hard limit (60 minutos)
    if (timeDiffMinutes < HARD_LIMIT_MINUTES) {
      return res.status(403).json({ 
        message: `No puedes cancelar esta cita desde la app por estar demasiado cerca de la hora (menos de ${HARD_LIMIT_MINUTES} minutos). Contacta a Soporte VetGoNow.`,
        requiresSupport: true
      });
    }

    // Obtener ventana de cancelación según tipo
    const cancelWindow = CANCEL_WINDOWS[appointment.appointmentType] || 6;
    const isOnTime = timeDiffHours >= cancelWindow;
    const isLate = timeDiffHours < cancelWindow && timeDiffMinutes >= HARD_LIMIT_MINUTES;

    let newStatus;
    let penalizaVet = false;

    if (isOnTime) {
      // Cancelación en plazo
      newStatus = 'cancelled_by_vet_on_time';
      penalizaVet = false;
    } else if (isLate) {
      // Cancelación tardía
      newStatus = 'cancelled_late_by_vet';
      penalizaVet = true;
    } else {
      // No debería llegar aquí por el hard limit, pero por seguridad
      return res.status(403).json({ 
        message: 'No puedes cancelar esta cita. Contacta a Soporte VetGoNow.',
        requiresSupport: true
      });
    }

    // Actualizar la cita
    appointment.status = newStatus;
    appointment.cancelledBy = 'VET';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || 'Cancelado por el veterinario';
    appointment.cancellationReasonCode = reasonCode || 'vet_cancellation';
    appointment.penalizaVet = penalizaVet;

    await appointment.save();

    // Si es cancelación tardía, actualizar contadores del vet
    if (penalizaVet) {
      const vet = await Vet.findById(vetId);
      if (vet) {
        if (!vet.reliability) {
          vet.reliability = {
            totalLateCancellations: 0,
            totalNoShows: 0,
            totalOnTimeCancellations: 0,
            reliabilityScore: 100
          };
        }
        vet.reliability.totalLateCancellations = (vet.reliability.totalLateCancellations || 0) + 1;
        vet.reliability.reliabilityScore = calculateReliabilityScore(vet);
        await vet.save();
      }
    } else {
      // Cancelación a tiempo - solo registrar
      const vet = await Vet.findById(vetId);
      if (vet) {
        if (!vet.reliability) {
          vet.reliability = {
            totalLateCancellations: 0,
            totalNoShows: 0,
            totalOnTimeCancellations: 0,
            reliabilityScore: 100
          };
        }
        vet.reliability.totalOnTimeCancellations = (vet.reliability.totalOnTimeCancellations || 0) + 1;
        await vet.save();
      }
    }

    // Notificar al tutor vía Socket.IO
    const io = req.app.get('io');
    if (io && appointment.userId) {
      const userId = appointment.userId._id || appointment.userId;
      
      if (isOnTime) {
        io.to(`user:${userId}`).emit('appointment:cancelled', {
          appointmentId: appointment._id,
          message: `El profesional ${appointment.vetId?.name || 'Veterinario'} ha cancelado tu cita del ${formatDate(appointment.appointmentDate, 'dd/MM/yyyy')} a las ${appointment.scheduledTime}. Puedes reagendar con el mismo profesional o buscar otro disponible.`,
          type: 'on_time',
          canReschedule: true
        });
      } else {
        io.to(`user:${userId}`).emit('appointment:cancelled', {
          appointmentId: appointment._id,
          message: `Lamentamos informarte que el profesional ${appointment.vetId?.name || 'Veterinario'} canceló tu cita con poca anticipación. Hemos priorizado la búsqueda de otro profesional disponible en el mismo horario o el más cercano posible.`,
          type: 'late',
          canReschedule: true,
          priority: true
        });
      }
    }

    // Enviar email de notificación al usuario
    if (appointment.userId && appointment.userId.email) {
      const userEmail = appointment.userId.email;
      const userName = appointment.userId.name || 'Usuario';
      const vetName = appointment.vetId?.name || 'Veterinario';
      const petName = appointment.petId?.name || 'tu mascota';
      
      await sendCancellationEmail(
        userEmail,
        userName,
        vetName,
        appointment.appointmentDate,
        appointment.scheduledTime,
        petName,
        !isOnTime, // isLate
        appointment.cancellationReason || reason,
        appointment.appointmentType, // Tipo de cita (clinic visit, home visit, online consultation)
        appointment.isEmergency || false // isEmergency
      );
    }

    res.json({
      message: isOnTime 
        ? 'Cita cancelada exitosamente' 
        : 'Cita cancelada. Esta cancelación tardía afectará tu reputación en la plataforma.',
      appointment,
      isLate: !isOnTime,
      penalizaVet
    });

  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ message: 'Error del servidor al cancelar la cita' });
  }
};

