import CommissionConfig from '../models/CommissionConfig.js';
import Admin from '../models/Admin.js';

/**
 * Obtener todas las configuraciones de comisiones
 */
export const getCommissionConfigs = async (req, res) => {
  try {
    const configs = await CommissionConfig.find({ isActive: true }).sort({ serviceType: 1 });

    // Si no hay configuraciones, inicializar valores por defecto
    if (configs.length === 0) {
      await CommissionConfig.initializeDefaults();
      const defaultConfigs = await CommissionConfig.find({ isActive: true }).sort({ serviceType: 1 });
      return res.status(200).json({
        success: true,
        data: defaultConfigs
      });
    }

    return res.status(200).json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error al obtener configuraciones de comisión:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener configuraciones',
      error: error.message 
    });
  }
};

/**
 * Actualizar configuración de comisión
 */
export const updateCommissionConfig = async (req, res) => {
  try {
    const adminId = req.userId || req.user?.id;
    const { serviceType, commissionAmount, reason } = req.body;

    if (!adminId) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    // Verificar que sea admin
    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Acceso denegado. Solo administradores pueden modificar comisiones.' 
      });
    }

    if (!serviceType || commissionAmount === undefined) {
      return res.status(400).json({ 
        success: false,
        message: 'serviceType y commissionAmount son requeridos' 
      });
    }

    if (commissionAmount < 0) {
      return res.status(400).json({ 
        success: false,
        message: 'El monto de la comisión no puede ser negativo' 
      });
    }

    // Buscar configuración existente
    let config = await CommissionConfig.findOne({ serviceType });

    if (config) {
      // Guardar histórico si el monto cambia
      if (config.commissionAmount !== commissionAmount) {
        config.changeHistory.push({
          oldAmount: config.commissionAmount,
          newAmount: commissionAmount,
          changedBy: adminId,
          changedAt: new Date(),
          reason: reason || 'Actualización de comisión'
        });
      }

      config.commissionAmount = commissionAmount;
      if (req.body.description) {
        config.description = req.body.description;
      }
    } else {
      // Crear nueva configuración
      config = new CommissionConfig({
        serviceType,
        commissionAmount,
        description: req.body.description || '',
        changeHistory: [{
          oldAmount: 0,
          newAmount: commissionAmount,
          changedBy: adminId,
          changedAt: new Date(),
          reason: reason || 'Configuración inicial'
        }]
      });
    }

    await config.save();

    return res.status(200).json({
      success: true,
      message: 'Configuración de comisión actualizada exitosamente',
      data: config
    });
  } catch (error) {
    console.error('Error al actualizar configuración de comisión:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al actualizar configuración',
      error: error.message 
    });
  }
};

/**
 * Actualizar múltiples configuraciones de comisión
 */
export const updateMultipleCommissionConfigs = async (req, res) => {
  try {
    const adminId = req.userId || req.user?.id;
    const { configs, reason } = req.body;

    if (!adminId) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    // Verificar que sea admin
    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Acceso denegado' 
      });
    }

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere un array de configuraciones' 
      });
    }

    const updatedConfigs = [];

    for (const configData of configs) {
      const { serviceType, commissionAmount, description } = configData;

      if (!serviceType || commissionAmount === undefined) {
        continue; // Saltar configuraciones inválidas
      }

      if (commissionAmount < 0) {
        continue; // Saltar montos negativos
      }

      let config = await CommissionConfig.findOne({ serviceType });

      if (config) {
        // Guardar histórico si el monto cambia
        if (config.commissionAmount !== commissionAmount) {
          config.changeHistory.push({
            oldAmount: config.commissionAmount,
            newAmount: commissionAmount,
            changedBy: adminId,
            changedAt: new Date(),
            reason: reason || 'Actualización masiva de comisiones'
          });
        }

        config.commissionAmount = commissionAmount;
        if (description) {
          config.description = description;
        }
      } else {
        config = new CommissionConfig({
          serviceType,
          commissionAmount,
          description: description || '',
          changeHistory: [{
            oldAmount: 0,
            newAmount: commissionAmount,
            changedBy: adminId,
            changedAt: new Date(),
            reason: reason || 'Configuración inicial'
          }]
        });
      }

      await config.save();
      updatedConfigs.push(config);
    }

    return res.status(200).json({
      success: true,
      message: `${updatedConfigs.length} configuraciones actualizadas exitosamente`,
      data: updatedConfigs
    });
  } catch (error) {
    console.error('Error al actualizar configuraciones de comisión:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al actualizar configuraciones',
      error: error.message 
    });
  }
};

