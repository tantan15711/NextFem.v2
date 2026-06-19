export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api$/, "");
const TOKEN_KEY = "nextfem_token";
const USER_KEY = "nextfem_user";

export const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

const request = async (path, options = {}) => {
  const token = storage.getToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(data?.message || "No se pudo completar la solicitud.");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La conexion tardo demasiado. Intenta de nuevo.");
    }

    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar en este momento.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};

const toQueryString = (params) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
};

export const api = {
  health() {
    return request("/health");
  },
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  me() {
    return request("/auth/me");
  },
  updateProfile(payload) {
    return request("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  categories() {
    return request("/categories");
  },
  products(params = {}) {
    return request(`/products${toQueryString(params)}`);
  },
  productTrends() {
    return request("/products/trends");
  },
  trackProductEvent(payload) {
    return request("/products/events", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  favoriteIds() {
    return request("/engagement/favorites/ids");
  },
  favorites() {
    return request("/engagement/favorites");
  },
  addFavorite(productId) {
    return request(`/engagement/favorites/${productId}`, {
      method: "POST"
    });
  },
  removeFavorite(productId) {
    return request(`/engagement/favorites/${productId}`, {
      method: "DELETE"
    });
  },
  reportProduct(productId, payload) {
    return request(`/engagement/reports/product/${productId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  reportUser(userId, payload) {
    return request(`/engagement/reports/user/${userId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  blockedUsers() {
    return request("/engagement/blocks");
  },
  blockUser(userId, payload = {}) {
    return request(`/engagement/blocks/${userId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  unblockUser(userId) {
    return request(`/engagement/blocks/${userId}`, {
      method: "DELETE"
    });
  },
  sellerReviews(sellerId) {
    return request(`/engagement/reviews/seller/${sellerId}`);
  },
  createSellerReview(sellerId, payload) {
    return request(`/engagement/reviews/seller/${sellerId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  myMetrics() {
    return request("/engagement/metrics/me");
  },
  myProducts() {
    return request("/products/mine");
  },
  createProduct(payload) {
    return request("/products", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  deleteProduct(id) {
    return request(`/products/${id}`, {
      method: "DELETE"
    });
  },
  similarProducts(id) {
    return request(`/products/${id}/similar`);
  },
  conversations() {
    return request("/conversations");
  },
  notifications() {
    return request("/conversations/notifications");
  },
  markNotificationRead(id) {
    return request(`/conversations/notifications/${id}/read`, {
      method: "PATCH"
    });
  },
  markNotificationsRead() {
    return request("/conversations/notifications/read-all", {
      method: "PATCH"
    });
  },
  startConversation(payload) {
    return request("/conversations", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  messages(conversationId) {
    return request(`/conversations/${conversationId}/messages`);
  },
  sendMessage(conversationId, payload) {
    return request(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(
        typeof payload === "string" ? { body: payload } : payload
      )
    });
  },
  deleteMessage(conversationId, messageId, scope) {
    return request(`/conversations/${conversationId}/messages/${messageId}`, {
      method: "DELETE",
      body: JSON.stringify({ scope })
    });
  },
  restoreMessage(conversationId, messageId, scope) {
    return request(`/conversations/${conversationId}/messages/${messageId}/restore`, {
      method: "POST",
      body: JSON.stringify({ scope })
    });
  },
  aiProductCopy(payload) {
    return request("/assistant/product-copy", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  aiQuickReplies(payload) {
    return request("/assistant/quick-replies", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  aiSafetyCheck(payload) {
    return request("/assistant/safety-check", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  aiSmartSearch(payload) {
    return request("/assistant/smart-search", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  aiConversationSummary(payload) {
    return request("/assistant/conversation-summary", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const result = await request("/uploads", {
            method: "POST",
            body: JSON.stringify({ imageData: reader.result })
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
  },
  uploadFile(file) {
    return this.uploadImage(file);
  }
};
