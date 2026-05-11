# NextFem Marketplace

## Carpetas

- `backend`: API con Node.js, Express y PostgreSQL.
- `bd`: scripts SQL para tablas, categorias, perfil y chat.
- `frontend`: app Vue con Vite.

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

El registro, inicio de sesion, publicaciones y chat solo funcionan si el backend
esta encendido al mismo tiempo que el frontend.

Necesitas dos terminales abiertas:

- Terminal 1: `backend` con `npm run dev`
- Terminal 2: `frontend` con `npm run dev`

## Que ya funciona

- Registro e inicio de sesion.
- Perfil persistente.
- Publicar productos o servicios.
- Borrar publicaciones propias.
- Buscar por texto, ciudad y categoria.
- Ver productos similares.
- Chat entre compradora y vendedora.
- Datos guardados en PostgreSQL.
