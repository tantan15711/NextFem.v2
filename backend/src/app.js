require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("path");

const apiRoutes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const rateLimit = require("./middlewares/rateLimit");

const app = express();

const getAllowedOrigins = () => {
  const configured = process.env.FRONTEND_URL || "http://localhost:5173";
  return configured.split(",").map((origin) => origin.trim());
};

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = getAllowedOrigins();
      const localFrontend = origin && /^http:\/\/localhost:\d+$/.test(origin);

      if (!origin || allowedOrigins.includes(origin) || localFrontend) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS."));
    }
  })
);
app.use(express.json({ limit: "40mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/healthz", (req, res) => {
  res.json({
    ok: true,
    service: "nextfem-backend"
  });
});

app.use("/api/auth", rateLimit({ limit: 18, windowMs: 60_000 }));
app.use("/api/uploads", rateLimit({ limit: 25, windowMs: 60_000 }));
app.use("/api/conversations", rateLimit({ limit: 90, windowMs: 60_000 }));
app.use("/api", rateLimit({ limit: 240, windowMs: 60_000 }));

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
