// Utilidad para manejar permisos del navegador (notificaciones y ubicación)

/**
 * Solicita permiso de ubicación
 * @returns {Promise<{granted: boolean, error?: string}>}
 */
export const requestLocationPermission = () => {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ granted: false, error: 'Geolocalización no soportada en este navegador' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        resolve({ granted: true });
      },
      (error) => {
        let errorMessage = 'Error al obtener ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, habilita la ubicación en la configuración de tu navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado al obtener la ubicación';
            break;
        }
        resolve({ granted: false, error: errorMessage });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Verifica si el permiso de ubicación está disponible
 * @returns {Promise<boolean>}
 */
export const checkLocationPermission = () => {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(false);
      return;
    }

    // Intentar obtener la ubicación para verificar el permiso
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (error) => {
        // Si es PERMISSION_DENIED, el permiso fue denegado
        resolve(error.code !== error.PERMISSION_DENIED);
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
};

/**
 * Solicita permiso de notificaciones
 * @returns {Promise<{granted: boolean, error?: string}>}
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return { granted: false, error: 'Notificaciones no soportadas en este navegador' };
  }

  if (Notification.permission === 'granted') {
    return { granted: true };
  }

  if (Notification.permission === 'denied') {
    return { 
      granted: false, 
      error: 'Permiso de notificaciones denegado. Por favor, habilita las notificaciones en la configuración de tu navegador.' 
    };
  }

  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted' };
  } catch (error) {
    return { granted: false, error: 'Error al solicitar permiso de notificaciones' };
  }
};

/**
 * Verifica si el permiso de notificaciones está concedido
 * @returns {boolean}
 */
export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
};

/**
 * Valida que el permiso de ubicación esté concedido (requerido para urgencias)
 * Verifica el permiso de manera inteligente: solo falla si el permiso está denegado explícitamente
 * @returns {Promise<{success: boolean, locationGranted: boolean, errors: string[]}>}
 */
export const validateLocationPermission = async () => {
  const errors = [];
  let locationGranted = false;

  // Verificar si geolocalización está disponible
  if (!('geolocation' in navigator)) {
    errors.push('Geolocalización no soportada en este navegador');
    return {
      success: false,
      locationGranted: false,
      errors
    };
  }

  // Intentar obtener ubicación con opciones permisivas
  // La idea es verificar si el permiso está concedido, no obtener una ubicación precisa
  try {
    const locationResult = await new Promise((resolve) => {
      let resolved = false;
      
      // Intentar con opciones muy permisivas (usar caché, sin alta precisión, timeout corto)
      navigator.geolocation.getCurrentPosition(
        () => {
          if (!resolved) {
            resolved = true;
            resolve({ granted: true });
          }
        },
        (error) => {
          if (resolved) return;
          
          // Solo fallar si el permiso está EXPLÍCITAMENTE denegado
          if (error.code === error.PERMISSION_DENIED) {
            resolved = true;
            resolve({
              granted: false,
              error: 'Permiso de ubicación denegado. Por favor, habilita la ubicación en la configuración de tu navegador.'
            });
          } else {
            // Para timeout o GPS no disponible, el permiso está concedido pero el GPS no responde
            // En este caso, consideramos el permiso como válido
            // (el GPS puede estar apagado o no disponible, pero el permiso está concedido)
            resolved = true;
            resolve({ granted: true });
          }
        },
        {
          enableHighAccuracy: false, // No requiere GPS preciso
          timeout: 3000, // Timeout muy corto para validación rápida
          maximumAge: 600000 // Usar caché de hasta 10 minutos si está disponible
        }
      );
    });

    locationGranted = locationResult.granted;
    if (!locationGranted) {
      errors.push(locationResult.error || 'Permiso de ubicación requerido');
    }
  } catch (error) {
    // Error inesperado - asumir que el permiso está concedido si no es un error de permisos
    console.warn('Error inesperado al validar permiso de ubicación:', error);
    locationGranted = true; // Mejor permitir que continúe si hay un error técnico
  }

  return {
    success: locationGranted,
    locationGranted,
    errors
  };
};

/**
 * Valida que ambos permisos (ubicación y notificaciones) estén concedidos
 * Solicita los permisos si no están concedidos
 * @param {Object} options - Opciones de validación
 * @param {boolean} options.requireNotifications - Si requiere notificaciones (default: true)
 * @param {boolean} options.requireLocation - Si requiere ubicación (default: true)
 * @returns {Promise<{success: boolean, locationGranted: boolean, notificationGranted: boolean, errors: string[]}>}
 */
export const validateRequiredPermissions = async (options = {}) => {
  const { requireNotifications = true, requireLocation = true } = options;
  const errors = [];
  let locationGranted = false;
  let notificationGranted = false;

  // Verificar y solicitar permiso de notificaciones solo si es requerido
  if (requireNotifications) {
    const notificationResult = await requestNotificationPermission();
    notificationGranted = notificationResult.granted;
    if (!notificationGranted) {
      errors.push(notificationResult.error || 'Permiso de notificaciones requerido');
    }
  } else {
    notificationGranted = true; // No se requiere, se considera como concedido
  }

  // Verificar y solicitar permiso de ubicación solo si es requerido
  if (requireLocation) {
    const locationResult = await requestLocationPermission();
    locationGranted = locationResult.granted;
    if (!locationGranted) {
      errors.push(locationResult.error || 'Permiso de ubicación requerido');
    }
  } else {
    locationGranted = true; // No se requiere, se considera como concedido
  }

  return {
    success: locationGranted && notificationGranted,
    locationGranted,
    notificationGranted,
    errors
  };
};

/**
 * Obtiene el estado actual de los permisos sin solicitarlos
 * @returns {Promise<{location: boolean, notifications: boolean}>}
 */
export const getPermissionsStatus = async () => {
  const notifications = checkNotificationPermission();
  const location = await checkLocationPermission();
  
  return {
    location,
    notifications
  };
};

