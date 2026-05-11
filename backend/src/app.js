require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("path");

const apiRoutes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const localFrontend = origin && /^http:\/\/localhost:\d+$/.test(origin);

      if (!origin || origin === frontendUrl || localFrontend) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS."));
    }
  })
);
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "API del marketplace funcionando",
    docs: "/api/health"
  });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
