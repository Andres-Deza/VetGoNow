# Configurar Render MCP Server en Cursor

Esta guía te ayudará a configurar el MCP server de Render para gestionar tu infraestructura directamente desde Cursor.

## ¿Qué es el Render MCP Server?

El **Model Context Protocol (MCP) server de Render** te permite:

- Crear nuevos servicios
- Consultar bases de datos
- Analizar métricas y logs
- Gestionar variables de entorno
- Y más, todo desde Cursor usando lenguaje natural

## Pasos de Configuración

### 1. Crear una API Key de Render

1. Ve a tu [Render Dashboard](https://dashboard.render.com/settings#api-keys)
2. Haz clic en "Create API Key"
3. Dale un nombre descriptivo (ej: "Cursor MCP")
4. **Copia la API key** (solo se muestra una vez)

⚠️ **Importante**: Las API keys de Render tienen acceso amplio a todos tus workspaces y servicios. Asegúrate de guardarla de forma segura.

### 2. Configurar Cursor

El archivo de configuración de MCP en Cursor está en:

- **Windows**: `%APPDATA%\Cursor\mcp.json` o `C:\Users\TU_USUARIO\AppData\Roaming\Cursor\mcp.json`
- **macOS/Linux**: `~/.cursor/mcp.json`

#### Opción A: Crear/Editar el archivo manualmente

1. Abre o crea el archivo `mcp.json` en la ubicación indicada arriba
2. Agrega la siguiente configuración:

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer TU_API_KEY_AQUI"
      }
    }
  }
}
```

3. Reemplaza `TU_API_KEY_AQUI` con tu API key de Render
4. Guarda el archivo
5. Reinicia Cursor

#### Opción B: Usar el comando desde Cursor

Puedes pedirle a Cursor que te ayude a crear el archivo, o hacerlo manualmente desde la terminal.

### 3. Establecer tu Workspace

Una vez configurado, necesitas establecer tu workspace de Render. Puedes hacerlo con un prompt como:

```
Set my Render workspace to [NOMBRE_DE_TU_WORKSPACE]
```

O simplemente cuando uses el MCP server por primera vez, Cursor te pedirá que selecciones un workspace.

## Ejemplos de Uso

Una vez configurado, puedes usar prompts como:

### Gestión de Servicios

- "List my Render services"
- "Create a new web service named vetgonow-backend"
- "Show me the details of my vetgonow-backend service"

### Variables de Entorno

- "Update environment variables for vetgonow-backend"
- "Show me all environment variables for my backend service"

### Logs y Métricas

- "Show me the most recent error logs for vetgonow-backend"
- "What was the busiest traffic day for my service this month?"
- "Pull the most recent error-level logs for my API service"

### Bases de Datos

- "List all my Render databases"
- "Query my database for daily signup counts for the last 30 days"

### Troubleshooting

- "Why isn't my site at vetgonow-backend.onrender.com working?"
- "Show me the deploy history for vetgonow-backend"

## Acciones Soportadas

El MCP server de Render soporta:

- ✅ **Workspaces**: Listar, seleccionar, obtener detalles
- ✅ **Services**: Crear, listar, obtener detalles, actualizar variables de entorno
- ✅ **Deploys**: Listar historial, obtener detalles
- ✅ **Logs**: Listar logs con filtros
- ✅ **Metrics**: CPU, memoria, instancias, conexiones, ancho de banda
- ✅ **Postgres**: Crear, listar, consultar (solo lectura)
- ✅ **Key Value**: Crear, listar, obtener detalles

## Limitaciones

- ❌ No soporta crear instancias gratuitas
- ❌ No soporta todos los tipos de servicios (solo web services y static sites)
- ❌ No puede modificar o eliminar recursos (excepto variables de entorno)
- ❌ No puede triggerear deploys o modificar escalado

Para estas acciones, usa el [Render Dashboard](https://dashboard.render.com) o la [REST API](https://render.com/docs/api).

## Referencias

- [Documentación oficial de Render MCP](https://render.com/docs/mcp-server)
- [Documentación de Cursor MCP](https://docs.cursor.com/context/mcp)
- [Repositorio del MCP server](https://github.com/render-oss/render-mcp-server)

## Solución de Problemas

### El MCP server no aparece en Cursor

1. Verifica que el archivo `mcp.json` esté en la ubicación correcta
2. Verifica que la API key sea correcta
3. Reinicia Cursor completamente
4. Verifica que la sintaxis JSON sea correcta

### Error de autenticación

1. Verifica que la API key sea válida
2. Asegúrate de que el formato del header sea: `Bearer TU_API_KEY`
3. Crea una nueva API key si es necesario

### No puedo seleccionar un workspace

1. Asegúrate de tener al menos un workspace en Render
2. Usa el nombre exacto del workspace (case-sensitive)
3. Verifica que tu API key tenga acceso al workspace
