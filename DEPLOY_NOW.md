# Subir NextFem rapido

Tu proyecto necesita dos despliegues:

- Frontend: Vercel.
- Backend + PostgreSQL: Render, Railway o similar.

No necesitas tener tu backend local encendido. En produccion el backend debe estar
desplegado en internet.

## 1. Backend en Render

1. Sube este repositorio a GitHub.
2. En Render, crea un `Blueprint`.
3. Selecciona este repositorio.
4. Render usara `render.yaml` y creara:
   - `nextfem-backend`
   - `nextfem-db`
5. Cuando termine, abre:

```txt
https://TU-BACKEND.onrender.com/api/health
```

Si responde `API y base de datos funcionando`, el backend ya esta listo.

## 2. Variables del frontend en Vercel

En tu proyecto de Vercel entra a:

```txt
Settings > Environment Variables
```

Agrega:

```env
VITE_API_URL=https://TU-BACKEND.onrender.com/api
VITE_SOCKET_URL=https://TU-BACKEND.onrender.com
```

Despues haz:

```txt
Deployments > Redeploy
```

## 3. Variable del backend

En Render, revisa que el backend tenga:

```env
FRONTEND_URL=https://next-fem-v2.vercel.app
DATABASE_SSL=true
```

Si tu URL de Vercel cambia, cambia `FRONTEND_URL` en Render y reinicia el backend.

## 4. OpenAI es opcional

Si no tienes API key, deja esto vacio:

```env
OPENAI_API_KEY=
```

NextFem seguira funcionando con IA local.
