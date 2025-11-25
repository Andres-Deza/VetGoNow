import { useEffect, useRef, useState } from 'react';
import { GoogleMap } from '@react-google-maps/api';

/**
 * Wrapper para GoogleMap que asegura que el contenedor existe antes de renderizar
 * Esto previene errores de IntersectionObserver cuando el elemento no está en el DOM
 */
const GoogleMapWrapper = ({ children, ...props }) => {
  const containerRef = useRef(null);
  const [isContainerReady, setIsContainerReady] = useState(false);

  useEffect(() => {
    // Verificar que el contenedor existe y tiene dimensiones
    const checkContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Verificar que el elemento está en el DOM y tiene dimensiones visibles
        if (rect.width > 0 && rect.height > 0 && containerRef.current.offsetParent !== null) {
          setIsContainerReady(true);
        } else {
          // Si no tiene dimensiones, intentar de nuevo después de un breve delay
          setTimeout(checkContainer, 100);
        }
      } else {
        // Si el ref aún no está asignado, intentar de nuevo
        setTimeout(checkContainer, 50);
      }
    };

    // Usar requestAnimationFrame para asegurar que el DOM está listo
    requestAnimationFrame(() => {
      checkContainer();
    });
    
    // También verificar después de un pequeño delay por si acaso
    const timeoutId = setTimeout(checkContainer, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  // Si el contenedor no está listo, mostrar un placeholder
  if (!isContainerReady) {
    return (
      <div 
        ref={containerRef}
        style={props.mapContainerStyle || { width: '100%', height: '250px' }}
        className="bg-gray-100 flex items-center justify-center"
      >
        <p className="text-sm text-gray-500">Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GoogleMap {...props}>
        {children}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapWrapper;

