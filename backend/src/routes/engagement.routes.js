const express = require("express");

const { query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");
const auth = require("../middlewares/auth");

const router = express.Router();

const productSelect = `
  select
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
    u.phone as seller_phone,
    coalesce(fav.favorite_count, 0)::int as favorite_count,
    round(coalesce(rev.avg_rating, 0), 1) as seller_rating,
    coalesce(rev.review_count, 0)::int as seller_review_count
  from products p
  join users u on u.id = p.user_id
  left join categories c on c.id = p.category_id
  left join (
    select product_id, count(*) as favorite_count
    from product_favorites
    group by product_id
  ) fav on fav.product_id = p.id
  left join (
    select seller_id, avg(rating)::numeric as avg_rating, count(*) as review_count
    from seller_reviews
    group by seller_id
  ) rev on rev.seller_id = u.id
`;

router.get(
  "/favorites",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `${productSelect}
       join product_favorites pf on pf.product_id = p.id
       where pf.user_id = $1 and p.status = 'active'
       order by pf.created_at desc`,
      [req.user.id]
    );

    res.json(result.rows);
  })
);

router.get(
  "/favorites/ids",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      "select product_id from product_favorites where user_id = $1",
      [req.user.id]
    );

    res.json(result.rows.map((row) => row.product_id));
  })
);

router.post(
  "/favorites/:productId",
  auth,
  asyncHandler(async (req, res) => {
    await query(
      `insert into product_favorites (user_id, product_id)
       values ($1, $2)
       on conflict (user_id, product_id) do nothing`,
      [req.user.id, req.params.productId]
    );

    res.status(201).json({ message: "Producto guardado en favoritos." });
  })
);

router.delete(
  "/favorites/:productId",
  auth,
  asyncHandler(async (req, res) => {
    await query(
      "delete from product_favorites where user_id = $1 and product_id = $2",
      [req.user.id, req.params.productId]
    );

    res.json({ message: "Producto eliminado de favoritos." });
  })
);

router.post(
  "/reports/product/:productId",
  auth,
  asyncHandler(async (req, res) => {
    const { reason = "revision", details = "" } = req.body;

    await query(
      `insert into product_reports (reporter_id, product_id, reason, details)
       values ($1, $2, $3, $4)`,
      [req.user.id, req.params.productId, reason, details]
    );

    res.status(201).json({
      message: "Gracias. Revisaremos esta publicacion."
    });
  })
);

router.post(
  "/reports/user/:userId",
  auth,
  asyncHandler(async (req, res) => {
    const { reason = "revision", details = "" } = req.body;

    if (String(req.user.id) === String(req.params.userId)) {
      return res.status(400).json({ message: "No puedes reportarte a ti misma." });
    }

    await query(
      `insert into user_reports (reporter_id, reported_user_id, reason, details)
       values ($1, $2, $3, $4)`,
      [req.user.id, req.params.userId, reason, details]
    );

    res.status(201).json({
      message: "Gracias. Revisaremos este perfil."
    });
  })
);

router.get(
  "/blocks",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `select
         b.blocked_id,
         b.reason,
         b.details,
         b.created_at,
         u.name,
         u.business_name,
         u.avatar_url
       from user_blocks b
       join users u on u.id = b.blocked_id
       where b.blocker_id = $1
       order by b.created_at desc`,
      [req.user.id]
    );

    res.json(result.rows);
  })
);

router.post(
  "/blocks/:userId",
  auth,
  asyncHandler(async (req, res) => {
    const { reason = "seguridad", details = "" } = req.body;

    if (String(req.user.id) === String(req.params.userId)) {
      return res.status(400).json({ message: "No puedes bloquearte a ti misma." });
    }

    await query(
      `insert into user_blocks (blocker_id, blocked_id, reason, details)
       values ($1, $2, $3, $4)
       on conflict (blocker_id, blocked_id)
       do update set reason = excluded.reason, details = excluded.details, created_at = now()`,
      [req.user.id, req.params.userId, reason, details]
    );

    res.status(201).json({
      message: "Usuaria bloqueada. Ya no podra enviarte mensajes."
    });
  })
);

router.delete(
  "/blocks/:userId",
  auth,
  asyncHandler(async (req, res) => {
    await query(
      "delete from user_blocks where blocker_id = $1 and blocked_id = $2",
      [req.user.id, req.params.userId]
    );

    res.json({ message: "Usuaria desbloqueada." });
  })
);

router.get(
  "/reviews/seller/:sellerId",
  asyncHandler(async (req, res) => {
    const result = await query(
      `select
         r.id,
         r.rating,
         r.comment,
         r.created_at,
         reviewer.name as reviewer_name,
         p.title as product_title
       from seller_reviews r
       join users reviewer on reviewer.id = r.reviewer_id
       left join products p on p.id = r.product_id
       where r.seller_id = $1
       order by r.created_at desc`,
      [req.params.sellerId]
    );

    res.json(result.rows);
  })
);

router.post(
  "/reviews/seller/:sellerId",
  auth,
  asyncHandler(async (req, res) => {
    const { rating, comment = "", productId = null } = req.body;
    const normalizedRating = Number(rating);

    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: "La calificacion debe ser de 1 a 5." });
    }

    if (String(req.user.id) === String(req.params.sellerId)) {
      return res.status(400).json({ message: "No puedes reseñar tu propio perfil." });
    }

    const result = await query(
      `insert into seller_reviews (reviewer_id, seller_id, product_id, rating, comment)
       values ($1, $2, $3, $4, $5)
       on conflict (reviewer_id, seller_id, product_id)
       do update set rating = excluded.rating, comment = excluded.comment, updated_at = now()
       returning *`,
      [req.user.id, req.params.sellerId, productId, normalizedRating, comment]
    );

    res.status(201).json({
      message: "Reseña guardada. Gracias por apoyar una compra segura.",
      review: result.rows[0]
    });
  })
);

router.get(
  "/metrics/me",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `select
         (select count(*)::int from products where user_id = $1 and status = 'active') as active_products,
         (select count(*)::int from conversations where buyer_id = $1 or seller_id = $1) as conversations,
         (
           select count(*)::int
           from product_favorites pf
           join products p on p.id = pf.product_id
           where p.user_id = $1
         ) as favorite_count,
         (select count(*)::int from seller_reviews where seller_id = $1) as review_count,
         round(coalesce((select avg(rating)::numeric from seller_reviews where seller_id = $1), 0), 1) as average_rating,
         (select count(*)::int from product_reports pr join products p on p.id = pr.product_id where p.user_id = $1 and pr.status <> 'dismissed') as pending_reports
       `,
      [req.user.id]
    );

    res.json(result.rows[0]);
  })
);

module.exports = router;
