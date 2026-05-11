const express = require("express");

const { query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");
const auth = require("../middlewares/auth");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, city, search } = req.query;
    const values = [];
    const filters = ["p.status = 'active'"];

    if (category) {
      values.push(category);
      filters.push(`c.slug = $${values.length}`);
    }

    if (city) {
      values.push(`%${city}%`);
      filters.push(`p.city ilike $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      filters.push(
        `(p.title ilike $${values.length} or p.description ilike $${values.length})`
      );
    }

    const result = await query(
      `select
         p.id,
         p.title,
         p.description,
         p.price,
         p.is_free,
         p.image_url,
         p.city,
         p.status,
         p.created_at,
         u.id as seller_id,
         c.name as category_name,
         c.slug as category_slug,
         u.name as seller_name,
         u.phone as seller_phone
       from products p
       join users u on u.id = p.user_id
       left join categories c on c.id = p.category_id
       where ${filters.join(" and ")}
       order by p.created_at desc`,
      values
    );

    res.json(result.rows);
  })
);

router.get(
  "/mine",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `select
         p.*,
         c.name as category_name,
         c.slug as category_slug
       from products p
       left join categories c on c.id = p.category_id
       where p.user_id = $1
       order by p.created_at desc`,
      [req.user.id]
    );

    res.json(result.rows);
  })
);

router.get(
  "/:id/similar",
  asyncHandler(async (req, res) => {
    const current = await query(
      "select id, category_id, city from products where id = $1",
      [req.params.id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ message: "Publicacion no encontrada." });
    }

    const product = current.rows[0];

    const result = await query(
      `select
         p.id,
         p.title,
         p.description,
         p.price,
         p.is_free,
         p.image_url,
         p.city,
         p.status,
         p.created_at,
         u.id as seller_id,
         c.name as category_name,
         c.slug as category_slug,
         u.name as seller_name
       from products p
       join users u on u.id = p.user_id
       left join categories c on c.id = p.category_id
       where p.id <> $1
         and p.status = 'active'
         and (
           ($2::bigint is not null and p.category_id = $2)
           or ($3::varchar is not null and p.city ilike $3)
         )
       order by
         case when p.category_id = $2 then 0 else 1 end,
         p.created_at desc
       limit 6`,
      [
        product.id,
        product.category_id,
        product.city ? `%${product.city}%` : null
      ]
    );

    res.json(result.rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query(
      `select
         p.*,
         c.name as category_name,
         c.slug as category_slug,
         u.id as seller_id,
         u.name as seller_name,
         u.phone as seller_phone,
         u.city as seller_city
       from products p
       join users u on u.id = p.user_id
       left join categories c on c.id = p.category_id
       where p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Publicacion no encontrada." });
    }

    res.json(result.rows[0]);
  })
);

router.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const {
      categoryId,
      title,
      description,
      price = 0,
      isFree,
      imageUrl,
      city
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Titulo y descripcion son obligatorios."
      });
    }

    const result = await query(
      `insert into products
        (user_id, category_id, title, description, price, is_free, image_url, city)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        req.user.id,
        categoryId || null,
        title,
        description,
        price,
        typeof isFree === "boolean" ? isFree : Number(price || 0) === 0,
        imageUrl || null,
        city || null
      ]
    );

    res.status(201).json({
      message: "Publicacion creada correctamente.",
      product: result.rows[0]
    });
  })
);

router.patch(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const {
      categoryId,
      title,
      description,
      price,
      isFree,
      imageUrl,
      city,
      status
    } = req.body;

    const result = await query(
      `update products
       set
         category_id = coalesce($1, category_id),
         title = coalesce($2, title),
         description = coalesce($3, description),
         price = coalesce($4, price),
         is_free = coalesce($5, is_free),
         image_url = coalesce($6, image_url),
         city = coalesce($7, city),
         status = coalesce($8, status),
         updated_at = now()
       where id = $9 and user_id = $10
       returning *`,
      [
        categoryId,
        title,
        description,
        price,
        isFree,
        imageUrl,
        city,
        status,
        req.params.id,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No se encontro la publicacion o no tienes permiso."
      });
    }

    res.json({
      message: "Publicacion actualizada correctamente.",
      product: result.rows[0]
    });
  })
);

router.delete(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      "delete from products where id = $1 and user_id = $2 returning id",
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No se encontro la publicacion o no tienes permiso."
      });
    }

    res.json({ message: "Publicacion eliminada correctamente." });
  })
);

module.exports = router;
