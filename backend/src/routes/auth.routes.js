const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");

const { query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");
const auth = require("../middlewares/auth");

const router = express.Router();

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const publicUserFields =
  "id, name, email, phone, city, role, business_name, bio, avatar_url, created_at";

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      password,
      phone,
      city,
      role = "seller",
      businessName,
      bio
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nombre, correo y contrasena son obligatorios."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contrasena debe tener al menos 6 caracteres."
      });
    }

    const existingUser = await query("select id from users where email = $1", [
      email
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Ya existe una cuenta con ese correo."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `insert into users
        (name, email, password_hash, phone, city, role, business_name, bio)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning ${publicUserFields}`,
      [
        name,
        email.toLowerCase(),
        passwordHash,
        phone || null,
        city || null,
        role,
        businessName || null,
        bio || null
      ]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: "Usuario registrado correctamente.",
      token: createToken(user),
      user
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contrasena son obligatorios."
      });
    }

    const result = await query("select * from users where email = $1", [
      email.toLowerCase()
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    delete user.password_hash;

    res.json({
      message: "Sesion iniciada correctamente.",
      token: createToken(user),
      user
    });
  })
);

router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(`select ${publicUserFields} from users where id = $1`, [
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.json(result.rows[0]);
  })
);

router.patch(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const { name, phone, city, businessName, bio, avatarUrl } = req.body;

    const result = await query(
      `update users
       set
         name = coalesce($1, name),
         phone = coalesce($2, phone),
         city = coalesce($3, city),
         business_name = coalesce($4, business_name),
         bio = coalesce($5, bio),
         avatar_url = coalesce($6, avatar_url),
         updated_at = now()
       where id = $7
       returning ${publicUserFields}`,
      [
        name,
        phone,
        city,
        businessName,
        bio,
        avatarUrl,
        req.user.id
      ]
    );

    res.json({
      message: "Perfil actualizado correctamente.",
      user: result.rows[0]
    });
  })
);

module.exports = router;
