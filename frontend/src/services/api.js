const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
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
      throw new Error("El backend tardo demasiado en responder. Revisa que este encendido.");
    }

    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el backend. Enciende el servidor en localhost:3000.");
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
  startConversation(payload) {
    return request("/conversations", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  messages(conversationId) {
    return request(`/conversations/${conversationId}/messages`);
  },
  sendMessage(conversationId, body) {
    return request(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body })
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
  }
};
