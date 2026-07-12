# Configuracion de Vercel para NextFem con Supabase

Esta version no necesita desplegar backend Express. El frontend se despliega en Vercel y se conecta directo a Supabase.

## Settings

- Framework Preset: `Vite`
- Root Directory: `./`
- Install Command: `npm --prefix frontend ci`
- Build Command: `npm --prefix frontend run build`
- Output Directory: `frontend/dist`

## Environment Variables

Agrega estas variables en Vercel:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_DE_SUPABASE
```

## Supabase

Antes de probar la app desplegada:

1. Ejecuta `supabase/schema.sql` en Supabase SQL Editor.
2. Crea los buckets publicos:
   - `nextfem-products`
   - `nextfem-avatars`
   - `nextfem-chat`
3. Activa realtime para:
   - `conversations`
   - `messages`
   - `notifications`

