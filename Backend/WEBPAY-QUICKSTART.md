# 🚀 Guía Rápida: Webpay en Desarrollo Local

## ⚡ Inicio Rápido (3 minutos)

### Paso 1: Configuración automática

```bash
cd backend
npm run setup:webpay
```

Este comando:

- ✅ Verifica e instala ngrok
- ✅ Inicia ngrok en el puerto 5555
- ✅ Actualiza automáticamente tu `.env` con la URL de ngrok
- ✅ Te da instrucciones para probar

### Paso 2: Iniciar el servidor

```bash
# En otra terminal (mantén ngrok ejecutándose)
npm run dev
```

### Paso 3: Probar Webpay

1. Ve a tu frontend: `http://localhost:5173`
2. Selecciona una cita veterinaria
3. Haz click en **"Continuar al pago"**
4. Serás redirigido al portal de Webpay
5. **Datos de prueba:**
   - **Tarjeta Visa:** `4051885600446623`
   - **Código:** `123`
   - **Fecha:** Cualquier fecha futura (ej: 12/25)

## 🎯 Comandos Útiles

```bash
# Configuración completa automática
npm run setup:webpay

# Solo iniciar ngrok
npm run ngrok

# Servidor + ngrok al mismo tiempo
npm run dev:ngrok

# Solo servidor
npm run dev
```

## 🔧 Solución de Problemas

### "Puerto 5555 ocupado"

```bash
# Mata procesos en el puerto 5555
npx kill-port 5555
```

### "ngrok no funciona"

```bash
# Instalar ngrok globalmente
npm install -g ngrok

# O usar npx
npx ngrok http 5555
```

### "Error de CORS"

Asegúrate de que tu `BASE_URL` en `.env` sea la URL HTTPS de ngrok:

```bash
BASE_URL=https://abc123.ngrok.io
```

## 📱 Tarjetas de Prueba Webpay

| Tipo       | Número             | Código | Fecha  |
| ---------- | ------------------ | ------ | ------ |
| Visa       | `4051885600446623` | `123`  | Futura |
| Mastercard | `5186059559590568` | `123`  | Futura |

## 🌐 URLs Importantes

- **Portal Webpay Integración:** https://webpay3gint.transbank.cl
- **Documentación:** https://www.transbankdevelopers.cl/producto/webpay
- **Consola Desarrolladores:** https://www.transbankdevelopers.cl/console

## ⚠️ Notas Importantes

- 🔒 **Nunca uses credenciales de producción** en desarrollo
- 💰 **Las transacciones en integración no son reales**
- 🔄 **Para producción necesitarás credenciales reales de Transbank**
- 🌍 **Tu aplicación debe ser accesible desde internet** para que Webpay pueda redirigir

## 🎉 ¡Listo!

Con esta configuración, puedes probar Webpay completamente en tu localhost. Las transacciones serán simuladas pero el flujo completo funcionará igual que en producción.

¿Necesitas ayuda con algún paso? 🚀
