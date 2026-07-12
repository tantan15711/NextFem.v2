import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USER_KEY = "nextfem_supabase_user";

const missingConfig = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const supabase = missingConfig
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

export const API_URL = SUPABASE_URL || "";
export const SOCKET_URL = SUPABASE_URL || "";

const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      "Falta configurar Supabase. Crea frontend/.env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
    );
  }

  return supabase;
};

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message || "No se pudo completar la solicitud.");
  return data;
};

const nowIso = () => new Date().toISOString();

export const storage = {
  getToken() {
    return localStorage.getItem("nextfem_supabase_token");
  },
  setSession(token, user) {
    localStorage.setItem("nextfem_supabase_token", token || "supabase-session");
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser() {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  },
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem("nextfem_supabase_token");
    localStorage.removeItem(USER_KEY);
  }
};

const currentAuthUser = async () => {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
};

const currentUserId = async () => {
  const authUser = await currentAuthUser();
  return authUser?.id || null;
};

const formatProfile = (profile) =>
  profile
    ? {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        business_name: profile.business_name,
        phone: profile.phone,
        city: profile.city,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        role: profile.role,
        sales_count: profile.sales_count || 0,
        completed_all_courses: Boolean(profile.completed_all_courses)
      }
    : null;

const getProfilesMap = async (ids = []) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const rows = unwrap(
    await requireSupabase()
      .from("profiles")
      .select("*")
      .in("id", uniqueIds)
  );

  return new Map(rows.map((row) => [row.id, row]));
};

const getCategoriesMap = async () => {
  const rows = unwrap(
    await requireSupabase()
      .from("categories")
      .select("*")
      .order("name")
  );
  return new Map(rows.map((row) => [String(row.id), row]));
};

const average = (values) => {
  const nums = values.map(Number).filter((value) => !Number.isNaN(value));
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
};

