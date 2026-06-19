const express = require("express");

const { query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");
const auth = require("../middlewares/auth");
const {
  decryptMessage,
  encryptMessage,
  serializeMessage
} = require("../utils/messageCrypto");
const {
  emitToConversation,
  emitToUsers
} = require("../realtime/socket");

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
    case
      when c.buyer_id = $1 then seller.id
      else buyer.id
    end as other_user_id,
    latest.body as last_message,
    latest.encrypted_body as last_message_encrypted_body,
    latest.body_iv as last_message_body_iv,
    latest.body_auth_tag as last_message_body_auth_tag,
    latest.sender_id as last_message_sender_id,
    latest.message_type as last_message_type,
    latest.deleted_for_everyone_at as last_message_deleted_for_everyone_at,
    latest.created_at as last_message_created_at,
    (
      select count(*)::int
      from messages m
      left join message_deletions md on md.message_id = m.id and md.user_id = $1
      where m.conversation_id = c.id
        and md.message_id is null
        and m.sender_id <> $1
        and m.read_at is null
        and m.deleted_for_everyone_at is null
    ) as unread_count
  from conversations c
  join products p on p.id = c.product_id
  join users buyer on buyer.id = c.buyer_id
  join users seller on seller.id = c.seller_id
  left join lateral (
    select
      m.body,
      m.encrypted_body,
      m.body_iv,
      m.body_auth_tag,
      m.sender_id,
      m.message_type,
      m.deleted_for_everyone_at,
      m.created_at
    from messages m
    left join message_deletions md on md.message_id = m.id and md.user_id = $1
    where m.conversation_id = c.id
      and md.message_id is null
    order by m.created_at desc
    limit 1
  ) latest on true
`;

const formatConversation = (conversation) => {
  const lastMessageType = conversation.last_message_type || "text";
  const fallbackMessage =
    lastMessageType === "image"
      ? "Imagen"
      : lastMessageType === "video"
        ? "Video"
        : lastMessageType === "audio"
          ? "Audio"
          : lastMessageType === "location"
            ? "Ubicacion compartida"
            : lastMessageType === "file"
              ? "Archivo"
              : null;
  const formatted = {
    ...conversation,
    last_message: conversation.last_message_deleted_for_everyone_at
      ? "Mensaje eliminado"
      : conversation.last_message
      ? decryptMessage({
          body: conversation.last_message,
          encrypted_body: conversation.last_message_encrypted_body,
          body_iv: conversation.last_message_body_iv,
          body_auth_tag: conversation.last_message_body_auth_tag
        })
      : fallbackMessage
  };

  delete formatted.last_message_encrypted_body;
  delete formatted.last_message_body_iv;
  delete formatted.last_message_body_auth_tag;
  delete formatted.last_message_deleted_for_everyone_at;

  return formatted;
};

const getConversationDetails = async (userId, conversationId) => {
  const result = await query(
    `${conversationDetailsSql}
     where c.id = $2
       and (c.buyer_id = $1 or c.seller_id = $1)`,
    [userId, conversationId]
  );

  return result.rows[0] ? formatConversation(result.rows[0]) : null;
};

const getParticipantIds = async (conversationId) => {
  const result = await query(
    "select buyer_id, seller_id from conversations where id = $1",
    [conversationId]
  );

  if (result.rows.length === 0) {
    return [];
  }

  return [result.rows[0].buyer_id, result.rows[0].seller_id];
};

const ensureParticipant = async (conversationId, userId) => {
  const result = await query(
    `select id from conversations
     where id = $1 and (buyer_id = $2 or seller_id = $2)`,
    [conversationId, userId]
  );

  return result.rows.length > 0;
};

const isBlockedBetween = async (firstUserId, secondUserId) => {
  const result = await query(
    `select 1
     from user_blocks
     where (blocker_id = $1 and blocked_id = $2)
        or (blocker_id = $2 and blocked_id = $1)
     limit 1`,
    [firstUserId, secondUserId]
  );

  return result.rows.length > 0;
};

const getConversationParticipants = async (conversationId) => {
  const result = await query(
    "select buyer_id, seller_id from conversations where id = $1",
    [conversationId]
  );

  return result.rows[0] || null;
};

const messagePreview = (message) => {
  if (message.deleted_for_everyone_at) return "Mensaje eliminado";
  if (message.message_type === "image") return "Imagen";
  if (message.message_type === "video") return "Video";
  if (message.message_type === "audio") return "Audio";
  if (message.message_type === "location") return "Ubicacion compartida";
  if (message.message_type === "file") return message.media_name || "Archivo";
  return message.body || "Nuevo mensaje";
};

const createMessageNotifications = async (conversationId, messageData, senderId) => {
  const recipientIds = (await getParticipantIds(conversationId)).filter(
    (userId) => String(userId) !== String(senderId)
  );

  if (recipientIds.length === 0) return [];

  const notifications = [];

  for (const recipientId of recipientIds) {
    const result = await query(
      `insert into notifications
         (user_id, actor_id, conversation_id, message_id, type, title, body)
       values ($1, $2, $3, $4, 'message', $5, $6)
       returning id, user_id, actor_id, conversation_id, message_id, type, title, body, is_read, created_at`,
      [
        recipientId,
        senderId,
        conversationId,
        messageData.id,
        `Nuevo mensaje de ${messageData.sender_name || "NextFem"}`,
        messagePreview(messageData)
      ]
    );

    notifications.push(result.rows[0]);
  }

  emitToUsers(recipientIds, "notification:new", {
    notifications
  });

  return notifications;
};

const buildFallbackBody = (messageType) => {
  if (messageType === "image") return "Imagen";
  if (messageType === "video") return "Video";
  if (messageType === "audio") return "Audio";
  if (messageType === "location") return "Ubicacion compartida";
  if (messageType === "file") return "Archivo";
  return "";
};

const insertEncryptedMessage = async (conversationId, senderId, payload) => {
  const {
    body = "",
    mediaUrl = null,
    mediaMime = null,
    mediaName = null,
    messageType = "text",
    locationLat = null,
    locationLng = null,
    locationLabel = null,
    locationLive = false,
    locationExpiresAt = null
  } = typeof payload === "string" ? { body: payload } : payload;
  const cleanBody = (body || "").trim() || buildFallbackBody(messageType);
  const encrypted = encryptMessage(cleanBody);

  const result = await query(
    `insert into messages
       (
         conversation_id,
         sender_id,
         body,
         encrypted_body,
         body_iv,
         body_auth_tag,
         body_version,
         message_type,
         media_url,
         media_mime,
         media_name,
         location_lat,
         location_lng,
         location_label,
         location_live,
         location_expires_at
       )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     returning
       id,
       conversation_id,
       sender_id,
       body,
       encrypted_body,
       body_iv,
       body_auth_tag,
       body_version,
       message_type,
       media_url,
       media_mime,
       media_name,
       location_lat,
       location_lng,
       location_label,
       location_live,
       location_expires_at,
       deleted_for_everyone_at,
       deleted_for_everyone_by,
       read_at,
       created_at`,
    [
      conversationId,
      senderId,
      "[mensaje cifrado]",
      encrypted.encryptedBody,
      encrypted.iv,
      encrypted.authTag,
      encrypted.version,
      messageType,
      mediaUrl,
      mediaMime,
      mediaName,
      locationLat,
      locationLng,
      locationLabel,
      Boolean(locationLive),
      locationExpiresAt
    ]
  );

  const message = result.rows[0];
  const user = await query("select name from users where id = $1", [senderId]);

  return serializeMessage({
    ...message,
    sender_name: user.rows[0]?.name || "Usuaria"
  });
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

    res.json(result.rows.map(formatConversation));
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

    if (await isBlockedBetween(req.user.id, product.user_id)) {
      return res.status(403).json({
        message: "No puedes abrir este chat porque existe un bloqueo de seguridad."
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
    let messageData = null;

    if (initialMessage && initialMessage.trim()) {
      messageData = await insertEncryptedMessage(
        conversation.id,
        req.user.id,
        initialMessage
      );

      await query("update conversations set updated_at = now() where id = $1", [
        conversation.id
      ]);
    }

    const details = await getConversationDetails(req.user.id, conversation.id);
    const participantIds = await getParticipantIds(conversation.id);

    emitToUsers(participantIds, "conversation:update", { conversationId: conversation.id });

    if (messageData) {
      await createMessageNotifications(conversation.id, messageData, req.user.id);
      emitToConversation(conversation.id, "message:new", {
        conversationId: conversation.id,
        message: messageData
      });
      emitToUsers(participantIds, "message:notify", { conversationId: conversation.id });
    }

    res.status(201).json({
      message: "Conversacion lista.",
      conversation: details
    });
  })
);

router.get(
  "/notifications",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `select id, user_id, actor_id, conversation_id, message_id, type, title, body, is_read, created_at
       from notifications
       where user_id = $1
       order by created_at desc
       limit 30`,
      [req.user.id]
    );

    res.json(result.rows);
  })
);

router.patch(
  "/notifications/read-all",
  auth,
  asyncHandler(async (req, res) => {
    await query("update notifications set is_read = true where user_id = $1", [
      req.user.id
    ]);

    res.json({ message: "Notificaciones marcadas como leidas." });
  })
);

router.patch(
  "/notifications/:id/read",
  auth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `update notifications
       set is_read = true
       where id = $1 and user_id = $2
       returning id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notificacion no encontrada." });
    }

    res.json({ message: "Notificacion leida." });
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

    const readResult = await query(
      `update messages
       set read_at = now()
       where id in (
         select m.id
         from messages m
         left join message_deletions md on md.message_id = m.id and md.user_id = $2
         where m.conversation_id = $1
           and md.message_id is null
           and m.deleted_for_everyone_at is null
       )
         and sender_id <> $2
         and read_at is null
       returning id`,
      [req.params.id, req.user.id]
    );

    const result = await query(
      `select
         m.id,
         m.conversation_id,
         m.sender_id,
         m.body,
         m.encrypted_body,
         m.body_iv,
         m.body_auth_tag,
         m.body_version,
         m.message_type,
         m.media_url,
         m.media_mime,
         m.media_name,
         m.location_lat,
         m.location_lng,
         m.location_label,
         m.location_live,
         m.location_expires_at,
         m.deleted_for_everyone_at,
         m.deleted_for_everyone_by,
         m.read_at,
         m.created_at,
         u.name as sender_name
       from messages m
       join users u on u.id = m.sender_id
       left join message_deletions md on md.message_id = m.id and md.user_id = $2
       where m.conversation_id = $1
         and md.message_id is null
       order by m.created_at asc`,
      [req.params.id, req.user.id]
    );

    if (readResult.rows.length > 0) {
      const participantIds = await getParticipantIds(req.params.id);

      emitToConversation(req.params.id, "message:read", {
        conversationId: req.params.id,
        readMessageIds: readResult.rows.map((message) => message.id)
      });
      emitToUsers(participantIds, "conversation:update", {
        conversationId: req.params.id
      });
    }

    res.json(result.rows.map(serializeMessage));
  })
);

