const express = require("express");

const { query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");
const auth = require("../middlewares/auth");
const { createJsonResponse } = require("../utils/openaiProvider");

const router = express.Router();

const categoryRules = [
  { name: "Ropa", words: ["ropa", "vestido", "blusa", "camisa", "falda", "pantalon", "playera", "costura", "moda", "outfit"] },
  { name: "Comida", words: ["comida", "pastel", "pan", "galleta", "brownie", "cafe", "salsa", "tamal", "granola", "postre"] },
  { name: "Artesanias", words: ["artesania", "tejido", "macrame", "pulsera", "arete", "vela", "maceta", "bordado", "pintado"] },
  { name: "Belleza", words: ["belleza", "maquillaje", "facial", "jabon", "spa", "crema", "peinado", "cejas", "unas"] },
  { name: "Servicios", words: ["servicio", "asesoria", "diseno", "catalogo", "logo", "fotografia", "organizacion", "decoracion"] },
  { name: "Educacion", words: ["curso", "clase", "taller", "mentoria", "guia", "aprendizaje", "capacitacion"] },
  { name: "Apoyo comunitario", words: ["apoyo", "comunitario", "red", "intercambio", "grupo", "bazar", "mesa", "donacion"] }
];

const priceSuggestions = {
  Ropa: 220,
  Comida: 150,
  Artesanias: 120,
  Belleza: 160,
  Servicios: 250,
  Educacion: 0,
  "Apoyo comunitario": 0
};

const safetyWords = [
  "deposito por adelantado",
  "transferencia urgente",
  "password",
  "contrasena",
  "codigo de verificacion",
  "tarjeta",
  "amenaza",
  "insulto",
  "estafa",
  "fuera de la app",
  "mandame codigo",
  "datos bancarios"
];

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const unique = (items = []) =>
  [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const loadCategories = async () => {
  const result = await query("select id, name, slug from categories order by name");
  return result.rows;
};

const findCategoryByName = (categories, name) => {
  const normalized = normalize(name);
  return categories.find((category) => normalize(category.name) === normalized);
};

const findCategoryById = (categories, id) =>
  categories.find((category) => String(category.id) === String(id));

const guessCategoryName = (text) => {
  const normalized = normalize(text);
  const found = categoryRules.find((rule) =>
    rule.words.some((word) => normalized.includes(normalize(word)))
  );

  return found?.name || "Servicios";
};

const categoryListText = (categories) =>
  categories.map((category) => `${category.name} (${category.slug})`).join(", ");

const stringArraySchema = {
  type: "array",
  items: { type: "string" }
};

const productCopySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "suggestedTitle",
    "description",
    "categoryName",
    "suggestedPrice",
    "hashtags",
    "keywords",
    "sellingTips",
    "missingInfo"
  ],
  properties: {
    suggestedTitle: { type: "string" },
    description: { type: "string" },
    categoryName: { type: "string" },
    suggestedPrice: { type: "number" },
    hashtags: stringArraySchema,
    keywords: stringArraySchema,
    sellingTips: stringArraySchema,
    missingInfo: stringArraySchema
  }
};

const quickRepliesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["replies", "detectedIntent", "tone", "safetyReminder"],
  properties: {
    replies: stringArraySchema,
    detectedIntent: { type: "string" },
    tone: { type: "string" },
    safetyReminder: { type: "string" }
  }
};

const safetySchema = {
  type: "object",
  additionalProperties: false,
  required: ["riskLevel", "flags", "advice", "suggestedResponse"],
  properties: {
    riskLevel: { type: "string", enum: ["bajo", "medio", "alto"] },
    flags: stringArraySchema,
    advice: { type: "string" },
    suggestedResponse: { type: "string" }
  }
};

const smartSearchSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "search",
    "city",
    "categoryName",
    "minPrice",
    "maxPrice",
    "freeOnly",
    "sort",
    "intent",
    "suggestion"
  ],
  properties: {
    search: { type: "string" },
    city: { type: "string" },
    categoryName: { type: "string" },
    minPrice: { type: "string" },
    maxPrice: { type: "string" },
    freeOnly: { type: "boolean" },
    sort: {
      type: "string",
      enum: ["searched", "recent", "popular", "price_asc", "price_desc"]
    },
    intent: { type: "string" },
    suggestion: { type: "string" }
  }
};

const conversationSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "pendingQuestions", "suggestedNextStep", "tone", "quickReply"],
  properties: {
    summary: { type: "string" },
    pendingQuestions: stringArraySchema,
    suggestedNextStep: { type: "string" },
    tone: { type: "string" },
    quickReply: { type: "string" }
  }
};