const getSellerRatings = async (sellerIds = []) => {
  const uniqueIds = [...new Set(sellerIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const rows = unwrap(
    await requireSupabase()
      .from("seller_reviews")
      .select("seller_id,rating")
      .in("seller_id", uniqueIds)
  );

  const grouped = new Map();
  rows.forEach((row) => {
    const list = grouped.get(row.seller_id) || [];
    list.push(row.rating);
    grouped.set(row.seller_id, list);
  });

  return new Map(
    [...grouped.entries()].map(([sellerId, ratings]) => [
      sellerId,
      {
        average: Number(average(ratings).toFixed(1)),
        count: ratings.length
      }
    ])
  );
};

const getFavoriteCounts = async (productIds = []) => {
  const ids = [...new Set(productIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();

  const rows = unwrap(
    await requireSupabase()
      .from("favorites")
      .select("product_id")
      .in("product_id", ids)
  );

  return rows.reduce((map, row) => {
    const key = String(row.product_id);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
};

const getProductMedia = async (productIds = []) => {
  const ids = [...new Set(productIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();

  const rows = unwrap(
    await requireSupabase()
      .from("product_media")
      .select("*")
      .in("product_id", ids)
      .order("sort_order", { ascending: true })
  );

  return rows.reduce((map, row) => {
    const key = String(row.product_id);
    const list = map.get(key) || [];
    list.push({
      id: row.id,
      url: row.url,
      media_type: row.media_type,
      mediaType: row.media_type,
      mime_type: row.mime_type,
      mimeType: row.mime_type,
      name: row.name
    });
    map.set(key, list);
    return map;
  }, new Map());
};

const formatProductRows = async (rows = []) => {
  const categories = await getCategoriesMap();
  const sellers = await getProfilesMap(rows.map((row) => row.seller_id));
  const ratings = await getSellerRatings(rows.map((row) => row.seller_id));
  const favoriteCounts = await getFavoriteCounts(rows.map((row) => row.id));
  const mediaByProduct = await getProductMedia(rows.map((row) => row.id));

  return rows.map((row) => {
    const category = categories.get(String(row.category_id));
    const seller = sellers.get(row.seller_id);
    const sellerRating = ratings.get(row.seller_id) || { average: 0, count: 0 };
    const media = mediaByProduct.get(String(row.id)) || [];

    return {
      ...row,
      seller_id: row.seller_id,
      seller_name: seller?.business_name || seller?.name || "Comunidad NextFem",
      seller_business_name: seller?.business_name || "",
      seller_bio: seller?.bio || "",
      seller_city: seller?.city,
      seller_avatar_url: seller?.avatar_url,
      seller_rating: sellerRating.average,
      seller_review_count: sellerRating.count,
      category_name: category?.name || "General",
      category_slug: category?.slug || "",
      favorite_count: favoriteCounts.get(String(row.id)) || 0,
      media,
      image_url: row.image_url || media[0]?.url || ""
    };
  });
};

const makeNotification = async ({ userId, actorId, productId, conversationId, type, title, body }) => {
  if (!userId || userId === actorId) return null;

  const { data, error } = await requireSupabase()
    .from("notifications")
    .insert({
      user_id: userId,
      actor_id: actorId || null,
      product_id: productId || null,
      conversation_id: conversationId || null,
      type,
      title,
      body
    })
    .select()
    .single();

  if (error) {
    console.warn("No se pudo crear la notificacion:", error.message);
    return null;
  }

  return data;
};

const localProductCopy = async ({ title, categoryId, city, price }) => {
  const categories = await api.categories();
  const category = categories.find((item) => String(item.id) === String(categoryId));
  const cleanTitle = title || "Producto de mi emprendimiento";

  return {
    aiMode: "supabase-local",
    suggestedTitle: cleanTitle,
    categoryId: categoryId || categories[0]?.id || "",
    categoryName: category?.name || categories[0]?.name || "General",
    suggestedPrice: Number(price || 120),
    description: `${cleanTitle} elaborado con dedicacion para clientas que buscan calidad, confianza y atencion cercana en ${city || "su ciudad"}.`,
    hashtags: ["#NextFem", "#Emprendedoras", "#CompraLocal"],
    sellingTips: [
      "Incluye medidas, material o porciones.",
      "Agrega fotos con buena luz.",
      "Responde rapido a las dudas del chat."
    ],
    missingInfo: ["Tiempo de entrega", "Disponibilidad", "Forma de contacto"]
  };
};

const buildBadges = ({ activeProducts, soldProducts, averageRating, reviewCount, completedAllCourses }) => [
  {
    key: "new_seller",
    label: "Nueva emprendedora",
    earned: activeProducts >= 1,
    description: "Primer producto publicado."
  },
  {
    key: "ten_sales",
    label: "10 ventas realizadas",
    earned: soldProducts >= 10,
    description: "Registro de diez productos vendidos."
  },
  {
    key: "featured",
    label: "Vendedora destacada",
    earned: reviewCount > 0 && averageRating >= 4.5,
    description: "Promedio alto de calificacion."
  },
  {
    key: "courses",
    label: "Cursos completados",
    earned: completedAllCourses,
    description: "Completó todos los recursos de aprendizaje."
  }
];

const conversationSelect = () =>
  "id,product_id,buyer_id,seller_id,created_at,updated_at";

const formatConversationRows = async (rows = [], userId) => {
  const productIds = rows.map((row) => row.product_id).filter(Boolean);
  const products = productIds.length
    ? unwrap(
        await requireSupabase()
          .from("products")
          .select("*")
          .in("id", productIds)
      )
    : [];
  const productsMap = new Map(products.map((product) => [String(product.id), product]));
  const profileIds = rows.flatMap((row) => [row.buyer_id, row.seller_id]);
  const profiles = await getProfilesMap(profileIds);
  const conversationIds = rows.map((row) => row.id);
  const messageRows = conversationIds.length
    ? unwrap(
        await requireSupabase()
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
      )
    : [];

  return rows.map((row) => {
    const otherId = String(row.buyer_id) === String(userId) ? row.seller_id : row.buyer_id;
    const other = profiles.get(otherId);
    const product = productsMap.get(String(row.product_id));
    const relatedMessages = messageRows.filter(
      (message) => String(message.conversation_id) === String(row.id)
    );
    const lastMessage = relatedMessages[0];
    const unreadCount = relatedMessages.filter(
      (message) => String(message.sender_id) !== String(userId) && !message.read_at
    ).length;

    return {
      ...row,
      product_title: product?.title || "Mensaje directo",
      other_user_id: otherId,
      other_user_name: other?.business_name || other?.name || "Usuaria NextFem",
      other_user_avatar_url: other?.avatar_url,
      last_message: lastMessage?.body || lastMessage?.media_name || lastMessage?.location_label || "",
      last_message_at: lastMessage?.created_at || row.updated_at,
      unread_count: unreadCount
    };
  });
};

export const api = {
  async health() {
    requireSupabase();
    const { error } = await supabase.from("categories").select("id").limit(1);
    if (error) {
      const message = /bucket not found/i.test(error.message)
        ? "Falta crear los buckets de archivos en Supabase. Ejecuta supabase/fix_storage_and_categories.sql en el SQL Editor."
        : error.message;
      throw new Error(message);
    }
    return { message: "Supabase conectado", docs: "supabase/schema.sql" };
  },

  async register(payload) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          name: payload.name,
          business_name: payload.businessName
        }
      }
    });
    if (error) throw new Error(error.message);

    const profile = unwrap(
      await client
        .from("profiles")
        .upsert({
          id: data.user.id,
          email: payload.email,
          name: payload.name,
          business_name: payload.businessName,
          phone: payload.phone,
          city: payload.city,
          role: "seller"
        })
        .select()
        .single()
    );
    const user = formatProfile(profile);
    storage.setSession(data.session?.access_token, user);
    return { token: data.session?.access_token || "supabase-session", user };
  },

  async login(payload) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });
    if (error) throw new Error(error.message);
    const user = await this.me();
    storage.setSession(data.session?.access_token, user);
    return { token: data.session?.access_token || "supabase-session", user };
  },

  async logout() {
    await requireSupabase().auth.signOut();
    storage.clear();
  },

  async me() {
    const authUser = await currentAuthUser();
    if (!authUser) {
      storage.clear();
      return null;
    }

    const profile = unwrap(
      await requireSupabase()
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()
    );
    const user = formatProfile(profile);
    storage.setUser(user);
    return user;
  },

  async updateProfile(payload) {
    const userId = await currentUserId();
    const profile = unwrap(
      await requireSupabase()
        .from("profiles")
        .update({
          name: payload.name,
          phone: payload.phone,
          city: payload.city,
          business_name: payload.businessName,
          bio: payload.bio,
          avatar_url: payload.avatarUrl,
          updated_at: nowIso()
        })
        .eq("id", userId)
        .select()
        .single()
    );
    const user = formatProfile(profile);
    storage.setUser(user);
    return { user, message: "Perfil actualizado." };
  },

  async categories() {
    return unwrap(
      await requireSupabase()
        .from("categories")
        .select("*")
        .order("name")
    );
  },

  async products(params = {}) {
    const client = requireSupabase();
    let query = client.from("products").select("*").neq("status", "deleted");

    if (params.category) {
      const category = unwrap(
        await client
          .from("categories")
          .select("id")
          .eq("slug", params.category)
          .maybeSingle()
      );
      if (category?.id) query = query.eq("category_id", category.id);
    }

    if (params.search) {
      const term = `%${params.search}%`;
      query = query.or(`title.ilike.${term},description.ilike.${term}`);
    }

    if (params.city) query = query.ilike("city", `%${params.city}%`);
    if (params.minPrice) query = query.gte("price", Number(params.minPrice));
    if (params.maxPrice) query = query.lte("price", Number(params.maxPrice));
    if (params.freeOnly) query = query.eq("price", 0);

    const rows = unwrap(
      await query.order("published_at", { ascending: false }).limit(80)
    );
    const formatted = await formatProductRows(rows);

    if (params.sort === "popular") {
      return formatted.sort((a, b) => b.favorite_count - a.favorite_count);
    }
    if (params.sort === "price_asc") {
      return formatted.sort((a, b) => Number(a.price) - Number(b.price));
    }
    if (params.sort === "price_desc") {
      return formatted.sort((a, b) => Number(b.price) - Number(a.price));
    }
    if (params.sort === "searched") {
      const events = unwrap(await client.from("product_events").select("product_id"));
      const counts = events.reduce((map, row) => {
        const key = String(row.product_id);
        map.set(key, (map.get(key) || 0) + 1);
        return map;
      }, new Map());
      return formatted.sort(
        (a, b) => (counts.get(String(b.id)) || 0) - (counts.get(String(a.id)) || 0)
      );
    }

    return formatted;
  },

  async productTrends() {
    const rows = unwrap(
      await requireSupabase()
        .from("product_events")
        .select("query")
        .not("query", "is", null)
        .limit(120)
    );
    const counts = rows.reduce((map, row) => {
      const query = String(row.query || "").trim().toLowerCase();
      if (!query) return map;
      map.set(query, (map.get(query) || 0) + 1);
      return map;
    }, new Map());

    return [...counts.entries()]
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  },

  async trackProductEvent(payload) {
    const userId = await currentUserId().catch(() => null);
    await requireSupabase().from("product_events").insert({
      user_id: userId,
      product_id: payload.productId,
      query: payload.query || null,
      event_type: payload.eventType || "view"
    });
    return { ok: true };
  },

  async favoriteIds() {
    const userId = await currentUserId();
    const rows = unwrap(
      await requireSupabase()
        .from("favorites")
        .select("product_id")
        .eq("user_id", userId)
    );
    return rows.map((row) => row.product_id);
  },

  async favorites() {
    const ids = await this.favoriteIds();
    if (!ids.length) return [];
    const rows = unwrap(
      await requireSupabase()
        .from("products")
        .select("*")
        .in("id", ids)
        .neq("status", "deleted")
    );
    return formatProductRows(rows);
  },

  async addFavorite(productId) {
    const userId = await currentUserId();
    await requireSupabase().from("favorites").upsert({
      user_id: userId,
      product_id: productId
    });
    const product = unwrap(
      await requireSupabase()
        .from("products")
        .select("seller_id,title")
        .eq("id", productId)
        .single()
    );
    await makeNotification({
      userId: product.seller_id,
      actorId: userId,
      productId,
      type: "favorite",
      title: "Producto guardado",
      body: `Agregaron "${product.title}" a favoritos.`
    });
    return { message: "Producto guardado." };
  },

  async removeFavorite(productId) {
    const userId = await currentUserId();
    await requireSupabase()
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    return { message: "Producto quitado de favoritos." };
  },

  async reportProduct(productId, payload) {
    const reporterId = await currentUserId();
    await requireSupabase().from("product_reports").insert({
      reporter_id: reporterId,
      product_id: productId,
      reason: payload.reason,
      details: payload.details
    });
    return { message: "Reporte enviado. Gracias por cuidar la comunidad." };
  },

  async reportUser(userId, payload) {
    const reporterId = await currentUserId();
    await requireSupabase().from("product_reports").insert({
      reporter_id: reporterId,
      product_id: payload.productId || null,
      reason: payload.reason || "usuario",
      details: `Usuario reportado: ${userId}. ${payload.details || ""}`
    });
    return { message: "Reporte enviado." };
  },

  async blockedUsers() {
    const userId = await currentUserId();
    return unwrap(
      await requireSupabase()
        .from("user_blocks")
        .select("*")
        .eq("blocker_id", userId)
    );
  },

  async blockUser(userId, payload = {}) {
    const blockerId = await currentUserId();
    await requireSupabase().from("user_blocks").upsert({
      blocker_id: blockerId,
      blocked_id: userId,
      reason: payload.reason,
      details: payload.details
    });
    return { message: "Usuaria bloqueada." };
  },

  async unblockUser(userId) {
    const blockerId = await currentUserId();
    await requireSupabase()
      .from("user_blocks")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", userId);
    return { message: "Usuaria desbloqueada." };
  },

  async sellerReviews(sellerId) {
    const rows = unwrap(
      await requireSupabase()
        .from("seller_reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
    );
    const reviewers = await getProfilesMap(rows.map((row) => row.reviewer_id));
    return rows.map((row) => ({
      ...row,
      reviewer_name: reviewers.get(row.reviewer_id)?.name || "Usuaria NextFem"
    }));
  },

  async createSellerReview(sellerId, payload) {
    const reviewerId = await currentUserId();
    const review = unwrap(
      await requireSupabase()
        .from("seller_reviews")
        .insert({
          seller_id: sellerId,
          reviewer_id: reviewerId,
          product_id: payload.productId,
          rating: payload.rating,
          comment: payload.comment
        })
        .select()
        .single()
    );
    await makeNotification({
      userId: sellerId,
      actorId: reviewerId,
      productId: payload.productId,
      type: "review",
      title: "Nueva calificacion",
      body: `Recibiste ${payload.rating} estrellas.`
    });
    return { message: "Reseña guardada.", review };
  },

  async myMetrics() {
    const userId = await currentUserId();
    const [products, reviews, followers, profile] = await Promise.all([
      unwrap(await requireSupabase().from("products").select("*").eq("seller_id", userId)),
      unwrap(await requireSupabase().from("seller_reviews").select("rating").eq("seller_id", userId)),
      unwrap(await requireSupabase().from("seller_followers").select("follower_id").eq("seller_id", userId)),
      unwrap(await requireSupabase().from("profiles").select("*").eq("id", userId).single())
    ]);
    const productIds = products.map((product) => product.id);
    const favorites = productIds.length
      ? unwrap(
          await requireSupabase()
            .from("favorites")
            .select("product_id")
            .in("product_id", productIds)
        )
      : [];
    const activeProducts = products.filter((product) => product.status === "active").length;
    const soldProducts = products.filter((product) => product.status === "sold").length + Number(profile.sales_count || 0);
    const averageRating = Number(average(reviews.map((row) => row.rating)).toFixed(1));

    return {
      active_products: activeProducts,
      sold_products: soldProducts,
      conversations: 0,
      favorite_count: favorites.length,
      followers_count: followers.length,
      average_rating: averageRating,
      review_count: reviews.length,
      badges: buildBadges({
        activeProducts,
        soldProducts,
        averageRating,
        reviewCount: reviews.length,
        completedAllCourses: Boolean(profile.completed_all_courses)
      })
    };
  },

  async myProducts() {
    const userId = await currentUserId();
    const rows = unwrap(
      await requireSupabase()
        .from("products")
        .select("*")
        .eq("seller_id", userId)
        .neq("status", "deleted")
        .order("published_at", { ascending: false })
    );
    return formatProductRows(rows);
  },

  async publicSellerProfile(sellerId) {
    const supabase = requireSupabase();
    const profile = unwrap(
      await supabase
        .from("profiles")
        .select("id,name,business_name,city,bio,avatar_url,sales_count,completed_all_courses,created_at")
        .eq("id", sellerId)
        .single()
    );
    const [productRows, reviewRows, followerRows] = await Promise.all([
      unwrap(
        await supabase
          .from("products")
          .select("*")
          .eq("seller_id", sellerId)
          .eq("status", "active")
          .order("published_at", { ascending: false })
      ),
      unwrap(
        await supabase
          .from("seller_reviews")
          .select("*")
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false })
      ),
      unwrap(
        await supabase
          .from("seller_followers")
          .select("follower_id")
          .eq("seller_id", sellerId)
      )
    ]);
    const reviewers = await getProfilesMap(reviewRows.map((row) => row.reviewer_id));
    const products = await formatProductRows(productRows);
    const activeProducts = products.length;
    const soldProducts =
      productRows.filter((product) => product.status === "sold").length + Number(profile.sales_count || 0);
    const averageRating = Number(average(reviewRows.map((row) => row.rating)).toFixed(1));

    return {
      profile,
      products,
      reviews: reviewRows.map((row) => ({
        ...row,
        reviewer_name: reviewers.get(row.reviewer_id)?.name || "Usuaria NextFem"
      })),
      metrics: {
        active_products: activeProducts,
        sold_products: soldProducts,
        average_rating: averageRating,
        review_count: reviewRows.length,
        followers_count: followerRows.length
      }
    };
  },

  async createProduct(payload) {
    const sellerId = await currentUserId();
    const product = unwrap(
      await requireSupabase()
        .from("products")
        .insert({
          seller_id: sellerId,
          category_id: payload.categoryId || null,
          title: payload.title,
          description: payload.description,
          price: Number(payload.price || 0),
          is_free: Number(payload.price || 0) === 0,
          image_url: payload.media?.[0]?.url || payload.imageUrl || null,
          city: payload.city,
          status: "active",
          published_at: nowIso()
        })
        .select()
        .single()
    );

    const media = payload.media || [];
    if (media.length) {
      await requireSupabase().from("product_media").insert(
        media.map((item, index) => ({
          product_id: product.id,
          url: item.url,
          media_type: item.mediaType || item.media_type || "image",
          mime_type: item.mimeType || item.mime_type || "",
          name: item.name || item.fileName || item.file_name || "",
          sort_order: index
        }))
      );
    }

    const followers = unwrap(
      await requireSupabase()
        .from("seller_followers")
        .select("follower_id")
        .eq("seller_id", sellerId)
    );
    await Promise.all(
      followers.map((follower) =>
        makeNotification({
          userId: follower.follower_id,
          actorId: sellerId,
          productId: product.id,
          type: "new_product",
          title: "Nueva publicación",
          body: `Una vendedora que sigues publicó "${product.title}".`
        })
      )
    );

    return { product, message: "Publicacion creada correctamente." };
  },

  async deleteProduct(id) {
    const sellerId = await currentUserId();
    await requireSupabase()
      .from("products")
      .update({ status: "deleted", updated_at: nowIso() })
      .eq("id", id)
      .eq("seller_id", sellerId);
    return { message: "Publicacion eliminada." };
  },

  async similarProducts(id) {
    const product = unwrap(
      await requireSupabase()
        .from("products")
        .select("*")
        .eq("id", id)
        .single()
    );
    const rows = unwrap(
      await requireSupabase()
        .from("products")
        .select("*")
        .neq("id", id)
        .neq("status", "deleted")
        .or(`category_id.eq.${product.category_id},city.ilike.%${product.city || ""}%`)
        .limit(6)
    );
    return formatProductRows(rows);
  },

  async conversations() {
    const userId = await currentUserId();
    const rows = unwrap(
      await requireSupabase()
        .from("conversations")
        .select(conversationSelect())
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("updated_at", { ascending: false })
    );
    return formatConversationRows(rows, userId);
  },

  async notifications() {
    const userId = await currentUserId();
    return unwrap(
      await requireSupabase()
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
    );
  },

  async markNotificationRead(id) {
    await requireSupabase().from("notifications").update({ is_read: true }).eq("id", id);
    return { ok: true };
  },

  async markNotificationsRead() {
    const userId = await currentUserId();
    await requireSupabase()
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
    return { ok: true };
  },

  async startConversation(payload) {
    const buyerId = await currentUserId();
    let product = null;
    let sellerId = payload.sellerId || null;

    if (payload.productId) {
      product = unwrap(
        await requireSupabase()
          .from("products")
          .select("*")
          .eq("id", payload.productId)
          .single()
      );
      sellerId = product.seller_id;
    }

    if (!sellerId) {
      throw new Error("No se encontro la vendedora para abrir el chat.");
    }

    if (String(sellerId) === String(buyerId)) {
      throw new Error("No puedes abrir chat contigo misma.");
    }

    let query = requireSupabase()
        .from("conversations")
        .select(conversationSelect())
        .eq("buyer_id", buyerId)
        .eq("seller_id", sellerId)
        .limit(1);

    query = product?.id ? query.eq("product_id", product.id) : query.is("product_id", null);

    let conversation = unwrap(await query.maybeSingle());

    if (!conversation) {
      conversation = unwrap(
        await requireSupabase()
          .from("conversations")
          .insert({
            product_id: product?.id || null,
            buyer_id: buyerId,
            seller_id: sellerId
          })
          .select(conversationSelect())
          .single()
      );
    }

    if (payload.initialMessage) {
      await this.sendMessage(conversation.id, payload.initialMessage);
    }

    const [formatted] = await formatConversationRows([conversation], buyerId);
    return { conversation: formatted };
  },

  async messages(conversationId) {
    const userId = await currentUserId();
    const rows = unwrap(
      await requireSupabase()
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
    );
    const deleted = unwrap(
      await requireSupabase()
        .from("message_deletions")
        .select("message_id")
        .eq("user_id", userId)
    );
    const deletedIds = new Set(deleted.map((row) => String(row.message_id)));
    const unreadIds = rows
      .filter((row) => String(row.sender_id) !== String(userId) && !row.read_at)
      .map((row) => row.id);
    if (unreadIds.length) {
      await requireSupabase().from("messages").update({ read_at: nowIso() }).in("id", unreadIds);
    }
    return rows
      .filter((row) => !deletedIds.has(String(row.id)))
      .map((row) => ({ ...row, read_at: row.read_at || (unreadIds.includes(row.id) ? nowIso() : row.read_at) }));
  },

  async sendMessage(conversationId, payload) {
    const senderId = await currentUserId();
    const body = typeof payload === "string" ? payload : payload.body;
    const conversation = unwrap(
      await requireSupabase()
        .from("conversations")
        .select(conversationSelect())
        .eq("id", conversationId)
        .single()
    );
    const messageData = unwrap(
      await requireSupabase()
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          body,
          message_type: payload.messageType || "text",
          media_url: payload.mediaUrl || null,
          media_mime: payload.mediaMime || null,
          media_name: payload.mediaName || null,
          latitude: payload.latitude || payload.locationLat || null,
          longitude: payload.longitude || payload.locationLng || null,
          location_label: payload.locationLabel || null,
          location_mode:
            payload.locationMode ||
            (payload.locationLive === true ? "realtime" : payload.locationLat ? "fixed" : null)
        })
        .select()
        .single()
    );
    await requireSupabase()
      .from("conversations")
      .update({ updated_at: nowIso() })
      .eq("id", conversationId);

    const receiverId =
      String(conversation.buyer_id) === String(senderId)
        ? conversation.seller_id
        : conversation.buyer_id;
    await makeNotification({
      userId: receiverId,
      actorId: senderId,
      conversationId,
      productId: conversation.product_id,
      type: "message",
      title: "Nuevo mensaje",
      body: body || payload.mediaName || "Te enviaron contenido multimedia."
    });

    return { messageData };
  },

  async deleteMessage(conversationId, messageId, scope) {
    const userId = await currentUserId();
    if (scope === "everyone") {
      await requireSupabase()
        .from("messages")
        .update({
          body: "Mensaje eliminado para todos",
          media_url: null,
          media_mime: null,
          media_name: null,
          is_deleted_for_everyone: true,
          deleted_for_everyone_at: nowIso()
        })
        .eq("id", messageId)
        .eq("sender_id", userId);
      return { ok: true };
    }

    await requireSupabase().from("message_deletions").upsert({
      message_id: messageId,
      user_id: userId
    });
    return { ok: true };
  },

  async restoreMessage(conversationId, messageId, scope) {
    const userId = await currentUserId();
    if (scope === "everyone") {
      throw new Error("Solo puedes deshacer borrados para ti en esta version.");
    }
    await requireSupabase()
      .from("message_deletions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);
    return { ok: true };
  },

  async followSeller(sellerId) {
    const followerId = await currentUserId();
    await requireSupabase().from("seller_followers").upsert({
      follower_id: followerId,
      seller_id: sellerId
    });
    return { message: "Ahora sigues a esta vendedora." };
  },

  async unfollowSeller(sellerId) {
    const followerId = await currentUserId();
    await requireSupabase()
      .from("seller_followers")
      .delete()
      .eq("follower_id", followerId)
      .eq("seller_id", sellerId);
    return { message: "Dejaste de seguir a esta vendedora." };
  },

  async followedSellerIds() {
    const userId = await currentUserId();
    const rows = unwrap(
      await requireSupabase()
        .from("seller_followers")
        .select("seller_id")
        .eq("follower_id", userId)
    );
    return rows.map((row) => row.seller_id);
  },

  async feedFromFollowedSellers() {
    const ids = await this.followedSellerIds();
    if (!ids.length) return [];
    const rows = unwrap(
      await requireSupabase()
        .from("products")
        .select("*")
        .in("seller_id", ids)
        .neq("status", "deleted")
        .order("published_at", { ascending: false })
        .limit(20)
    );
    return formatProductRows(rows);
  },

  async completeCourse(courseUrl, totalCourses = 1) {
    const userId = await currentUserId();
    await requireSupabase().from("course_progress").upsert({
      user_id: userId,
      course_url: courseUrl
    });
    const rows = unwrap(
      await requireSupabase()
        .from("course_progress")
        .select("course_url")
        .eq("user_id", userId)
    );
    const completedAll = rows.length >= totalCourses;
    if (completedAll) {
      await requireSupabase()
        .from("profiles")
        .update({ completed_all_courses: true })
        .eq("id", userId);
    }
    return { completedAll, completed: rows.map((row) => row.course_url) };
  },

  async completedCourses() {
    const userId = await currentUserId();
    const rows = unwrap(
      await requireSupabase()
        .from("course_progress")
        .select("course_url")
        .eq("user_id", userId)
    );
    return rows.map((row) => row.course_url);
  },

  aiProductCopy(payload) {
    return localProductCopy(payload);
  },

  async aiQuickReplies({ incomingMessage }) {
    const base = incomingMessage?.includes("?")
      ? "Claro, con gusto te explico más detalles."
      : "Gracias por escribir, estoy al pendiente.";
    return {
      aiMode: "supabase-local",
      replies: [
        base,
        "Si gustas, puedo compartirte disponibilidad y tiempo de entrega.",
        "Podemos coordinar por aquí para mantener la conversación segura."
      ]
    };
  },

  async aiSafetyCheck({ text }) {
    const risky = /(deposito|transferencia|codigo|contrase|whatsapp externo)/i.test(text || "");
    return {
      aiMode: "supabase-local",
      riskLevel: risky ? "medio" : "bajo",
      advice: risky ? "Ten cuidado con pagos o datos personales fuera de la plataforma." : "",
      suggestedResponse: risky ? "Te recomiendo mantener la conversación por NextFem." : ""
    };
  },

  async aiSmartSearch({ queryText }) {
    return {
      aiMode: "supabase-local",
      query: queryText,
      suggestion: "Busca por categoría, ciudad o rango de precio para resultados más precisos."
    };
  },

  async aiConversationSummary({ messages }) {
    const latest = messages?.slice(-3).map((message) => message.body).join(" ") || "";
    return {
      aiMode: "supabase-local",
      summary: latest || "Aún no hay suficiente conversación para resumir.",
      quickReply: "Gracias, reviso y te confirmo por aquí."
    };
  },

  async uploadImage(file) {
    return this.uploadFile(file, "nextfem-products");
  },

  async uploadFile(file, bucket = "nextfem-products") {
    const userId = await currentUserId();
    const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${safeName}`;
    const { error } = await requireSupabase()
      .storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });
    if (error) throw new Error(error.message);
    const { data } = requireSupabase().storage.from(bucket).getPublicUrl(path);
    return { imageUrl: data.publicUrl, url: data.publicUrl, path };
  },

  subscribeRealtime(userId, handlers = {}) {
    if (!supabase || !userId) return () => {};
    const channel = supabase
      .channel(`nextfem-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => handlers.onMessage?.(payload.new)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => handlers.onMessageUpdate?.(payload.new)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => handlers.onNotification?.(payload.new)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => handlers.onConversationChange?.()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