router.post(
  "/:id/messages",
  auth,
  asyncHandler(async (req, res) => {
    const {
      body = "",
      messageType = "text",
      mediaUrl = null,
      mediaMime = null,
      mediaName = null,
      locationLat = null,
      locationLng = null,
      locationLabel = null,
      locationLive = false,
      locationExpiresAt = null
    } = req.body;
    const validTypes = new Set(["text", "image", "video", "audio", "file", "location"]);

    if (!validTypes.has(messageType)) {
      return res.status(400).json({ message: "Tipo de mensaje no valido." });
    }

    if (messageType === "text" && (!body || !body.trim())) {
      return res.status(400).json({ message: "El mensaje no puede estar vacio." });
    }

    if (["image", "video", "audio", "file"].includes(messageType) && !mediaUrl) {
      return res.status(400).json({ message: "Selecciona un archivo para enviar." });
    }

    if (messageType === "location" && (locationLat === null || locationLng === null)) {
      return res.status(400).json({ message: "No se pudo obtener la ubicacion." });
    }

    const canWrite = await ensureParticipant(req.params.id, req.user.id);

    if (!canWrite) {
      return res.status(404).json({
        message: "Conversacion no encontrada o sin permiso."
      });
    }

    const participants = await getConversationParticipants(req.params.id);
    const otherUserId =
      String(participants.buyer_id) === String(req.user.id)
        ? participants.seller_id
        : participants.buyer_id;

    if (await isBlockedBetween(req.user.id, otherUserId)) {
      return res.status(403).json({
        message: "No puedes enviar mensajes porque existe un bloqueo de seguridad."
      });
    }

    const messageData = await insertEncryptedMessage(req.params.id, req.user.id, {
      body,
      messageType,
      mediaUrl,
      mediaMime,
      mediaName,
      locationLat,
      locationLng,
      locationLabel,
      locationLive,
      locationExpiresAt
    });

    await query("update conversations set updated_at = now() where id = $1", [
      req.params.id
    ]);

    const participantIds = await getParticipantIds(req.params.id);

    emitToConversation(req.params.id, "message:new", {
      conversationId: req.params.id,
      message: messageData
    });
    await createMessageNotifications(req.params.id, messageData, req.user.id);
    emitToUsers(participantIds, "conversation:update", {
      conversationId: req.params.id
    });
    emitToUsers(participantIds, "message:notify", {
      conversationId: req.params.id
    });

    res.status(201).json({
      message: "Mensaje enviado.",
      messageData
    });
  })
);

