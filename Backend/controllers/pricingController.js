import PricingConfig from '../models/PricingConfig.js';

/**
 * Obtener la configuración de precios actual
 * Si no existe, retorna valores por defecto
 */
export const getPricingConfig = async (req, res) => {
  try {
    let config = await PricingConfig.findOne().sort({ updatedAt: -1 });
    
    // Si no existe configuración, crear una con valores por defecto
    if (!config) {
      config = await PricingConfig.create({});
    }
    
    // Migrar estructura antigua a nueva si es necesario
    let configData = config.toObject();
    
    // Si tiene estructura antigua (independent/clinic con normalHours directamente), migrar
    if (configData.emergency?.independent && !configData.emergency?.independent?.home) {
      if (configData.emergency.independent.normalHours !== undefined) {
        config.emergency.independent = {
          home: {
            normalHours: configData.emergency.independent.normalHours || 19990,
            peakHours: configData.emergency.independent.peakHours || 24990
          }
        };
        config.markModified('emergency.independent');
        await config.save();
        configData = config.toObject();
      }
    }
    
    // Si tiene estructura antigua para clínicas
    if (configData.emergency?.clinic && !configData.emergency?.clinic?.home) {
      if (configData.emergency.clinic.normalHours !== undefined) {
        const normalHours = configData.emergency.clinic.normalHours || 24990;
        const peakHours = configData.emergency.clinic.peakHours || 29990;
        config.emergency.clinic = {
          home: {
            normalHours: normalHours,
            peakHours: peakHours
          },
          clinic: {
            normalHours: normalHours,
            peakHours: peakHours
          }
        };
        config.markModified('emergency.clinic');
        await config.save();
        configData = config.toObject();
      }
    }
    
    res.status(200).json({
      success: true,
      data: configData
    });
  } catch (error) {
    console.error('Error getting pricing config:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de precios',
      error: error.message
    });
  }
};

/**
 * Obtener configuración de precios pública (solo precios de emergencia, sin autenticación)
 * Usado para mostrar precios mínimos en el frontend
 */
export const getPublicPricingConfig = async (req, res) => {
  try {
    let config = await PricingConfig.findOne().sort({ updatedAt: -1 });
    
    // Si no existe configuración, crear una con valores por defecto
    if (!config) {
      config = await PricingConfig.create({});
    }
    
    // Migrar estructura antigua a nueva si es necesario
    let configData = config.toObject();
    
    // Si tiene estructura antigua (independent/clinic con normalHours directamente), migrar
    if (configData.emergency?.independent && !configData.emergency?.independent?.home) {
      if (configData.emergency.independent.normalHours !== undefined) {
        config.emergency.independent = {
          home: {
            normalHours: configData.emergency.independent.normalHours || 19990,
            peakHours: configData.emergency.independent.peakHours || 24990
          }
        };
        config.markModified('emergency.independent');
        await config.save();
        configData = config.toObject();
      }
    }
    
    // Si tiene estructura antigua para clínicas
    if (configData.emergency?.clinic && !configData.emergency?.clinic?.home) {
      if (configData.emergency.clinic.normalHours !== undefined) {
        const normalHours = configData.emergency.clinic.normalHours || 24990;
        const peakHours = configData.emergency.clinic.peakHours || 29990;
        config.emergency.clinic = {
          home: {
            normalHours: normalHours,
            peakHours: peakHours
          },
          clinic: {
            normalHours: normalHours,
            peakHours: peakHours
          }
        };
        config.markModified('emergency.clinic');
        await config.save();
        configData = config.toObject();
      }
    }
    
    // Retornar solo la información de emergencia (precios mínimos)
    res.status(200).json({
      success: true,
      data: {
        emergency: configData.emergency
      }
    });
  } catch (error) {
    console.error('Error getting public pricing config:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de precios',
      error: error.message
    });
  }
};

/**
 * Actualizar la configuración de precios
 * Solo admin puede actualizar
 */
