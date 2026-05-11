const express = require("express");

const { query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");
const auth = require("../middlewares/auth");

const router = express.Router();

const conversationDetailsSql = `
  select
    c.id,
    c.product_id,
    c.buyer_id,
    c.seller_id,
    c.created_at,
    c.updated_at,
    p.title as product_title,
    p.image_url as product_image_url,
    buyer.name as buyer_name,
    seller.name as seller_name,
    case
      when c.buyer_id = $1 then seller.name
      else buyer.name
    end as other_user_name,
    (
      select m.body
      from messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) as last_message,
    (
      select m.sender_id
      from messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) as last_message_sender_id,
    (
      select count(*)::int
      from messages m
      where m.conversation_id = c.id
        and m.sender_id <> $1
        and m.read_at is null
    ) as unread_count
  from conversations c
  join products p on p.id = c.product_id
  join users buyer on buyer.id = c.buyer_id
  join users seller on seller.id = c.seller_id
`;

const ensureParticipant = async (conversationId, userId) => {
  const result = await query(
    `select id from conversations
     where id = $1 and (buyer_id = $2 or seller_id = $2)`,
    [conversationId, userId]
  );

  return result.rows.length > 0;
};

router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `${conversationDetailsSql}
       where c.buyer_id = $1 or c.seller_id = $1
       order by c.updated_at desc`,
      [req.user.id]
    );

    res.json(result.rows);
  })
);

router.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { productId, initialMessage } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "El producto es obligatorio." });
    }

    const productResult = await query(
      "select id, user_id from products where id = $1 and status = 'active'",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "Publicacion no encontrada." });
    }

    const product = productResult.rows[0];

    if (String(product.user_id) === String(req.user.id)) {
      return res.status(400).json({
        message: "Esta publicacion es tuya. No necesitas abrir un chat contigo misma."
      });
    }

    const conversationResult = await query(
      `insert into conversations (product_id, buyer_id, seller_id)
       values ($1, $2, $3)
       on conflict (product_id, buyer_id, seller_id)
       do update set updated_at = conversations.updated_at
       returning *`,
      [product.id, req.user.id, product.user_id]
    );

    const conversation = conversationResult.rows[0];

    if (initialMessage && initialMessage.trim()) {
      await query(
        `insert into messages (conversation_id, sender_id, body)
         values ($1, $2, $3)`,
        [conversation.id, req.user.id, initialMessage.trim()]
      );

      await query("update conversations set updated_at = now() where id = $1", [
        conversation.id
      ]);
    }

    const details = await query(
      `${conversationDetailsSql}
       where c.id = $2`,
      [req.user.id, conversation.id]
    );

    res.status(201).json({
      message: "Conversacion lista.",
      conversation: details.rows[0]
    });
  })
);

router.get(
  "/:id/messages",
  auth,
  asyncHandler(async (req, res) => {
    const canRead = await ensureParticipant(req.params.id, req.user.id);

    if (!canRead) {
      return res.status(404).json({
        message: "Conversacion no encontrada o sin permiso."
      });
    }

    await query(
      `update messages
       set read_at = now()
       where conversation_id = $1
         and sender_id <> $2
         and read_at is null`,
      [req.params.id, req.user.id]
    );

    const result = await query(
      `select
         m.id,
         m.conversation_id,
         m.sender_id,
         m.body,
         m.read_at,
         m.created_at,
         u.name as sender_name
       from messages m
       join users u on u.id = m.sender_id
       where m.conversation_id = $1
       order by m.created_at asc`,
      [req.params.id]
    );

    res.json(result.rows);
  })
);

router.post(
  "/:id/messages",
  auth,
  asyncHandler(async (req, res) => {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ message: "El mensaje no puede estar vacio." });
    }

    const canWrite = await ensureParticipant(req.params.id, req.user.id);

    if (!canWrite) {
      return res.status(404).json({
        message: "Conversacion no encontrada o sin permiso."
      });
    }

    const result = await query(
      `insert into messages (conversation_id, sender_id, body)
       values ($1, $2, $3)
       returning *`,
      [req.params.id, req.user.id, body.trim()]
    );

    await query("update conversations set updated_at = now() where id = $1", [
      req.params.id
    ]);

    res.status(201).json({
      message: "Mensaje enviado.",
      messageData: result.rows[0]
    });
  })
);

module.exports = router;
