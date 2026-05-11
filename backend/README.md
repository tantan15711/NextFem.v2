# Backend del marketplace

Este backend usa Node.js, Express y PostgreSQL.

## 1. Instalar dependencias

Desde la carpeta `backend`:

```bash
npm install
```

## 2. Crear archivo de variables

Copia `.env.example` y renombralo a `.env`.

Luego cambia `TU_PASSWORD` por la contrasena real de tu usuario `postgres`.

## 3. Crear la base de datos

En PostgreSQL crea una base llamada:

```sql
create database marketplace_mujeres;
```

Despues prepara las tablas y categorias iniciales con:

```bash
npm run db:setup
```

Ese comando ejecuta automaticamente los archivos SQL de la carpeta `bd`.

## 4. Arrancar el backend

```bash
npm run dev
```

La API quedara en:

```txt
http://localhost:3000
```

Prueba rapida:

```txt
http://localhost:3000/api/health
```
