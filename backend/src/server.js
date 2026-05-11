const app = require("./app");
const { pool } = require("./config/db");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});

const closeServer = async () => {
  console.log("Cerrando servidor...");
  await pool.end();
  server.close(() => process.exit(0));
};

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
