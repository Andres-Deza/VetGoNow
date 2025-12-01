# Actualizar Base de Datos en Render

## Situación Actual

Tienes dos bases de datos en MongoDB Atlas:
- **"VetGoNow"**: Configurada en Render pero puede no estar siendo usada
- **"test"**: Base de datos que funciona correctamente en producción

## Solución Recomendada

Cambiar Render para usar explícitamente la base de datos **"test"** que es la que funciona.

## Pasos para Actualizar Render

1. **Ve a tu servicio en Render**
   - Accede a [render.com](https://render.com)
   - Selecciona tu servicio de backend (VetGoNow)

2. **Edita la variable de entorno `mongoDBURL`**
   - Ve a **Settings** → **Environment Variables**
   - Busca la variable `mongoDBURL`
   - Haz clic en el ícono de edición (lápiz)

3. **Actualiza la connection string**
   
   **Cambiar de:**
   ```
   mongodb+srv://vetgonow_db_user:vetgonow123@clustervetgonow.yqmunq6.mongodb.net/VetGoNow?retryWrites=true&w=majority
   ```
   
   **A:**
   ```
   mongodb+srv://vetgonow_db_user:vetgonow123@clustervetgonow.yqmunq6.mongodb.net/test?retryWrites=true&w=majority
   ```
   
   **Nota**: Solo cambia `/VetGoNow` por `/test` en la URL

4. **Guarda los cambios**
   - Haz clic en **Save Changes**
   - Render reiniciará automáticamente el servicio

5. **Verifica que funciona**
   - Espera a que el servicio se reinicie (1-2 minutos)
   - Verifica que la aplicación funcione correctamente
   - Los precios ya están actualizados en la base de datos "test"

## Alternativa: Mantener "VetGoNow"

Si prefieres usar "VetGoNow" en lugar de "test":

1. Los precios ya están actualizados en ambas bases de datos
2. No necesitas cambiar nada en Render
3. Solo asegúrate de que los datos estén sincronizados

## Verificar qué Base de Datos está Usando

Para verificar qué base de datos está usando realmente Render, revisa los logs:

1. Ve a **Logs** en tu servicio de Render
2. Busca el mensaje de conexión a MongoDB
3. Debería mostrar algo como: `MongoDB Connected: clustervetgonow.yqmunq6.mongodb.net`

Si quieres verificar programáticamente, puedes agregar un log temporal en `Backend/index.js`:

```javascript
mongoose.connect(mongoDBURL)
  .then(() => {
    console.log('MongoDB Connected');
    console.log('Database:', mongoose.connection.db.databaseName); // Esto mostrará qué BD está usando
  })
```

## Recomendación Final

**Usa "test" como base de datos de producción** porque:
- Ya tiene todos los datos actualizados
- Funciona correctamente según tu confirmación
- Es más simple mantener una sola base de datos para producción