const runStructuredAi = async ({ name, schema, instructions, input, fallback }) => {
  try {
    const payload = await createJsonResponse({ name, schema, instructions, input });

    if (payload) {
      return { payload, aiMode: "openai" };
    }
  } catch (error) {
    console.warn(`[assistant] ${name} usando fallback local: ${error.message}`);
    return { payload: fallback, aiMode: "local-fallback" };
  }

  return { payload: fallback, aiMode: "local" };
};

const buildLocalProductCopy = ({ title, categoryId, city, price, categories }) => {
  const selectedCategory = findCategoryById(categories, categoryId);
  const categoryName = selectedCategory?.name || guessCategoryName(title);
  const cleanTitle = String(title || "").trim() || "Producto especial";
  const hasPrice = String(price ?? "").trim() !== "";
  const suggestedPrice = hasPrice
    ? safeNumber(price, priceSuggestions[categoryName] || 150)
    : priceSuggestions[categoryName] || 150;
  const location = city ? ` en ${city}` : "";
  const hashtags = unique([
    "#NextFem",
    "#Emprendedoras",
    "#CompraLocal",
    `#${categoryName.replace(/\s+/g, "")}`
  ]);
  const missingInfo = [];

  if (!title) missingInfo.push("Agrega un titulo concreto con tipo, color o material.");
  if (!city) missingInfo.push("Incluye ciudad o zona de entrega.");
  if (!hasPrice && suggestedPrice > 0) missingInfo.push("Confirma si el precio sugerido te funciona.");

  return {
    suggestedTitle: cleanTitle,
    description:
      `${cleanTitle} pensado para clientas que buscan una opcion cuidada, accesible y hecha con atencion al detalle${location}. ` +
      "Ideal para regalar, usar en el dia a dia o apoyar compras locales entre mujeres emprendedoras.",
    categoryName,
    suggestedPrice,
    hashtags,
    keywords: unique([categoryName, cleanTitle, city, "emprendimiento local"]).slice(0, 6),
    sellingTips: [
      "Sube una foto clara con buena luz.",
      "Menciona medidas, materiales, sabores o tiempos de entrega.",
      "Responde por chat dentro de NextFem para cuidar la conversacion."
    ],
    missingInfo
  };
};

const buildLocalQuickReplies = ({ productTitle, incomingMessage }) => {
  const normalized = normalize(incomingMessage);
  const replies = [];
  let detectedIntent = "consulta general";

  if (normalized.includes("precio") || normalized.includes("cuanto")) {
    detectedIntent = "precio";
    replies.push(`Hola, claro. El precio de "${productTitle}" es el publicado. Si quieres, te comparto detalles de entrega.`);
  }

  if (normalized.includes("entrega") || normalized.includes("envio")) {
    detectedIntent = "entrega";
    replies.push("Puedo coordinar entrega en un punto seguro o revisar una opcion cercana para ambas.");
  }

  if (normalized.includes("disponible")) {
    detectedIntent = "disponibilidad";
    replies.push("Si, todavia esta disponible. Con gusto te cuento medidas, colores o tiempos de entrega.");
  }

  replies.push(
    `Gracias por escribir. Te comparto mas informacion de "${productTitle}" con mucho gusto.`,
    "Podemos coordinar por aqui para mantener la conversacion segura dentro de NextFem."
  );

  return {
    replies: unique(replies).slice(0, 4),
    detectedIntent,
    tone: "amable y claro",
    safetyReminder: "Evita compartir codigos, contrasenas o datos bancarios por chat."
  };
};

const buildLocalSafetyCheck = (text) => {
  const normalized = normalize(text);
  const flags = safetyWords.filter((word) => normalized.includes(normalize(word)));
  const riskLevel = flags.length >= 2 ? "alto" : flags.length === 1 ? "medio" : "bajo";

  return {
    riskLevel,
    flags,
    advice:
      riskLevel === "bajo"
        ? "Mensaje sin senales fuertes de riesgo."
        : "Evita compartir codigos, contrasenas, datos bancarios o aceptar presion para pagar fuera de un acuerdo claro.",
    suggestedResponse:
      riskLevel === "bajo"
        ? "Responder con normalidad y mantener la conversacion dentro de NextFem."
        : "Puedes pedir continuar por NextFem y no compartir informacion sensible."
  };
};

