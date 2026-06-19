# Despliegue de NextFem

Para una guia corta de subida, usa primero [DEPLOY_NOW.md](DEPLOY_NOW.md).

Esta fase deja el proyecto listo para desplegar frontend y backend por separado.
La ruta recomendada para este proyecto es: backend y PostgreSQL en Railway, y
frontend en Vercel.

## Backend

Variables necesarias en el servidor:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=false
JWT_SECRET=un_secreto_largo_para_sesiones
MESSAGE_SECRET=un_secreto_largo_para_cifrar_mensajes
FRONTEND_URL=https://next-fem-v2.vercel.app
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
```

Comandos:

```bash
npm install
npm start
```

Railway usa los comandos definidos en `railway.json`:

```txt
Build command: npm run railway:build
Pre-deploy command: npm run railway:db
Start command: npm run railway:start
Healthcheck path: /api/health
```

Notas:

- No configures `PORT` en Railway; Railway lo inyecta automaticamente.
- `MESSAGE_SECRET` no debe cambiar despues de tener mensajes reales; si cambia, los mensajes cifrados anteriores no se podran leer.
- `FRONTEND_URL` puede aceptar varios origenes separados por coma.
- `OPENAI_API_KEY` es opcional. Si la dejas vacia, NextFem usa IA local; si la configuras, activa sugerencias con OpenAI.
- El proveedor debe permitir WebSockets para que Socket.IO entregue mensajes en tiempo real.
- Si usas imagenes, audios o archivos subidos por usuarias, configura almacenamiento persistente para `backend/uploads` o mueve los archivos a un servicio como Cloudinary, S3 o Supabase Storage.
- Si usas Neon o Supabase en lugar de Railway PostgreSQL, cambia `DATABASE_URL` por esa URL y usa `DATABASE_SSL=true`.

Ejemplo de varios dominios permitidos:

```env
FRONTEND_URL=https://nextfem.com,https://www.nextfem.com
```

## Frontend

Variables necesarias:

```env
VITE_API_URL=https://TU-BACKEND.up.railway.app/api
VITE_SOCKET_URL=https://TU-BACKEND.up.railway.app
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

En Vercel, si conectas el repositorio completo, configura `frontend` como
`Root Directory`.

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

- Backend desplegado en Railway y respondiendo `/api/health`.
- Base de datos PostgreSQL creada en Railway.
- `npm run railway:db` ejecutado por el pre-deploy.
- Frontend construido con las URLs reales.
- CORS configurado con el dominio real del frontend.
- `MESSAGE_SECRET` guardado de forma segura.
- WebSockets habilitados en el hosting del backend.
- Almacenamiento persistente configurado para imagenes, audios y archivos.
