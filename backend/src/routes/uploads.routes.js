const fs = require("fs");
const path = require("path");

const express = require("express");

const auth = require("../middlewares/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads");

const allowedTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.post("/", auth, (req, res) => {
  const { imageData } = req.body;

  if (!imageData) {
    return res.status(400).json({ message: "Selecciona una imagen." });
  }

  const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return res.status(400).json({ message: "La imagen no tiene un formato valido." });
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = allowedTypes[mimeType];

  if (!extension) {
    return res.status(400).json({
      message: "Formato no permitido. Usa JPG, PNG, WEBP o GIF."
    });
  }

  const buffer = Buffer.from(base64, "base64");
  const maxSize = 4 * 1024 * 1024;

  if (buffer.length > maxSize) {
    return res.status(400).json({
      message: "La imagen pesa mas de 4 MB. Intenta con una imagen mas ligera."
    });
  }

  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  fs.writeFileSync(path.join(uploadDir, fileName), buffer);

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;

  res.status(201).json({
    message: "Imagen cargada correctamente.",
    imageUrl
  });
});

module.exports = router;
