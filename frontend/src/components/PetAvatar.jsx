/* eslint-disable react/prop-types */

/**
 * Componente PetAvatar - Muestra la imagen de la mascota o una imagen por defecto según la especie
 * @param {string} image - URL de la imagen de la mascota
 * @param {string} species - Especie de la mascota ('Perro' o 'Gato')
 * @param {string} name - Nombre de la mascota (para el alt)
 * @param {string} className - Clases CSS adicionales
 */
const PetAvatar = ({ image, species, name, className = "w-full h-full object-cover" }) => {
  // Asegurar que image sea string o undefined
  const imageUrl = image ? String(image) : undefined;
  
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={name ? String(name) : 'Mascota'} 
        className={className}
      />
    );
  }

  // Si no hay imagen, mostrar avatar por defecto según la especie
  const speciesStr = species ? String(species).toLowerCase() : '';
  const isGato = speciesStr === 'gato';
  const defaultAvatar = isGato ? '/avatarGato.png' : '/avatarPerro.png';
  
  return (
    <img 
      src={defaultAvatar} 
      alt={name ? `${name} (${isGato ? 'Gato' : 'Perro'})` : `Avatar ${isGato ? 'Gato' : 'Perro'}`}
      className={className}
    />
  );
};

export default PetAvatar;