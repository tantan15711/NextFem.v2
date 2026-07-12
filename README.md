# NextFem con Supabase

Version experimental e independiente de NextFem usando Vue + Supabase en lugar de un backend Express.

## Que cambia

- El frontend Vue se mantiene.
- El backend Express fue retirado de esta copia.
- Autenticacion, base de datos, archivos y realtime usan Supabase.
- Vercel solo despliega el frontend.

## Tecnologias

- Vue 3
- Vite
- Vue Router
- Supabase Auth
- Supabase Database/PostgreSQL
- Supabase Storage
- Supabase Realtime

## Configuracion en Supabase

1. Crea un proyecto en Supabase.
2. Ve a SQL Editor.
3. Ejecuta `supabase/schema.sql`.
4. Ve a Storage y crea estos buckets publicos:
   - `nextfem-products`
   - `nextfem-avatars`
   - `nextfem-chat`
5. Ve a Database > Replication y activa realtime para:
   - `conversations`
   - `messages`
   - `notifications`
6. En Authentication > Providers, habilita Email.

Para pruebas rapidas, puedes desactivar confirmacion de correo en Authentication > Providers > Email.

## Variables de entorno

Copia `frontend/.env.example` a `frontend/.env` y llena:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_DE_SUPABASE
```

En Vercel agrega las mismas variables.

## Ejecutar local

```bash
cd frontend
npm install
npm run dev
```

## Funciones incluidas

- Registro e inicio de sesion con Supabase Auth.
- Publicacion de productos con varias imagenes o video.
- Productos recien publicados.
- Favoritos.
- Reseñas con promedio de estrellas.
- Chat entre clienta y vendedora con Supabase Realtime.
- Notificaciones por mensaje, favorito, reseña y nuevas publicaciones de vendedoras seguidas.
- Seguir vendedoras y seccion Novedades.
- Perfil de vendedora.
- Insignias automaticas:
  - Nueva emprendedora.
  - 10 ventas realizadas.
  - Vendedora destacada.
  - Cursos completados.
- Estadisticas de vendedora.
- Reporte de productos.
- Compartir productos.
- Cursos con progreso.

## Despliegue en Vercel

Usa la raiz del proyecto y esta configuracion:

- Framework: Vite
- Install command: `npm --prefix frontend ci`
- Build command: `npm --prefix frontend run build`
- Output directory: `frontend/dist`

El archivo `vercel.json` ya contiene esos valores.

