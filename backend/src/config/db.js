const { Pool } = require("pg");
const { getDatabaseOptions } = require("./databaseOptions");

const pool = new Pool(getDatabaseOptions());

pool.on("error", (error) => {
  console.error("Error inesperado en PostgreSQL:", error);
});

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query
};
