/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta de colores VetGoNow - Variables globales
        'vet': {
          // Colores Principales
          'primary': 'var(--vet-primary)',           // #1A4B56 - Azul Veterinario
          'primary-dark': 'var(--vet-primary-dark)', // #0F2E35
          'primary-light': 'var(--vet-primary-light)', // #2A6B7A
          
          'secondary': 'var(--vet-secondary)',       // #2A85B7 - Azul Secundario
          'secondary-dark': 'var(--vet-secondary-dark)', // #1E6A8F
          'secondary-light': 'var(--vet-secondary-light)', // #4ECDC4
          
          'accent': 'var(--vet-accent)',             // #F7941D - Naranja Acción
          'accent-dark': 'var(--vet-accent-dark)',   // #D67A0A
          'accent-light': 'var(--vet-accent-light)', // #FFA64D
          
          // Colores Neutros
          'white': 'var(--vet-white)',               // #FFFFFF
          'gray-light': 'var(--vet-gray-light)',     // #F0F0F0
          'gray-medium': 'var(--vet-gray-medium)',   // #E0E0E0
        },
        // Paleta del Portal del Tutor
        'tutor': {
          'sidebar': 'var(--tutor-sidebar)',         // #2E7D70 - Azul Oceánico
          'sidebar-hover': 'var(--tutor-sidebar-hover)', // Hover más claro
          'sidebar-active': 'var(--tutor-sidebar-active)', // Estado activo
          'bg-primary': 'var(--tutor-bg-primary)',   // #F8F9FA - Fondo principal
          'bg-secondary': 'var(--tutor-bg-secondary)', // #E9ECEF - Fondo secundario
          'text-primary': 'var(--tutor-text-primary)', // #212529 - Texto principal
          'text-secondary': 'var(--tutor-text-secondary)', // #6C757D - Texto secundario
          'btn-primary': 'var(--tutor-btn-primary)', // #F7941D - Botón primario
          'btn-primary-hover': 'var(--tutor-btn-primary-hover)', // Hover botón primario
          'btn-secondary': 'var(--tutor-btn-secondary)', // #4ECDC4 - Botón secundario
          'btn-secondary-hover': 'var(--tutor-btn-secondary-hover)', // Hover botón secundario
          'danger': 'var(--tutor-danger)',           // #DC3545 - Rojo Alerta
        },
      },
    },
  },
  plugins: [],
}