export const updatePricingConfig = async (req, res) => {
  try {
    const {
      emergency,
      appointments
    } = req.body;
    
    // Validar que venga al menos un campo
    if (!emergency && !appointments) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una sección de precios para actualizar'
      });
    }
    
    // Validar estructura de emergency si viene
    if (emergency) {
      // Validar precios de independientes (solo a domicilio)
      if (emergency.independent) {
        if (emergency.independent.home) {
          if (emergency.independent.home.normalHours !== undefined && emergency.independent.home.normalHours < 0) {
            return res.status(400).json({
              success: false,
              message: 'El precio de horario normal para urgencias a domicilio (independientes) debe ser mayor o igual a 0'
            });
          }
          if (emergency.independent.home.peakHours !== undefined && emergency.independent.home.peakHours < 0) {
            return res.status(400).json({
              success: false,
              message: 'El precio de hora punta para urgencias a domicilio (independientes) debe ser mayor o igual a 0'
            });
          }
        }
      }
      
      // Validar precios de clínicas (a domicilio y presencial)
      if (emergency.clinic) {
        // Urgencias a domicilio
        if (emergency.clinic.home) {
          if (emergency.clinic.home.normalHours !== undefined && emergency.clinic.home.normalHours < 0) {
            return res.status(400).json({
              success: false,
              message: 'El precio de horario normal para urgencias a domicilio (clínicas) debe ser mayor o igual a 0'
            });
          }
          if (emergency.clinic.home.peakHours !== undefined && emergency.clinic.home.peakHours < 0) {
            return res.status(400).json({
              success: false,
              message: 'El precio de hora punta para urgencias a domicilio (clínicas) debe ser mayor o igual a 0'
            });
          }
        }
        // Urgencias presenciales en clínica
        if (emergency.clinic.clinic) {
          if (emergency.clinic.clinic.normalHours !== undefined && emergency.clinic.clinic.normalHours < 0) {
            return res.status(400).json({
              success: false,
              message: 'El precio de horario normal para urgencias presenciales (clínicas) debe ser mayor o igual a 0'
            });
          }
          if (emergency.clinic.clinic.peakHours !== undefined && emergency.clinic.clinic.peakHours < 0) {
            return res.status(400).json({
              success: false,
              message: 'El precio de hora punta para urgencias presenciales (clínicas) debe ser mayor o igual a 0'
            });
          }
        }
      }
      
      if (emergency.peakHoursRange) {
        const { start, end } = emergency.peakHoursRange;
        if (start !== undefined && (start < 0 || start > 23)) {
          return res.status(400).json({
            success: false,
            message: 'La hora de inicio de hora punta debe estar entre 0 y 23'
          });
        }
        if (end !== undefined && (end < 0 || end > 23)) {
          return res.status(400).json({
            success: false,
            message: 'La hora de fin de hora punta debe estar entre 0 y 23'
          });
        }
      }
      
      if (emergency.distanceSurchargePerKm !== undefined && emergency.distanceSurchargePerKm < 0) {
        return res.status(400).json({
          success: false,
          message: 'El recargo por distancia debe ser mayor o igual a 0'
        });
      }
    }
    
    // Validar estructura de appointments si viene
    if (appointments) {
      const validateAppointmentPrices = (prices, type) => {
        if (prices.clinicVisit !== undefined && prices.clinicVisit < 0) {
          return `El precio de consulta en clínica para ${type} debe ser mayor o igual a 0`;
        }
        if (prices.homeVisit !== undefined && prices.homeVisit < 0) {
          return `El precio de consulta a domicilio para ${type} debe ser mayor o igual a 0`;
        }
        if (prices.teleconsultation !== undefined && prices.teleconsultation < 0) {
          return `El precio de teleconsulta para ${type} debe ser mayor o igual a 0`;
        }
        return null;
      };
      
      if (appointments.independent) {
        const error = validateAppointmentPrices(appointments.independent, 'independientes');
        if (error) {
          return res.status(400).json({ success: false, message: error });
        }
      }
      
      if (appointments.clinic) {
        const error = validateAppointmentPrices(appointments.clinic, 'clínicas');
        if (error) {
          return res.status(400).json({ success: false, message: error });
        }
      }
    }
    
    // Obtener o crear configuración (solo debe haber una)
    let config = await PricingConfig.findOne();
    if (!config) {
      config = new PricingConfig({});
    }
    
    // Actualizar campos de emergency
    if (emergency) {
      // Veterinarios independientes - solo urgencias a domicilio
      if (emergency.independent) {
        if (emergency.independent.home) {
          if (emergency.independent.home.normalHours !== undefined) {
            config.emergency.independent.home.normalHours = emergency.independent.home.normalHours;
          }
          if (emergency.independent.home.peakHours !== undefined) {
            config.emergency.independent.home.peakHours = emergency.independent.home.peakHours;
          }
        }
        // Migración: si viene estructura antigua, migrar a nueva
        if (emergency.independent.normalHours !== undefined && !emergency.independent.home) {
          config.emergency.independent.home = {
            normalHours: emergency.independent.normalHours,
            peakHours: emergency.independent.peakHours || 24990
          };
        }
      }
      
      // Clínicas - urgencias a domicilio y presenciales
      if (emergency.clinic) {
        // Urgencias a domicilio
        if (emergency.clinic.home) {
          if (emergency.clinic.home.normalHours !== undefined) {
            config.emergency.clinic.home.normalHours = emergency.clinic.home.normalHours;
          }
          if (emergency.clinic.home.peakHours !== undefined) {
            config.emergency.clinic.home.peakHours = emergency.clinic.home.peakHours;
          }
        }
        // Urgencias presenciales en clínica
        if (emergency.clinic.clinic) {
          if (emergency.clinic.clinic.normalHours !== undefined) {
            config.emergency.clinic.clinic.normalHours = emergency.clinic.clinic.normalHours;
          }
          if (emergency.clinic.clinic.peakHours !== undefined) {
            config.emergency.clinic.clinic.peakHours = emergency.clinic.clinic.peakHours;
          }
        }
        // Migración: si viene estructura antigua, migrar a nueva
        if (emergency.clinic.normalHours !== undefined && !emergency.clinic.home) {
          config.emergency.clinic.home = {
            normalHours: emergency.clinic.normalHours,
            peakHours: emergency.clinic.peakHours || 29990
          };
          config.emergency.clinic.clinic = {
            normalHours: emergency.clinic.normalHours,
            peakHours: emergency.clinic.peakHours || 29990
          };
        }
      }
      
      if (emergency.peakHoursRange) {
        if (emergency.peakHoursRange.start !== undefined) {
          config.emergency.peakHoursRange.start = emergency.peakHoursRange.start;
        }
        if (emergency.peakHoursRange.end !== undefined) {
          config.emergency.peakHoursRange.end = emergency.peakHoursRange.end;
        }
      }
      
      if (emergency.distanceSurchargePerKm !== undefined) {
        config.emergency.distanceSurchargePerKm = emergency.distanceSurchargePerKm;
      }
      
      // Marcar el subdocumento como modificado para asegurar que se guarde
      config.markModified('emergency');
    }
    
    // Actualizar campos de appointments
    if (appointments) {
      if (appointments.independent) {
        if (appointments.independent.clinicVisit !== undefined) {
          config.appointments.independent.clinicVisit = appointments.independent.clinicVisit;
        }
        if (appointments.independent.homeVisit !== undefined) {
          config.appointments.independent.homeVisit = appointments.independent.homeVisit;
        }
        if (appointments.independent.teleconsultation !== undefined) {
          config.appointments.independent.teleconsultation = appointments.independent.teleconsultation;
        }
      }
      
      if (appointments.clinic) {
        if (appointments.clinic.clinicVisit !== undefined) {
          config.appointments.clinic.clinicVisit = appointments.clinic.clinicVisit;
        }
        if (appointments.clinic.homeVisit !== undefined) {
          config.appointments.clinic.homeVisit = appointments.clinic.homeVisit;
        }
        if (appointments.clinic.teleconsultation !== undefined) {
          config.appointments.clinic.teleconsultation = appointments.clinic.teleconsultation;
        }
      }
      
      // Marcar el subdocumento como modificado para asegurar que se guarde
      config.markModified('appointments');
    }
    
    // Guardar admin que actualiza
    if (req.user && req.user.id) {
      config.updatedBy = req.user.id;
    }
    config.updatedAt = new Date();
    
    // Forzar guardado y verificar
    await config.save();
    
    // Recargar desde la base de datos para asegurar que tenemos los valores actualizados
    const savedConfig = await PricingConfig.findById(config._id);
    
    console.log('✅ Configuración guardada:', {
      independent: savedConfig.emergency?.independent,
      clinic: savedConfig.emergency?.clinic,
      appointments: savedConfig.appointments
    });
    
    res.status(200).json({
      success: true,
      message: 'Configuración de precios actualizada exitosamente',
      data: savedConfig
    });
  } catch (error) {
    console.error('Error updating pricing config:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración de precios',
      error: error.message
    });
  }
};
