const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { query } = require("../config/db");

let io;

const getAllowedOrigins = () => {
  const configured = process.env.FRONTEND_URL || "http://localhost:5173";
  return configured.split(",").map((origin) => origin.trim());
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        const allowedOrigins = getAllowedOrigins();
        const localFrontend = origin && /^http:\/\/localhost:\d+$/.test(origin);

        if (!origin || allowedOrigins.includes(origin) || localFrontend) {
          return callback(null, true);
        }

        return callback(new Error("Origen no permitido por Socket.IO."));
      }
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Token requerido."));
    }

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (error) {
      return next(new Error("Token invalido."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("conversation:join", async (conversationId) => {
      try {
        const result = await query(
          `select 1
           from conversations
           where id = $1 and (buyer_id = $2 or seller_id = $2)`,
          [conversationId, socket.user.id]
        );

        if (result.rowCount > 0) {
          socket.join(`conversation:${conversationId}`);
          return;
        }

        socket.emit("conversation:error", {
          message: "No tienes acceso a esta conversacion."
        });
      } catch (error) {
        socket.emit("conversation:error", {
          message: "No se pudo abrir esta conversacion."
        });
      }
    });

    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("conversation:typing", async ({ conversationId, isTyping }) => {
      try {
        const result = await query(
          `select 1
           from conversations
           where id = $1 and (buyer_id = $2 or seller_id = $2)`,
          [conversationId, socket.user.id]
        );

        if (result.rowCount === 0) return;

        socket.to(`conversation:${conversationId}`).emit("conversation:typing", {
          conversationId,
          userId: socket.user.id,
          userName: socket.user.name,
          isTyping: Boolean(isTyping)
        });
      } catch (error) {
        // Typing indicators are optional and should never interrupt the chat.
      }
    });
  });

  return io;
};

const emitToUsers = (userIds, event, payload) => {
  if (!io) return;

  userIds.forEach((userId) => {
    io.to(`user:${userId}`).emit(event, payload);
  });
};

const emitToConversation = (conversationId, event, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
};

module.exports = {
  initSocket,
  emitToUsers,
  emitToConversation
};
