# Subir NextFem con Railway y Vercel

Tu proyecto queda separado asi:

- Backend + PostgreSQL: Railway.
- Frontend: Vercel.

No necesitas tener tu backend local encendido. Railway sera el backend publico.

## 1. Crear backend en Railway

1. En Railway crea un proyecto nuevo.
2. Agrega una base de datos: `New > Database > PostgreSQL`.
3. Agrega un servicio desde GitHub: `New > GitHub Repo`.
4. Selecciona este repo.
5. Railway usara `railway.json` desde la raiz.

Railway ejecutara:

```bash
npm run railway:build
npm run railway:db
npm run railway:start
```

## 2. Variables del backend en Railway

En el servicio del backend, entra a `Variables` y agrega:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=false
JWT_SECRET=usa_generate
MESSAGE_SECRET=usa_generate
FRONTEND_URL=https://next-fem-v2.vercel.app
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
```

Notas:

- Si tu servicio de PostgreSQL no se llama `Postgres`, cambia la referencia por
  el nombre real. Ejemplo: `${{PostgreSQL.DATABASE_URL}}`.
- `JWT_SECRET` y `MESSAGE_SECRET` deben ser diferentes.
- `OPENAI_API_KEY` puede quedarse vacia.
- No agregues `PORT`; Railway lo pone automaticamente.

## 3. Generar dominio del backend

En Railway:

```txt
Backend service > Settings > Networking > Generate Domain
```

Te dara una URL parecida a:

```txt
https://nextfem-backend-production.up.railway.app
```

Prueba:

```txt
https://TU-BACKEND.up.railway.app/api/health
```

Debe responder que la API y la base funcionan.

## 4. Variables del frontend en Vercel

En Vercel entra a:

```txt
Project > Settings > Environment Variables
```

Agrega:

```env
VITE_API_URL=https://TU-BACKEND.up.railway.app/api
VITE_SOCKET_URL=https://TU-BACKEND.up.railway.app
```

Despues haz:

```txt
Deployments > Redeploy
```

## 5. Si cambia tu URL de Vercel

Actualiza `FRONTEND_URL` en Railway con la URL final de Vercel y redeploya el
backend.
