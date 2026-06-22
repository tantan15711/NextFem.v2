const app = require("./app");
const http = require("http");
const { pool } = require("./config/db");
const { initSocket } = require("./realtime/socket");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});

const closeServer = async () => {
  console.log("Cerrando servidor...");
  await pool.end();
  server.close(() => process.exit(0));
};

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
