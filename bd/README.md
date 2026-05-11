# Base de datos

Esta carpeta contiene los archivos SQL para PostgreSQL.

Ejecutalos en este orden:

1. `01_schema.sql`
2. `02_seed.sql`

Si usas pgAdmin:

1. Crea la base de datos `marketplace_mujeres`.
2. Abre la base de datos.
3. Abre Query Tool.
4. Copia y ejecuta primero `01_schema.sql`.
5. Copia y ejecuta despues `02_seed.sql`.

Si usas la terminal con `psql` desde la raiz del proyecto:

```bash
psql -U postgres -d marketplace_mujeres -f bd/01_schema.sql
psql -U postgres -d marketplace_mujeres -f bd/02_seed.sql
```