const buildLocalSmartSearch = ({ queryText, city, categories }) => {
  const normalized = normalize(`${queryText} ${city}`);
  const guessedName = guessCategoryName(queryText);
  const category =
    categories.find((item) => normalized.includes(normalize(item.name))) ||
    findCategoryByName(categories, guessedName);
  const prices = [...normalized.matchAll(/\$?\s*(\d{2,5})/g)].map((match) => Number(match[1]));
  const freeOnly = /(gratis|gratuito|sin costo|apoyo gratuito|donacion)/.test(normalized);
  const sort = /(barato|economico|menor precio)/.test(normalized)
    ? "price_asc"
    : /(caro|premium|mayor precio)/.test(normalized)
      ? "price_desc"
      : /(popular|guardado|favorito)/.test(normalized)
        ? "popular"
        : /(nuevo|reciente|ultimos)/.test(normalized)
          ? "recent"
          : "searched";

  let minPrice = "";
  let maxPrice = "";

  if (prices.length >= 2) {
    minPrice = String(Math.min(prices[0], prices[1]));
    maxPrice = String(Math.max(prices[0], prices[1]));
  } else if (prices.length === 1) {
    maxPrice = /(menos|maximo|hasta)/.test(normalized) ? String(prices[0]) : "";
    minPrice = /(mas de|minimo|desde)/.test(normalized) ? String(prices[0]) : "";
  }

  return {
    search: String(queryText || "").trim(),
    city: String(city || "").trim(),
    categoryName: category?.name || "",
    minPrice,
    maxPrice,
    freeOnly,
    sort,
    intent: category?.name ? `buscar en ${category.name}` : "buscar en todo el marketplace",
    suggestion: category?.name
      ? `Ajuste la busqueda hacia ${category.name} y mantuve tus filtros utiles.`
      : "Use tus palabras para ordenar los resultados mas buscados."
  };
};

const buildLocalConversationSummary = ({ messages }) => {
  const visibleMessages = messages.filter((message) => message.body).slice(-12);
  const lastIncoming = [...visibleMessages].reverse().find((message) => message.sender !== "yo");
  const pendingQuestions = visibleMessages
    .filter((message) => message.body.includes("?") && message.sender !== "yo")
    .map((message) => message.body)
    .slice(-3);

  return {
    summary:
      visibleMessages.length === 0
        ? "Aun no hay suficientes mensajes para resumir la conversacion."
        : `La conversacion tiene ${visibleMessages.length} mensajes recientes sobre disponibilidad, detalles o entrega.`,
    pendingQuestions,
    suggestedNextStep: pendingQuestions.length
      ? "Responde primero las preguntas pendientes y propone una forma segura de entrega."
      : "Propone el siguiente paso: confirmar disponibilidad, entrega o detalles del producto.",
    tone: "cordial",
    quickReply: lastIncoming
      ? `Gracias por tu mensaje. Te confirmo los detalles y seguimos por aqui para coordinarnos con seguridad.`
      : "Hola, con gusto seguimos por aqui para coordinar los detalles."
  };
};

router.post(
  "/product-copy",
  auth,
  asyncHandler(async (req, res) => {
    const { title = "", categoryId = "", city = "", price = "" } = req.body;
    const categories = await loadCategories();
    const fallback = buildLocalProductCopy({ title, categoryId, city, price, categories });
    const { payload, aiMode } = await runStructuredAi({
      name: "nextfem_product_copy",
      schema: productCopySchema,
      fallback,
      instructions:
        "Eres Impulso IA de NextFem, un marketplace gratuito para mujeres emprendedoras. " +
        "Crea textos honestos, utiles y breves para publicar productos o servicios. " +
        "No prometas pagos dentro de la plataforma. Usa solo una categoria de la lista disponible.",
      input: JSON.stringify({
        title,
        categoryId,
        city,
        price,
        availableCategories: categoryListText(categories)
      })
    });
    const category =
      findCategoryByName(categories, payload.categoryName) ||
      findCategoryByName(categories, fallback.categoryName) ||
      findCategoryById(categories, categoryId);

    res.json({
      suggestedTitle: payload.suggestedTitle || fallback.suggestedTitle,
      description: payload.description || fallback.description,
      categoryId: category?.id || null,
      categoryName: category?.name || payload.categoryName || fallback.categoryName,
      suggestedPrice: safeNumber(payload.suggestedPrice, fallback.suggestedPrice),
      hashtags: unique(payload.hashtags || fallback.hashtags).slice(0, 6),
      keywords: unique(payload.keywords || fallback.keywords).slice(0, 8),
      sellingTips: unique(payload.sellingTips || fallback.sellingTips).slice(0, 5),
      missingInfo: unique(payload.missingInfo || fallback.missingInfo).slice(0, 5),
      aiMode
    });
  })
);