router.delete(
  "/:id/messages/:messageId",
  auth,
  asyncHandler(async (req, res) => {
    const { scope = "me" } = req.body;
    const validScopes = new Set(["me", "everyone"]);

    if (!validScopes.has(scope)) {
      return res.status(400).json({ message: "Tipo de eliminacion no valido." });
    }

    const canEdit = await ensureParticipant(req.params.id, req.user.id);

    if (!canEdit) {
      return res.status(404).json({
        message: "Conversacion no encontrada o sin permiso."
      });
    }

    const messageResult = await query(
      `select id, sender_id, deleted_for_everyone_at
       from messages
       where id = $1 and conversation_id = $2`,
      [req.params.messageId, req.params.id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ message: "Mensaje no encontrado." });
    }

    const message = messageResult.rows[0];

    if (scope === "everyone") {
      if (String(message.sender_id) !== String(req.user.id)) {
        return res.status(403).json({
          message: "Solo puedes borrar para todos los mensajes que enviaste."
        });
      }

      await query(
        `update messages
         set deleted_for_everyone_at = coalesce(deleted_for_everyone_at, now()),
             deleted_for_everyone_by = $1
         where id = $2`,
        [req.user.id, req.params.messageId]
      );

      const participantIds = await getParticipantIds(req.params.id);

      emitToConversation(req.params.id, "message:deleted", {
        conversationId: req.params.id,
        messageId: req.params.messageId,
        scope,
        deletedForEveryoneAt: new Date().toISOString(),
        deletedForEveryoneBy: req.user.id
      });
      emitToUsers(participantIds, "conversation:update", {
        conversationId: req.params.id
      });

      return res.json({ message: "Mensaje eliminado para todos." });
    }

    await query(
      `insert into message_deletions (message_id, user_id)
       values ($1, $2)
       on conflict (message_id, user_id)
       do update set deleted_at = now()`,
      [req.params.messageId, req.user.id]
    );

    emitToUsers([req.user.id], "message:deleted", {
      conversationId: req.params.id,
      messageId: req.params.messageId,
      scope,
      deletedForUserId: req.user.id
    });
    emitToUsers([req.user.id], "conversation:update", {
      conversationId: req.params.id
    });

    res.json({ message: "Mensaje eliminado para ti." });
  })
);

