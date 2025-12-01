# Guía: Actualizar Precios en MongoDB Atlas

Esta guía te ayudará a actualizar los precios en tu base de datos de MongoDB Atlas sin afectar los usuarios existentes.

## Precios a Actualizar

### Urgencias (sin agenda)

**Veterinarios independientes (solo a domicilio):**
- Horario normal: $34.000
- Hora punta: $40.000

**Clínicas veterinarias:**
- Presencial en clínica:
  - Horario normal: $31.000
  - Hora punta: $38.000
- A domicilio:
  - Horario normal: $50.000
  - Hora punta: $60.000

### Citas médicas tradicionales (con agenda)

**Veterinarios independientes:**
- Consulta a domicilio: $27.000
- Teleconsulta: $15.000

**Clínicas veterinarias:**
- Consulta en clínica: $25.000
- Consulta a domicilio: $40.000
- Teleconsulta: $17.000

---

## Opción 1: Ejecutar desde tu máquina local (Recomendado)

### Paso 1: Verificar conexión a MongoDB Atlas

Asegúrate de tener tu connection string en el archivo `.env`:

```env
mongoDBURL=mongodb+srv://vetgonow_db_user:vetgonow123@clustervetgonow.yqmunq6.mongodb.net/VetGoNow?retryWrites=true&w=majority
```

### Paso 2: Ejecutar el script

Desde la raíz del proyecto:

```bash
cd Backend
npm run update:pricing
```

O directamente:

```bash
cd Backend
node scripts/updatePricing.js
```

### Paso 3: Verificar resultado

El script mostrará:
- ✅ Confirmación de conexión a MongoDB
- ✅ Confirmación de actualización
- 📊 Resumen de los nuevos precios
- ✅ Desconexión exitosa

---

## Opción 2: Ejecutar desde Render (One-off Job)

Si prefieres ejecutarlo directamente en Render:

### Paso 1: Crear One-off Job en Render

1. Ve a tu [Render Dashboard](https://dashboard.render.com)
2. Haz clic en "New +" → "Background Worker" o "One-off Job"
3. Configura:
   - **Name**: `update-pricing`
   - **Repository**: Tu repositorio `VetGoNow`
   - **Root Directory**: `Backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node scripts/updatePricing.js`
   - **Plan**: Free

### Paso 2: Configurar Variables de Entorno

Asegúrate de que tenga las mismas variables de entorno que tu servicio principal, especialmente:
- `mongoDBURL`

### Paso 3: Ejecutar

1. Haz clic en "Create"
2. El job se ejecutará una vez y mostrará el resultado
3. Revisa los logs para confirmar que se actualizó correctamente

---

## Opción 3: Ejecutar desde MongoDB Compass o MongoDB Shell

Si prefieres hacerlo directamente desde MongoDB:

### Usando MongoDB Compass

1. Conecta MongoDB Compass a tu cluster de Atlas
2. Navega a la base de datos `VetGoNow`
3. Ve a la colección `pricingconfigs`
4. Edita el documento existente o crea uno nuevo con esta estructura:

```json
{
  "emergency": {
    "independent": {
      "home": {
        "normalHours": 34000,
        "peakHours": 40000
      }
    },
    "clinic": {
      "clinic": {
        "normalHours": 31000,
        "peakHours": 38000
      },
      "home": {
        "normalHours": 50000,
        "peakHours": 60000
      }
    },
    "peakHoursRange": {
      "start": 20,
      "end": 8
    },
    "distanceSurchargePerKm": 0
  },
  "appointments": {
    "independent": {
      "clinicVisit": 0,
      "homeVisit": 27000,
      "teleconsultation": 15000
    },
    "clinic": {
      "clinicVisit": 25000,
      "homeVisit": 40000,
      "teleconsultation": 17000
    }
  }
}
```

---

## Verificación

Después de ejecutar el script, verifica que los precios se actualizaron:

### Opción A: Desde la aplicación

1. Inicia sesión como administrador
2. Ve a la sección de configuración de precios
3. Verifica que los nuevos precios aparezcan

### Opción B: Desde MongoDB Atlas

1. Ve a MongoDB Atlas → Tu cluster
2. Navega a `VetGoNow` → `pricingconfigs`
3. Revisa el documento y verifica los valores

### Opción C: Desde el backend

Puedes hacer una petición GET a:
```
https://vetgonow-backend.onrender.com/api/pricing
```

---

## Solución de Problemas

### Error: "No se encontró ningún administrador"

**Solución**: El script necesita al menos un admin en la base de datos. Si no existe:
1. Ejecuta el seed completo primero: `npm run seed`
2. O crea un admin manualmente desde la aplicación

### Error de conexión a MongoDB

**Solución**: 
1. Verifica que `mongoDBURL` esté correcta en `.env`
2. Verifica que tu IP esté en la whitelist de MongoDB Atlas
3. Verifica que el usuario y contraseña sean correctos

### Los precios no se actualizan

**Solución**:
1. Verifica que exista un documento en `pricingconfigs`
2. Revisa los logs del script para ver errores
3. Asegúrate de tener permisos de escritura en la base de datos

---

## Notas Importantes

- ⚠️ Este script **NO elimina** usuarios, citas, o cualquier otro dato
- ✅ Solo actualiza la configuración de precios
- ✅ Si no existe configuración, la crea
- ✅ Si ya existe, la actualiza
- 📝 El script registra qué admin hizo la actualización

---

## Comando Rápido

```bash
# Desde la raíz del proyecto
cd Backend
npm run update:pricing
```

¡Listo! Los precios se actualizarán en MongoDB Atlas. 🚀

