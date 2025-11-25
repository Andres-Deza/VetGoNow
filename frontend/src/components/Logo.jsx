import React from 'react';

/**
 * Componente Logo que cambia automáticamente según el fondo
 * @param {Object} props
 * @param {boolean} props.onDarkBackground - Si es true, usa el logo con fondo verde. Si es false o undefined, usa el transparente
 * @param {string} props.className - Clases CSS adicionales
 * @param {string} props.alt - Texto alternativo
 */
const Logo = ({ onDarkBackground = false, className = "h-10 w-auto", alt = "VetGoNow" }) => {
  // Si está sobre fondo oscuro (#284a55 o vet-primary), usar logo con fondo verde
  // Caso contrario, usar logo transparente
  const logoSrc = onDarkBackground 
    ? "/LogoVetGoNowFondoVerde.png"
    : "/LogoVetGoNow_transparent.png";

  return (
    <img 
      src={logoSrc} 
      alt={alt} 
      className={className}
    />
  );
};

export default Logo;