router.post(
  "/quick-replies",
  auth,
  asyncHandler(async (req, res) => {
    const { productTitle = "tu publicacion", incomingMessage = "" } = req.body;
    const fallback = buildLocalQuickReplies({ productTitle, incomingMessage });
    const { payload, aiMode } = await runStructuredAi({
      name: "nextfem_quick_replies",
      schema: quickRepliesSchema,
      fallback,
      instructions:
        "Eres una asistente de ventas para mujeres emprendedoras en NextFem. " +
        "Sugiere respuestas cortas, amables y listas para enviar. Evita presionar compras.",
      input: JSON.stringify({ productTitle, incomingMessage })
    });

    res.json({
      replies: unique(payload.replies || fallback.replies).slice(0, 4),
      detectedIntent: payload.detectedIntent || fallback.detectedIntent,
      tone: payload.tone || fallback.tone,
      safetyReminder: payload.safetyReminder || fallback.safetyReminder,
      aiMode
    });
  })
);

router.post(
  "/safety-check",
  auth,
  asyncHandler(async (req, res) => {
    const { text = "" } = req.body;
    const fallback = buildLocalSafetyCheck(text);
    const { payload, aiMode } = await runStructuredAi({
      name: "nextfem_safety_check",
      schema: safetySchema,
      fallback,
      instructions:
        "Analiza mensajes de marketplace entre usuarias. Clasifica riesgo bajo, medio o alto. " +
        "Busca estafas, presion, datos sensibles, insultos o intentos de sacar la conversacion de un entorno seguro.",
      input: JSON.stringify({ text })
    });

    res.json({
      riskLevel: ["bajo", "medio", "alto"].includes(payload.riskLevel)
        ? payload.riskLevel
        : fallback.riskLevel,
      flags: unique(payload.flags || fallback.flags).slice(0, 8),
      advice: payload.advice || fallback.advice,
      suggestedResponse: payload.suggestedResponse || fallback.suggestedResponse,
      aiMode
    });
  })
);

router.post(
  "/smart-search",
  asyncHandler(async (req, res) => {
    const { queryText = "", city = "" } = req.body;
    const categories = await loadCategories();
    const fallback = buildLocalSmartSearch({ queryText, city, categories });
    const { payload, aiMode } = await runStructuredAi({
      name: "nextfem_smart_search",
      schema: smartSearchSchema,
      fallback,
      instructions:
        "Convierte una busqueda natural de marketplace en filtros seguros para NextFem. " +
        "Usa categoria exacta de la lista si aplica. Devuelve strings vacios cuando no haya precio o ciudad clara.",
      input: JSON.stringify({
        queryText,
        city,
        availableCategories: categoryListText(categories)
      })
    });
    const category = findCategoryByName(categories, payload.categoryName);

    res.json({
      search: payload.search || fallback.search,
      city: payload.city || fallback.city,
      categoryName: category?.name || "",
      categorySlug: category?.slug || "",
      minPrice: payload.minPrice || fallback.minPrice,
      maxPrice: payload.maxPrice || fallback.maxPrice,
      freeOnly: Boolean(payload.freeOnly),
      sort: ["searched", "recent", "popular", "price_asc", "price_desc"].includes(payload.sort)
        ? payload.sort
        : fallback.sort,
      intent: payload.intent || fallback.intent,
      suggestion: payload.suggestion || fallback.suggestion,
      aiMode
    });
  })
);

router.post(
  "/conversation-summary",
  auth,
  asyncHandler(async (req, res) => {
    const { productTitle = "la publicacion", messages = [] } = req.body;
    const normalizedMessages = Array.isArray(messages)
      ? messages
          .slice(-24)
          .map((message) => ({
            sender: String(message.sender || "usuaria").slice(0, 60),
            body: String(message.body || "").slice(0, 800),
            type: String(message.type || "text").slice(0, 30)
          }))
      : [];
    const fallback = buildLocalConversationSummary({ productTitle, messages: normalizedMessages });
    const { payload, aiMode } = await runStructuredAi({
      name: "nextfem_conversation_summary",
      schema: conversationSummarySchema,
      fallback,
      instructions:
        "Resume conversaciones de compradora y vendedora en NextFem. " +
        "Ayuda a continuar con claridad, calidez y seguridad. No inventes acuerdos ni datos no escritos.",
      input: JSON.stringify({
        productTitle,
        messages: normalizedMessages
      })
    });

    res.json({
      summary: payload.summary || fallback.summary,
      pendingQuestions: unique(payload.pendingQuestions || fallback.pendingQuestions).slice(0, 4),
      suggestedNextStep: payload.suggestedNextStep || fallback.suggestedNextStep,
      tone: payload.tone || fallback.tone,
      quickReply: payload.quickReply || fallback.quickReply,
      aiMode
    });
  })
);

module.exports = router;
