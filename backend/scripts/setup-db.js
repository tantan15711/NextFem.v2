require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const run = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  const dbPath = path.join(__dirname, "..", "..", "bd");
  const sqlFiles = fs
    .readdirSync(dbPath)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of sqlFiles) {
    const sql = fs.readFileSync(path.join(dbPath, file), "utf8");
    await client.query(sql);
    console.log(`Ejecutado: ${file}`);
  }

  const tables = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
  );

  await client.end();

  console.log("Base de datos lista.");
  console.log("Tablas encontradas:");
  tables.rows.forEach((row) => console.log(`- ${row.table_name}`));
};

run().catch((error) => {
  console.error("No se pudo preparar la base de datos.");
  console.error(error.message);
  process.exit(1);
});
