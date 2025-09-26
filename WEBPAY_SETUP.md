# 🚀 Guía Rápida: Configuración Webpay con ngrok

## Problema

Webpay requiere URLs HTTPS accesibles desde internet. `localhost` no funciona.

## Solución: ngrok

### 1. Instalar ngrok

```bash
# Descargar desde: https://ngrok.com/download
# O instalar con npm globalmente:
npm install -g ngrok
```

### 2. Crear túneles HTTPS

#### Terminal 1: Backend (puerto 5555)

```bash
ngrok http 5555
```

**Resultado:** `https://abc123.ngrok.io` ← Copia esta URL

#### Terminal 2: Frontend (puerto 5173)

```bash
ngrok http 5173
```

**Resultado:** `https://def456.ngrok.io` ← Copia esta URL

### 3. Actualizar archivo .env

```env
# Reemplaza con tus URLs de ngrok
BASE_URL=https://abc123.ngrok.io
FRONTEND_URL=https://def456.ngrok.io
```

### 4. Reiniciar servidor

```bash
npm run dev
```

## ✅ Verificación

- El servidor mostrará: `✅ Webpay URLs are HTTPS - OK`
- Los pagos con Webpay funcionarán correctamente

## 🔧 Troubleshooting

- **Error "Invalid URL"**: Verifica que uses URLs HTTPS de ngrok
- **Error de conexión**: Asegúrate de que ngrok esté ejecutándose
- **Pagos no funcionan**: Verifica que las URLs en .env sean las correctas

## 📝 Notas importantes

- ngrok debe estar ejecutándose siempre que uses Webpay
- Las URLs de ngrok cambian cada vez que reinicias ngrok (a menos que tengas cuenta premium)
- Para producción, usa URLs HTTPS reales de tu dominio
