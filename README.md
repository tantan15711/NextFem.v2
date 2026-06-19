# NextFem Marketplace

Marketplace gratuito para que mujeres emprendedoras puedan publicar productos,
conectar con compradoras, conversar de forma segura y fortalecer sus negocios.

## Carpetas

- `backend`: API con Node.js, Express, Socket.IO y PostgreSQL.
- `bd`: scripts SQL para tablas, categorias, perfil, productos, chat y busquedas.
- `frontend`: app Vue con Vite y Vue Router.

Estructura principal del frontend:

- `src/router`: rutas de navegacion.
- `src/views`: pantallas como inicio, publicar, perfil, chat y cursos.
- `src/components`: piezas reutilizables como la barra superior, tarjetas y modales.
- `src/composables`: estado y acciones compartidas del marketplace.
- `src/styles`: estilos globales responsivos.

## 1. Backend

```bash
cd backend
npm install
npm run db:setup
npm run dev
```

API:

```txt
http://localhost:3000/api
```

Prueba:

```txt
http://localhost:3000/api/health
```

## 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

App:

```txt
http://localhost:5173
```

## Importante

El registro, inicio de sesion, publicaciones, chat y multimedia solo funcionan si
el backend esta encendido al mismo tiempo que el frontend.

Si PowerShell bloquea `npm`, usa `npm.cmd` en los mismos comandos, por ejemplo
`npm.cmd run dev`.

Necesitas dos terminales abiertas:

- Terminal 1: `backend` con `npm run dev`
- Terminal 2: `frontend` con `npm run dev`

## Que ya funciona

- Registro e inicio de sesion.
- Perfil persistente.
- Publicar productos o servicios.
- Subir imagen desde galeria o usar URL de imagen para publicaciones.
- Borrar publicaciones propias.
- Buscar por texto, ciudad y categoria.
- Filtros por precio, gratuitos y popularidad.
- Algoritmo de productos mas buscados y tendencias de busqueda.
- Abrir la imagen publicada en una vista ampliada.
- Favoritos, reportes y resenas de vendedoras.
- Panel de metricas para cada emprendedora.
- Ver productos similares.
- Chat en tiempo real entre compradora y vendedora.
- Bandeja de chats: primero ves conversaciones y luego entras al hilo elegido.
- Notificaciones internas por mensajes nuevos y opcion de activar avisos del navegador.
- Navegacion inferior movil tipo app para telefono.
- Envio de imagenes, videos, archivos, audios grabados y ubicacion desde el chat.
- Ubicacion fija o marcada como tiempo real desde la conversacion.
- Indicador de escritura en conversaciones.
- Bloquear usuarias desde el chat y ocultar publicaciones bloqueadas.
- Borrar mensajes o archivos para mi o para todos, con opcion temporal de deshacer.
- Confirmacion antes de borrar mensajes para todos.
- Mensajes cifrados en la base de datos.
- Limites basicos anti-spam en API, auth, chat y subidas.
- Busqueda inteligente con IA para convertir frases en filtros.
- Asistente de publicacion con descripciones, hashtags, tips y datos faltantes.
- Respuestas rapidas, resumen de conversaciones y alerta de seguridad con IA.
- IA hibrida: funciona localmente sin API key y usa OpenAI si configuras `OPENAI_API_KEY`.
- Compresion automatica de imagenes antes de subir.
- Navegacion por rutas con Vue Router.
- Datos guardados en PostgreSQL.
- Preparacion para despliegue en `DEPLOYMENT.md`.

## IA opcional

NextFem ya trae un modo local de IA para la demo y pruebas. Para activar IA real
con OpenAI en el backend, agrega estas variables en `backend/.env`:

```env
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
```

Si `OPENAI_API_KEY` queda vacia, la app sigue funcionando con sugerencias locales.

## Permisos del navegador

Para usar audio y ubicacion, el navegador puede pedir permiso de microfono y
ubicacion. En desarrollo local, `localhost` permite estas funciones.