router.post(
  "/:id/messages/:messageId/restore",
  auth,
  asyncHandler(async (req, res) => {
    const { scope = "me" } = req.body;
    const validScopes = new Set(["me", "everyone"]);

    if (!validScopes.has(scope)) {
      return res.status(400).json({ message: "Tipo de restauracion no valido." });
    }

    const canEdit = await ensureParticipant(req.params.id, req.user.id);

    if (!canEdit) {
      return res.status(404).json({
        message: "Conversacion no encontrada o sin permiso."
      });
    }

    if (scope === "everyone") {
      const result = await query(
        `update messages
         set deleted_for_everyone_at = null,
             deleted_for_everyone_by = null
         where id = $1
           and conversation_id = $2
           and sender_id = $3
           and deleted_for_everyone_at > now() - interval '15 seconds'
         returning id`,
        [req.params.messageId, req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(409).json({
          message: "Ya no se puede deshacer esta eliminacion."
        });
      }

      const participantIds = await getParticipantIds(req.params.id);

      emitToConversation(req.params.id, "message:restored", {
        conversationId: req.params.id,
        messageId: req.params.messageId,
        scope
      });
      emitToUsers(participantIds, "conversation:update", {
        conversationId: req.params.id
      });

      return res.json({ message: "Mensaje restaurado." });
    }

    await query(
      "delete from message_deletions where message_id = $1 and user_id = $2",
      [req.params.messageId, req.user.id]
    );

    emitToUsers([req.user.id], "message:restored", {
      conversationId: req.params.id,
      messageId: req.params.messageId,
      scope
    });
    emitToUsers([req.user.id], "conversation:update", {
      conversationId: req.params.id
    });

    res.json({ message: "Mensaje restaurado." });
  })
);

module.exports = router;
