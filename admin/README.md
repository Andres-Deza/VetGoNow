# Admin Panel - VetGoNow

Panel administrativo de VetGoNow para gestión de usuarios, veterinarios, citas y métricas.

## Tecnologías

- React 18
- Vite 6
- Chart.js 4
- Material-UI 7
- Axios

## Desarrollo Local

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5175`

## Variables de Entorno

Crear archivo `.env` en la raíz de `admin/`:

```env
VITE_API_BASE=http://localhost:5555
```

## Build para Producción

```bash
npm run build
```

Los archivos compilados se generan en la carpeta `dist/`.
