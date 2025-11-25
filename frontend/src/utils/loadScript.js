// Helper para cargar scripts externos bajo demanda
export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // Verificar si el script ya está cargado
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

// Cargar html2pdf solo cuando se necesite
export const loadHtml2Pdf = () => {
  return loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
};

