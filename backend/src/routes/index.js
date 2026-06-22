const express = require("express");
const { query } = require("../config/db");

const authRoutes = require("./auth.routes");
const assistantRoutes = require("./assistant.routes");
const categoryRoutes = require("./categories.routes");
const conversationRoutes = require("./conversations.routes");
const engagementRoutes = require("./engagement.routes");
const productRoutes = require("./products.routes");
const uploadRoutes = require("./uploads.routes");
const asyncHandler = require("../middlewares/asyncHandler");

const router = express.Router();

router.get(
  "/health",
  asyncHandler(async (req, res) => {
    try {
      const db = await query("select now() as current_time");

      res.json({
        message: "API y base de datos funcionando",
        databaseTime: db.rows[0].current_time
      });
    } catch (error) {
      res.status(500).json({
        message: "API funcionando, pero no se pudo conectar con la base de datos.",
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        databaseSsl: process.env.DATABASE_SSL || "false",
        code: error.code || "UNKNOWN",
        detail: error.message
      });
    }
  })
);

router.use("/auth", authRoutes);
router.use("/assistant", assistantRoutes);
router.use("/categories", categoryRoutes);
router.use("/conversations", conversationRoutes);
router.use("/engagement", engagementRoutes);
router.use("/products", productRoutes);
router.use("/uploads", uploadRoutes);

module.exports = router;
