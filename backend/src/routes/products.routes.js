const express = require("express");
const jwt = require("jsonwebtoken");

const { pool, query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");
const auth = require("../middlewares/auth");

const router = express.Router();

const productMediaSelect = `
  coalesce(media_items.media, '[]'::json) as media,
  media_items.primary_media_mime,
  media_items.primary_media_type
`;

const productMediaJoin = `
  left join lateral (
    select
      json_agg(
        json_build_object(
          'id', pm.id,
          'url', pm.url,
          'mediaType', pm.media_type,
          'mimeType', pm.mime_type,
          'fileName', pm.file_name,
          'sortOrder', pm.sort_order,
          'isPrimary', pm.is_primary
        )
        order by pm.sort_order, pm.id
      ) as media,
      (array_agg(pm.mime_type order by pm.is_primary desc, pm.sort_order, pm.id))[1] as primary_media_mime,
      (array_agg(pm.media_type order by pm.is_primary desc, pm.sort_order, pm.id))[1] as primary_media_type
    from product_media pm
    where pm.product_id = p.id
  ) media_items on true
`;

const normalizeProductMedia = (media = []) => {
  if (!Array.isArray(media)) return [];

  return media
    .slice(0, 8)
    .map((item, index) => {
      const url = String(item?.url || "").trim();
      const mimeType = String(item?.mimeType || item?.mime_type || "").trim();
      const fileName = String(item?.fileName || item?.file_name || "").trim();
      const requestedType = String(item?.mediaType || item?.media_type || "").toLowerCase();
      const mediaType =
        requestedType === "video" || mimeType.startsWith("video/") ? "video" : "image";

      return {
        url,
        mediaType,
        mimeType,
        fileName,
        sortOrder: Number.isInteger(Number(item?.sortOrder))
          ? Number(item.sortOrder)
          : index,
        isPrimary: Boolean(item?.isPrimary) || index === 0
      };
    })
    .filter((item) => item.url && ["image", "video"].includes(item.mediaType));
};

const getOptionalUserId = (req) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET).id;
  } catch (error) {
    return null;
  }
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, city, freeOnly, maxPrice, minPrice, search, sort } = req.query;
    const currentUserId = getOptionalUserId(req);
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

    if (minPrice) {
      values.push(Number(minPrice));
      filters.push(`p.price >= $${values.length}`);
    }

    if (maxPrice) {
      values.push(Number(maxPrice));
      filters.push(`p.price <= $${values.length}`);
    }

    if (freeOnly === "true") {
      filters.push("p.is_free = true");
    }

    if (currentUserId) {
      values.push(currentUserId);
      filters.push(
        `not exists (
          select 1
          from user_blocks ub
          where (ub.blocker_id = $${values.length} and ub.blocked_id = p.user_id)
             or (ub.blocker_id = p.user_id and ub.blocked_id = $${values.length})
        )`
      );
    }

    const orderBy =
      sort === "price_asc"
        ? "p.price asc, p.created_at desc"
        : sort === "price_desc"
          ? "p.price desc, p.created_at desc"
          : sort === "popular"
            ? "favorite_count desc, p.created_at desc"
            : sort === "searched"
              ? "search_score desc, favorite_count desc, p.created_at desc"
            : "p.created_at desc";

    const result = await query(
      `select
         p.id,
         p.title,
         p.description,
         p.price,
         p.is_free,
         p.image_url,
         ${productMediaSelect},
         p.city,
         p.status,
         p.created_at,
         u.id as seller_id,
         c.name as category_name,
         c.slug as category_slug,
         u.name as seller_name,
         u.phone as seller_phone,
         coalesce(fav.favorite_count, 0)::int as favorite_count,
         coalesce(searches.search_score, 0)::int as search_score,
         round(coalesce(rev.avg_rating, 0), 1) as seller_rating,
         coalesce(rev.review_count, 0)::int as seller_review_count
       from products p
       join users u on u.id = p.user_id
       left join categories c on c.id = p.category_id
       ${productMediaJoin}
       left join (
         select product_id, count(*) as favorite_count
         from product_favorites
         group by product_id
       ) fav on fav.product_id = p.id
       left join (
         select
           product_id,
           sum(
             case event_type
               when 'contact' then 5
               when 'open_image' then 3
               when 'similar' then 2
               when 'view' then 2
               else 1
             end
           ) as search_score
         from product_search_events
         where product_id is not null
           and created_at > now() - interval '30 days'
         group by product_id
       ) searches on searches.product_id = p.id
       left join (
         select seller_id, avg(rating)::numeric as avg_rating, count(*) as review_count
         from seller_reviews
         group by seller_id
       ) rev on rev.seller_id = u.id
       where ${filters.join(" and ")}
       order by ${orderBy}`,
      values
    );

    res.json(result.rows);
  })
);

router.get(
  "/trends",
  asyncHandler(async (req, res) => {
    const result = await query(
      `select
         trim(query) as query,
         count(*)::int as searches
       from product_search_events
       where event_type = 'search'
         and query is not null
         and trim(query) <> ''
         and created_at > now() - interval '30 days'
       group by trim(query)
       order by searches desc, query asc
       limit 8`
    );

    res.json(result.rows);
  })
);

router.post(
  "/events",
  asyncHandler(async (req, res) => {
    const { productId = null, query: searchQuery = "", eventType = "search" } = req.body;
    const allowedTypes = new Set(["search", "view", "open_image", "contact", "similar"]);

    if (!allowedTypes.has(eventType)) {
      return res.status(400).json({ message: "Evento no valido." });
    }

    await query(
      `insert into product_search_events (user_id, product_id, query, event_type)
       values ($1, $2, $3, $4)`,
      [
        getOptionalUserId(req),
        productId || null,
        searchQuery ? String(searchQuery).slice(0, 120) : null,
        eventType
      ]
    );

    res.status(201).json({ message: "Evento registrado." });
  })
);

router.get(
  "/mine",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `select
         p.*,
         ${productMediaSelect},
         c.name as category_name,
         c.slug as category_slug
       from products p
       left join categories c on c.id = p.category_id
       ${productMediaJoin}
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
         ${productMediaSelect},
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
       ${productMediaJoin}
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
         ${productMediaSelect},
         c.name as category_name,
         c.slug as category_slug,
         u.id as seller_id,
         u.name as seller_name,
         u.phone as seller_phone,
         u.city as seller_city
       from products p
       join users u on u.id = p.user_id
       left join categories c on c.id = p.category_id
       ${productMediaJoin}
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
      city,
      media = []
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Titulo y descripcion son obligatorios."
      });
    }

    const mediaItems = normalizeProductMedia(media);
    const primaryUrl =
      imageUrl ||
      mediaItems.find((item) => item.mediaType === "image")?.url ||
      null;
    const client = await pool.connect();

    try {
      await client.query("begin");

      const result = await client.query(
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
          primaryUrl,
          city || null
        ]
      );

      const product = result.rows[0];

      for (const [index, item] of mediaItems.entries()) {
        await client.query(
          `insert into product_media
            (product_id, url, media_type, mime_type, file_name, sort_order, is_primary)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            product.id,
            item.url,
            item.mediaType,
            item.mimeType || null,
            item.fileName || null,
            item.sortOrder,
            item.isPrimary || index === 0
          ]
        );
      }

      await client.query("commit");

      res.status(201).json({
        message: "Publicacion creada correctamente.",
        product
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
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
