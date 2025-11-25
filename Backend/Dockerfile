FROM node:18-alpine

# Instalar herramientas necesarias para compilar dependencias nativas
# (tesseract.js y @vladmandic/human pueden requerir compilación)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    libpng-dev

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
# Las herramientas de compilación están instaladas arriba para dependencias nativas
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fuente
COPY . .

# Crear directorio para uploads si no existe
RUN mkdir -p uploads && chmod 755 uploads

# Exponer puerto (Cloud Run usa PORT automáticamente)
EXPOSE 8080

# Variable de entorno para el puerto (Cloud Run establece PORT automáticamente)
ENV PORT=8080
ENV NODE_ENV=production

# Iniciar aplicación
CMD ["node", "index.js"]

