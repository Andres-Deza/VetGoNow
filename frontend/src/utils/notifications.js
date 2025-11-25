// Utilidad para manejar notificaciones del navegador
// Mejores prácticas para notificaciones push del navegador

/**
 * Solicita permiso para mostrar notificaciones del navegador
 * @returns {Promise<boolean>} true si el permiso fue concedido, false en caso contrario
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones del navegador');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('El usuario ha denegado el permiso de notificaciones');
    return false;
  }

  // Permission es 'default', solicitar permiso
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error al solicitar permiso de notificaciones:', error);
    return false;
  }
};

/**
 * Verifica si las notificaciones están disponibles y permitidas
 * @returns {boolean}
 */
export const isNotificationAvailable = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};

/**
 * Muestra una notificación del navegador
 * @param {string} title - Título de la notificación
 * @param {NotificationOptions} options - Opciones de la notificación
 * @returns {Notification|null} La notificación creada o null si no se pudo crear
 */
export const showNotification = (title, options = {}) => {
  if (!isNotificationAvailable()) {
    console.log('Notificaciones no disponibles - permiso:', Notification.permission);
    return null;
  }

  // Opciones por defecto
  const defaultOptions = {
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'vetgonow-notification',
    requireInteraction: false,
    silent: false,
    ...options
  };

  try {
    console.log('Creando notificación:', { title, options: defaultOptions });
    const notification = new Notification(title, defaultOptions);
    console.log('Notificación creada exitosamente');
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Manejar clic en la notificación
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      
      // Si hay una URL en las opciones, navegar a ella
      if (options.url) {
        window.location.href = options.url;
      }
    };

    // Manejar errores de la notificación
    notification.onerror = (error) => {
      console.error('Error en la notificación:', error);
    };

    return notification;
  } catch (error) {
    console.error('Error al mostrar notificación:', error);
    return null;
  }
};

/**
 * Muestra una notificación de nuevo mensaje de chat
 * @param {Object} params - Parámetros del mensaje
 * @param {string} params.senderName - Nombre del remitente
 * @param {string} params.messageContent - Contenido del mensaje
 * @param {string} params.conversationId - ID de la conversación
 * @param {boolean} params.isVet - Si el usuario actual es veterinario
 * @param {string} params.senderAvatar - Avatar del remitente (opcional)
 * @returns {Notification|null}
 */
export const showNewMessageNotification = ({
  senderName,
  messageContent,
  conversationId,
  isVet,
  senderAvatar
}) => {
  if (!isNotificationAvailable()) {
    return null;
  }

  // Verificar si la página está visible
  const isPageVisible = document.visibilityState === 'visible';
  
  // Si la página está visible, verificar si el usuario está en la conversación activa
  // Esto se puede hacer mejorando la lógica en el componente que llama esta función
  // Por ahora, siempre mostramos la notificación si la página no está visible
  
  const title = isVet 
    ? `Nuevo mensaje de ${senderName || 'Cliente'}`
    : `Nuevo mensaje de ${senderName || 'Veterinario'}`;
  
  // Truncar el contenido del mensaje si es muy largo
  const truncatedContent = messageContent && messageContent.length > 100
    ? messageContent.substring(0, 100) + '...'
    : messageContent || 'Nuevo mensaje';

  // Determinar la URL a la que navegar
  const url = isVet 
    ? `/vet/conversations/${conversationId}`
    : `/conversations/${conversationId}`;

  const options = {
    body: truncatedContent,
    icon: senderAvatar || '/logo.png',
    badge: '/logo.png',
    tag: `conversation-${conversationId}`,
    requireInteraction: false,
    data: {
      conversationId,
      url
    },
    url
  };

  return showNotification(title, options);
};

/**
 * Reproduce un sonido de notificación (opcional)
 * @param {string} soundUrl - URL del archivo de sonido (opcional)
 */
export const playNotificationSound = (soundUrl = null) => {
  try {
    // Crear un audio context para generar un sonido simple si no se proporciona URL
    if (!soundUrl) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      const audio = new Audio(soundUrl);
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.error('Error al reproducir sonido de notificación:', error);
      });
    }
  } catch (error) {
    console.error('Error al reproducir sonido de notificación:', error);
  }
};

/**
 * Inicializa el sistema de notificaciones
 * NO solicita permiso automáticamente (debe ser resultado de una acción del usuario)
 * Solo verifica el estado actual
 */
export const initializeNotifications = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones del navegador');
    return false;
  }

  // Solo retornar el estado actual, no solicitar permiso automáticamente
  // La solicitud de permiso debe ser resultado de una acción del usuario
  return Notification.permission === 'granted';
};

/**
 * Solicita permiso de notificaciones (debe ser llamado como resultado de una acción del usuario)
 * @returns {Promise<boolean>} true si el permiso fue concedido
 */
export const requestNotificationPermissionIfNeeded = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones del navegador');
    return false;
  }

  // Si ya está concedido, retornar true
  if (Notification.permission === 'granted') {
    return true;
  }

  // Si está denegado, informar al usuario
  if (Notification.permission === 'denied') {
    console.log('El usuario ha denegado el permiso de notificaciones');
    return false;
  }

  // Si es 'default', solicitar permiso (solo funciona como resultado de una acción del usuario)
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error al solicitar permiso de notificaciones:', error);
    return false;
  }
};

