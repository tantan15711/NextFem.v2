# Vercel para NextFem

NextFem usa:

- Frontend en Vercel.
- Backend en Railway.

## Opcion recomendada

Al importar el repo en Vercel, usa:

```txt
Root Directory: ./
Framework Preset: Other o Vite
Install Command: npm --prefix frontend ci
Build Command: npm --prefix frontend run build
Output Directory: frontend/dist
```

El archivo `vercel.json` de la raiz ya trae esos comandos.

## Si usas Root Directory frontend

Tambien funciona, pero entonces debe quedar asi:

```txt
Root Directory: frontend
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

Nunca pongas `cd frontend &&` si `Root Directory` ya es `frontend`.

## Variables obligatorias

En Vercel agrega:

```env
VITE_API_URL=https://TU-BACKEND.up.railway.app/api
VITE_SOCKET_URL=https://TU-BACKEND.up.railway.app
```

Despues haz `Redeploy` con `Clear cache`.

## Si tienes varios proyectos duplicados

Conserva uno solo y borra los demas desde:

```txt
Project > Settings > Delete Project
```
