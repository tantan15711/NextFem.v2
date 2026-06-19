const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const VERSION = "aes-256-gcm:v1";

const getKey = () => {
  const secret = process.env.MESSAGE_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Falta MESSAGE_SECRET o JWT_SECRET para cifrar mensajes.");
  }

  return crypto.createHash("sha256").update(secret).digest();
};

const encryptMessage = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final()
  ]);

  return {
    encryptedBody: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    version: VERSION
  };
};

const decryptMessage = (message) => {
  if (!message.encrypted_body || !message.body_iv || !message.body_auth_tag) {
    return message.body;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(message.body_iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(message.body_auth_tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(message.encrypted_body, "base64")),
    decipher.final()
  ]).toString("utf8");
};

const serializeMessage = (message) => {
  const deletedForEveryone = Boolean(message.deleted_for_everyone_at);

  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    body: deletedForEveryone ? "Mensaje eliminado para todos" : decryptMessage(message),
    message_type: message.message_type || "text",
    media_url: deletedForEveryone ? null : message.media_url,
    media_mime: deletedForEveryone ? null : message.media_mime,
    media_name: deletedForEveryone ? null : message.media_name,
    location_lat: deletedForEveryone ? null : message.location_lat,
    location_lng: deletedForEveryone ? null : message.location_lng,
    location_label: deletedForEveryone ? null : message.location_label,
    location_live: deletedForEveryone ? false : message.location_live,
    location_expires_at: deletedForEveryone ? null : message.location_expires_at,
    deleted_for_everyone_at: message.deleted_for_everyone_at,
    deleted_for_everyone_by: message.deleted_for_everyone_by,
    is_deleted_for_everyone: deletedForEveryone,
    read_at: message.read_at,
    created_at: message.created_at,
    sender_name: message.sender_name
  };
};

module.exports = {
  encryptMessage,
  decryptMessage,
  serializeMessage
};
