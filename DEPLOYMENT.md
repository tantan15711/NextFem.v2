# Despliegue de NextFem

Esta fase deja el proyecto listo para desplegar frontend y backend por separado.
Una ruta sencilla es: backend en Render/Railway/Fly.io, base de datos en PostgreSQL
gestionado, y frontend en Vercel/Netlify.

## Backend

Variables necesarias en el servidor:

```env
PORT=3000
DATABASE_URL=postgres://USUARIO:PASSWORD@HOST:5432/BASE
JWT_SECRET=un_secreto_largo_para_sesiones
MESSAGE_SECRET=un_secreto_largo_para_cifrar_mensajes
FRONTEND_URL=https://tu-dominio-frontend.com
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
```

Comandos:

```bash
npm install
npm run db:setup
npm start
```

Configuracion sugerida del servicio:

```txt
Root directory: backend
Build command: npm install
Start command: npm start
```

Notas:

- `MESSAGE_SECRET` no debe cambiar despues de tener mensajes reales; si cambia, los mensajes cifrados anteriores no se podran leer.
- `FRONTEND_URL` puede aceptar varios origenes separados por coma.
- `OPENAI_API_KEY` es opcional. Si la dejas vacia, NextFem usa IA local; si la configuras, activa sugerencias con OpenAI.
- El proveedor debe permitir WebSockets para que Socket.IO entregue mensajes en tiempo real.
- Si usas imagenes, audios o archivos subidos por usuarias, configura almacenamiento persistente para `backend/uploads` o mueve los archivos a un servicio como Cloudinary, S3 o Supabase Storage.

Ejemplo de varios dominios permitidos:

```env
FRONTEND_URL=https://nextfem.com,https://www.nextfem.com
```

## Frontend

Variables necesarias:

```env
VITE_API_URL=https://tu-backend.com/api
VITE_SOCKET_URL=https://tu-backend.com
```

Comandos:

```bash
npm install
npm run build
```

Configuracion sugerida del servicio:

```txt
Root directory: frontend
Build command: npm install && npm run build
Publish directory: dist
```

La carpeta final para publicar es:

```txt
frontend/dist
```

Como el frontend usa Vue Router con historial limpio, el hosting debe redirigir
cualquier ruta del frontend a `index.html`. En Netlify puedes usar:

```txt
/* /index.html 200
```

## Checklist final

- Backend encendido con `npm start`.
- Base de datos PostgreSQL accesible desde el backend.
- `npm run db:setup` ejecutado en produccion una vez.
- Frontend construido con las URLs reales.
- CORS configurado con el dominio real del frontend.
- `MESSAGE_SECRET` guardado de forma segura.
- WebSockets habilitados en el hosting del backend.
- Almacenamiento persistente configurado para imagenes, audios y archivos.
