require("dotenv").config();

const setupDatabase = require("../src/config/setupDatabase");

setupDatabase().catch((error) => {
  console.error("No se pudo preparar la base de datos.");
  console.error(error.message);
  process.exit(1);
});
