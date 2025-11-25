/**
 * Configuración de colores globales de VetGoNow
 * 
 * Para cambiar los colores de la plataforma, modifica estos valores.
 * Los cambios se reflejarán automáticamente en toda la aplicación.
 */

export const vetColors = {
  // Colores Principales
  primary: '#1A4B56',           // Azul Veterinario (Principal)
  primaryDark: '#0F2E35',       // Variación oscura
  primaryLight: '#2A6B7A',      // Variación clara
  
  secondary: '#2A85B7',         // Azul Secundario (Aqua/Turquesa)
  secondaryDark: '#1E6A8F',     // Variación oscura
  secondaryLight: '#4ECDC4',    // Variación clara (alternativa fresca)
  
  accent: '#F7941D',            // Naranja Acción (Acento)
  accentDark: '#D67A0A',        // Variación oscura
  accentLight: '#FFA64D',       // Variación clara
  
  // Colores Neutros
  white: '#FFFFFF',             // Blanco Puro
  grayLight: '#F0F0F0',         // Gris Claro/Neutro
  grayMedium: '#E0E0E0',        // Gris Medio (alternativa)
  
  // Uso recomendado:
  // - primary: Encabezados, fondos de secciones importantes, navegación primaria
  // - secondary: Botones activos, iconos, barras de progreso, acentos visuales
  // - accent: CTAs prominentes (Agendar Cita, Pedir Urgencia), alertas, notificaciones
  // - white: Fondos principales, texto claro sobre fondos oscuros
  // - grayLight: Fondos secundarios, líneas divisorias, bordes sutiles
};

/**
 * Helper para obtener colores en formato RGB (útil para opacidades)
 */
export const vetColorsRGB = {
  primary: '26, 75, 86',
  secondary: '42, 133, 183',
  accent: '247, 148, 29',
};

export default vetColors;

