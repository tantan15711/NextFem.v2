import { computed, reactive, ref } from "vue";
import { api, storage } from "../services/api";

const routeByView = {
  home: "home",
  auth: "auth",
  publish: "publish",
  profile: "profile",
  sellerProfile: "seller-profile",
  chat: "chat",
  courses: "courses",
  recovery: "recovery",
  admin: "admin"
};

const viewByRoute = Object.fromEntries(
  Object.entries(routeByView).map(([view, route]) => [route, view])
);

let routerInstance = null;
let refreshTimer = null;
let undoTimer = null;
let typingTimer = null;
let realtimeUnsubscribe = null;
let joinedConversationId = null;

const activeView = ref("home");
const authMode = ref("login");
const recoveryStep = ref("request");
const recoveryMethod = ref("email");
const loading = ref(false);
const notice = ref("");
const error = ref("");
const apiStatus = ref("checking");
const productMediaFiles = ref([]);
const productMediaPreviews = ref([]);
const profileImageFile = ref(null);
const profileImagePreview = ref("");
const initialized = ref(false);
const showLogoutConfirm = ref(false);

const user = ref(storage.getUser());
const categories = ref([]);
const products = ref([]);
const myProducts = ref([]);
const similarProducts = ref([]);
const conversations = ref([]);
const messages = ref([]);
const selectedConversation = ref(null);
const contactProduct = ref(null);
const contactSeller = ref(null);
const notifications = ref([]);
const notificationPanelOpen = ref(false);
const blockedUsers = ref([]);
const typingUsers = ref({});
const favoriteIds = ref([]);
const favoriteProducts = ref([]);
const sellerReviews = ref([]);
const metrics = ref(null);
const followedSellerIds = ref([]);
const followedProducts = ref([]);
const completedCourseUrls = ref([]);
const assistantResult = ref(null);
const smartSearchResult = ref(null);
const conversationSummary = ref(null);
const quickReplies = ref([]);
const safetyNotice = ref("");
const searchTrends = ref([]);
const selectedImage = ref(null);
const chatMediaFile = ref(null);
const chatMediaPreview = ref("");
const chatLocationDraft = ref(null);
const isRecordingAudio = ref(false);
const audioRecorderSupported = ref(false);
const undoToast = ref(null);
let mediaRecorder = null;
let recordedChunks = [];

const filters = reactive({
  search: "",
  category: "",
  city: "",
  minPrice: "",
  maxPrice: "",
  freeOnly: false,
  sort: "searched"
});

const authForm = reactive({
  name: "",
  email: "",
  password: "",
  phone: "",
  city: "",
  businessName: ""
});

const recoveryForm = reactive({
  email: "",
  phone: "",
  code: "",
  password: "",
  confirmPassword: ""
});

const profileForm = reactive({
  name: "",
  phone: "",
  city: "",
  businessName: "",
  bio: "",
  avatarUrl: ""
});

const productForm = reactive({
  title: "",
  description: "",
  categoryId: "",
  price: 0,
  city: "",
  hashtags: ""
});

const chatDraft = reactive({
  initialMessage: "",
  message: ""
});

const reviewForm = reactive({
  sellerId: "",
  productId: "",
  rating: 5,
  comment: ""
});

const courses = [
  {
    title: "DreamBuilder para mujeres emprendedoras",
    provider: "DreamBuilder",
    url: "https://spanish.dreambuilder.org/"
  },
  {
    title: "Marketing Digital para Emprendedores",
    provider: "Cursa",
    url: "https://cursa.app/es/curso-gratis/marketing-digital-para-emprendedores-egag"
  },
  {
    title: "Lean Canvas y Lean Startup",
    provider: "Cursa",
    url: "https://cursa.app/es/curso-gratis/lean-canvas-y-lean-startup-crea-y-valida-tu-modelo-de-negocio-ffdc"
  },
  {
    title: "Crea tu propia empresa",
    provider: "Campus Rafael del Pino",
    url: "https://frdelpino.edu.es/courses/crea-tu-propia-empresa/"
  },
  {
    title: "Emprende con la IA",
    provider: "OLEWEB",
    url: "https://oleweb.es/curso-emprende-con-la-ia/"
  }
];

const isLoggedIn = computed(() => Boolean(user.value && storage.getToken()));
const visibleProducts = computed(() => products.value);
const recentProducts = computed(() =>
  [...products.value]
    .sort(
      (a, b) =>
        new Date(b.published_at || b.created_at || 0) -
        new Date(a.published_at || a.created_at || 0)
    )
    .slice(0, 6)
);
const sellerBadges = computed(() => metrics.value?.badges || []);
const selectedCategoryName = computed(() => {
  const found = categories.value.find((category) => category.slug === filters.category);
  return found ? found.name : "Todas";
});
const unreadMessages = computed(() =>
  conversations.value.reduce((total, conversation) => {
    return total + Number(conversation.unread_count || 0);
  }, 0)
);
const unreadNotifications = computed(() =>
  notifications.value.reduce((total, notification) => {
    return total + (notification.is_read ? 0 : 1);
  }, 0)
);
const selectedConversationBlocked = computed(() => {
  if (!selectedConversation.value?.other_user_id) return false;

  return blockedUsers.value.some(
    (blocked) =>
      String(blocked.blocked_id) === String(selectedConversation.value.other_user_id)
  );
});
const selectedTypingNames = computed(() => {
  if (!selectedConversation.value) return [];

  return Object.values(typingUsers.value[selectedConversation.value.id] || {});
});
const notificationCount = computed(() => {
  const reviewBoost = Number(metrics.value?.review_count || 0) > 0 ? 1 : 0;
  return unreadMessages.value + unreadNotifications.value + reviewBoost;
});
const authButtonText = computed(() => {
  if (loading.value) {
    return authMode.value === "register" ? "Creando cuenta..." : "Entrando...";
  }

  return authMode.value === "register" ? "Crear cuenta" : "Entrar";
});

const recoveryButtonText = computed(() => {
  if (loading.value) return "Procesando...";
  if (recoveryStep.value === "verify") return "Verificar código";
  if (recoveryStep.value === "password") return "Guardar contraseña";
  return recoveryMethod.value === "sms" ? "Enviar código por SMS" : "Enviar código por correo";
});

const parseHashtags = (value = "") => [
  ...new Set(
    String(value || "")
      .split(/[\s,]+/)
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean)
      .map((tag) => `#${tag.slice(0, 36)}`)
  )
].slice(0, 10);

const setNotice = (message) => {
  notice.value = message;
  error.value = "";
};

const setError = (message) => {
  error.value = message;
  notice.value = "";
};

const clearUndoToast = () => {
  if (undoTimer) {
    window.clearTimeout(undoTimer);
    undoTimer = null;
  }

  undoToast.value = null;
};

const showUndoToast = (message, undoAction) => {
  clearUndoToast();
  undoToast.value = {
    message,
    undoAction,
    working: false
  };
  undoTimer = window.setTimeout(() => {
    undoToast.value = null;
    undoTimer = null;
  }, 5000);
};

const undoLastAction = async () => {
  if (!undoToast.value?.undoAction || undoToast.value.working) return;

  undoToast.value.working = true;

  try {
    await undoToast.value.undoAction();
    clearUndoToast();
  } catch (err) {
    handleRequestError(err);
    clearUndoToast();
  }
};

const showBrowserNotification = (title, body) => {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    window.Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    new window.Notification(title, {
      body,
      icon: "/nextfem-logo.svg"
    });
  } catch (err) {
    // Native notifications are optional; the in-app badge still works.
  }
};

const syncRouteView = (routeName) => {
  activeView.value = viewByRoute[routeName] || "home";

  if (
    routeName === "recovery" &&
    typeof window !== "undefined" &&
    window.location.hash.includes("access_token")
  ) {
    recoveryStep.value = "password";
  }
};

const setRouter = (router) => {
  routerInstance = router;
  syncRouteView(router.currentRoute.value.name);
};

const navigateTo = async (view) => {
  activeView.value = view;

  if (routerInstance && routerInstance.currentRoute.value.name !== routeByView[view]) {
    await routerInstance.push({ name: routeByView[view] });
  }

  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

const handleRequestError = (err) => {
  const message = err?.message || "No se pudo completar la solicitud.";

  if (message.includes("Supabase") || message.includes("VITE_SUPABASE")) {
    apiStatus.value = "offline";
    setError(message);
    return;
  }

  if (
    message.includes("conectar") ||
    message.includes("conexion") ||
    message.includes("supabase") ||
    message.includes("tardo")
  ) {
    apiStatus.value = "offline";

    if (activeView.value === "home") {
      return;
    }

    setError("No se pudo completar la acción. Intenta de nuevo en unos segundos.");
    return;
  }

  setError(message);
};

const markApiOnline = () => {
  apiStatus.value = "online";
};

const checkApi = async () => {
  apiStatus.value = "checking";

  try {
    await api.health();
    markApiOnline();
  } catch (err) {
    apiStatus.value = "offline";
  }
};

const connectSocket = () => {
  if (!isLoggedIn.value || realtimeUnsubscribe) return;

  realtimeUnsubscribe = api.subscribeRealtime(user.value.id, {
    onMessage: async (message) => {
      const isOpen =
        selectedConversation.value &&
        String(selectedConversation.value.id) === String(message.conversation_id);

      if (isOpen) {
        const exists = messages.value.some((item) => String(item.id) === String(message.id));
        if (!exists) {
          messages.value = [...messages.value, message];
        }
      }

      if (isOpen) {
        touchConversationPreview({
          body: message.body,
          mediaName: message.media_name,
          locationLabel: message.location_label,
          createdAt: message.created_at
        });
      } else {
        window.setTimeout(() => loadConversations(false).catch(() => {}), 250);
      }
    },
    onMessageUpdate: async (message) => {
      const isOpen =
        selectedConversation.value &&
        String(selectedConversation.value.id) === String(message.conversation_id);

      if (isOpen) {
        messages.value = messages.value.map((item) =>
          String(item.id) === String(message.id) ? message : item
        );
      }

      window.setTimeout(() => loadConversations(false).catch(() => {}), 250);
    },
    onNotification: async (notification) => {
      notifications.value = [notification, ...notifications.value]
        .filter(
          (item, index, list) =>
            list.findIndex((candidate) => String(candidate.id) === String(item.id)) === index
        )
        .slice(0, 50);
      showBrowserNotification(notification.title, notification.body);
    },
    onConversationChange: async () => {
      window.setTimeout(() => loadConversations(false).catch(() => {}), 250);
    }
  });
};

const disconnectSocket = () => {
  if (typingTimer) {
    window.clearTimeout(typingTimer);
    typingTimer = null;
  }

  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }

  joinedConversationId = null;
};

const money = (value) => {
  const amount = Number(value || 0);

  if (amount === 0) {
    return "Apoyo gratuito";
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(amount);
};

const uniqueTextArray = (items = []) =>
  [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];

const categoryInitial = (product) => {
  return (product.category_name || product.title || "N").slice(0, 1).toUpperCase();
};

const isVideoMedia = (media) => {
  const mimeType = media?.mimeType || media?.mime_type || "";
  const url = media?.url || "";

  return (
    media?.mediaType === "video" ||
    media?.media_type === "video" ||
    mimeType.startsWith("video/") ||
    /\.(mp4|webm|mov)$/i.test(url)
  );
};

const getProductMedia = (product) => {
  const media = Array.isArray(product?.media) ? product.media : [];

  if (media.length > 0) {
    return media
      .map((item, index) => ({
        id: item.id || `${product.id}-${index}`,
        url: item.url,
        title: product.title,
        mediaType: item.mediaType || item.media_type || (isVideoMedia(item) ? "video" : "image"),
        mimeType: item.mimeType || item.mime_type || "",
        fileName: item.fileName || item.file_name || "",
        isPrimary: Boolean(item.isPrimary || item.is_primary)
      }))
      .filter((item) => item.url);
  }

  if (!product?.image_url) return [];

  return [
    {
      id: `${product.id}-legacy`,
      url: product.image_url,
      title: product.title,
      mediaType: product.primary_media_type || (isVideoMedia({ url: product.image_url }) ? "video" : "image"),
      mimeType: product.primary_media_mime || "",
      fileName: "",
      isPrimary: true
    }
  ];
};

const getPrimaryMedia = (product) => {
  const media = getProductMedia(product);
  return media.find((item) => item.isPrimary) || media[0] || null;
};

const trackProductEvent = async (payload) => {
  try {
    await api.trackProductEvent(payload);
  } catch (err) {
    // Search signals are useful, but should never interrupt the marketplace.
  }
};

const openProductImage = async (product, startIndex = 0) => {
  const media = getProductMedia(product);
  if (media.length === 0) return;

  selectedImage.value = {
    items: media,
    index: startIndex,
    title: product.title,
    seller: product.seller_name,
    price: money(product.price)
  };

  await trackProductEvent({
    productId: product.id,
    query: filters.search,
    eventType: "open_image"
  });
};

const closeProductImage = () => {
  selectedImage.value = null;
};

const compressImage = (file) => {
  if (!file || !file.type.startsWith("image/")) return Promise.resolve(file);

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);

          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }

          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
              type: "image/webp",
              lastModified: Date.now()
            })
          );
        },
        "image/webp",
        0.78
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });
};

const getMessageTypeForFile = (file) => {
  if (!file) return "file";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

const onChatMediaChange = (event) => {
  const file = event.target.files?.[0];
  chatMediaFile.value = file || null;
  chatMediaPreview.value = file && file.type.startsWith("image/")
    ? URL.createObjectURL(file)
    : "";
};

const clearChatMedia = () => {
  if (chatMediaPreview.value) {
    URL.revokeObjectURL(chatMediaPreview.value);
  }

  chatMediaFile.value = null;
  chatMediaPreview.value = "";
};

const buildLocationLabel = (lat, lng, live) => {
  return live
    ? `Ubicación en tiempo real: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : `Ubicación fija: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const prepareLocationMessage = async (live = false) => {
  if (!requireLogin()) return;

  if (!navigator.geolocation) {
    setError("Tu navegador no permite compartir ubicacion.");
    return;
  }

  setNotice("Obteniendo ubicacion...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      chatLocationDraft.value = {
        locationLat: lat,
        locationLng: lng,
        locationLive: live,
        locationLabel: buildLocationLabel(lat, lng, live),
        locationExpiresAt: live
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
          : null
      };
      chatDraft.message = live
        ? "Te comparto mi ubicacion en tiempo real por 30 minutos."
        : "Te comparto mi ubicacion fija.";
      setNotice(live ? "Ubicación en tiempo real lista para enviar." : "Ubicación fija lista para enviar.");
    },
    () => {
      setError("No se pudo obtener tu ubicacion. Revisa permisos del navegador.");
    },
    {
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 300000
    }
  );
};

const clearLocationDraft = () => {
  chatLocationDraft.value = null;
};

const startAudioRecording = async () => {
  if (!requireLogin()) return;

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    audioRecorderSupported.value = false;
    setError("Tu navegador no permite grabar audio aquí.");
    return;
  }

  try {
    audioRecorderSupported.value = true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      stream.getTracks().forEach((track) => track.stop());
      const audioFile = new File([blob], `audio-nextfem-${Date.now()}.webm`, {
        type: "audio/webm"
      });
      await sendMediaMessage(audioFile, "Audio grabado en NextFem");
    };
    mediaRecorder.start();
    isRecordingAudio.value = true;
  } catch (err) {
    setError("No se pudo iniciar la grabacion. Revisa permisos del microfono.");
  }
};

const stopAudioRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  isRecordingAudio.value = false;
};

const uploadSelectedImage = async (file) => {
  if (!file) return "";

  const compressed = await compressImage(file);
  const result = await api.uploadImage(compressed);
  markApiOnline();
  return result.imageUrl;
};

const uploadProductMediaFile = async (file) => {
  const uploadFile = file.type.startsWith("image/") ? await compressImage(file) : file;
  const result = await api.uploadFile(uploadFile);
  markApiOnline();

  return {
    url: result.imageUrl,
    mediaType: uploadFile.type.startsWith("video/") ? "video" : "image",
    mimeType: uploadFile.type,
    fileName: uploadFile.name
  };
};

const clearProductMedia = () => {
  productMediaPreviews.value.forEach((item) => URL.revokeObjectURL(item.url));
  productMediaFiles.value = [];
  productMediaPreviews.value = [];
};

const onProductMediaChange = (event) => {
  const currentKeys = new Set(
    productMediaFiles.value.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
  );
  const incomingFiles = Array.from(event.target.files || [])
    .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
    .filter((file) => !currentKeys.has(`${file.name}-${file.size}-${file.lastModified}`));
  const availableSlots = Math.max(0, 8 - productMediaFiles.value.length);
  const files = incomingFiles.slice(0, availableSlots);

  if (files.length === 0) {
    event.target.value = "";
    return;
  }

  const startIndex = productMediaFiles.value.length;
  productMediaFiles.value = [...productMediaFiles.value, ...files];
  productMediaPreviews.value = [
    ...productMediaPreviews.value,
    ...files.map((file, index) => ({
    id: `${file.name}-${file.lastModified}-${startIndex + index}`,
    name: file.name,
    type: file.type,
    mediaType: file.type.startsWith("video/") ? "video" : "image",
    url: URL.createObjectURL(file)
    }))
  ];
  event.target.value = "";
};

const removeProductMedia = (index) => {
  const preview = productMediaPreviews.value[index];

  if (preview?.url) {
    URL.revokeObjectURL(preview.url);
  }

  productMediaFiles.value = productMediaFiles.value.filter((_, itemIndex) => itemIndex !== index);
  productMediaPreviews.value = productMediaPreviews.value.filter((_, itemIndex) => itemIndex !== index);
};

const onProductImageChange = onProductMediaChange;
const clearProductImage = clearProductMedia;

const onProfileImageChange = (event) => {
  const file = event.target.files?.[0];
  profileImageFile.value = file || null;
  profileImagePreview.value = file ? URL.createObjectURL(file) : "";
};

const loadProducts = async () => {
  loading.value = true;

  try {
    products.value = await api.products({
      ...filters,
      freeOnly: filters.freeOnly ? "true" : ""
    });
    if (filters.search.trim()) {
      await trackProductEvent({
        query: filters.search.trim(),
        eventType: "search"
      });
      await loadSearchTrends();
    }
    markApiOnline();
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const loadSearchTrends = async () => {
  try {
    searchTrends.value = await api.productTrends();
  } catch (err) {
    searchTrends.value = [];
  }
};

const applySearchTrend = async (trend) => {
  filters.search = trend.query;
  filters.sort = "searched";
  await loadProducts();
};

const smartSearchWithAI = async () => {
  const queryText = filters.search.trim();
  const city = filters.city.trim();

  if (!queryText && !city) {
    setError("Escribe lo que quieres encontrar para ajustar la búsqueda.");
    return;
  }

  loading.value = true;

  try {
    const result = await api.aiSmartSearch({ queryText, city });
    smartSearchResult.value = result;

    filters.search = result.search || filters.search;
    filters.city = result.city || filters.city;
    filters.category = result.categorySlug || "";
    filters.minPrice = result.minPrice || "";
    filters.maxPrice = result.maxPrice || "";
    filters.freeOnly = Boolean(result.freeOnly);
    filters.sort = result.sort || "searched";

    await loadProducts();
    markApiOnline();
    setNotice(
      result.aiMode === "openai"
        ? "Sugerencias ajustó tu búsqueda."
        : "Sugerencias ajustó tu búsqueda."
    );
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const loadFavoriteIds = async () => {
  if (!isLoggedIn.value) {
    favoriteIds.value = [];
    return;
  }

  favoriteIds.value = (await api.favoriteIds()).map(String);
};

const loadFavorites = async () => {
  if (!isLoggedIn.value) return;
  favoriteProducts.value = await api.favorites();
};

const loadFollowedSellers = async () => {
  if (!isLoggedIn.value) {
    followedSellerIds.value = [];
    followedProducts.value = [];
    return;
  }

  followedSellerIds.value = (await api.followedSellerIds()).map(String);
  followedProducts.value = await api.feedFromFollowedSellers();
};

const toggleFollowSeller = async (sellerId) => {
  if (!requireLogin() || !sellerId || String(sellerId) === String(user.value?.id)) return;

  const sellerKey = String(sellerId);

  try {
    if (followedSellerIds.value.includes(sellerKey)) {
      await api.unfollowSeller(sellerId);
      followedSellerIds.value = followedSellerIds.value.filter((id) => id !== sellerKey);
      setNotice("Dejaste de seguir a esta vendedora.");
    } else {
      await api.followSeller(sellerId);
      followedSellerIds.value = [...followedSellerIds.value, sellerKey];
      setNotice("Ahora veras sus novedades.");
    }

    await loadFollowedSellers();
  } catch (err) {
    handleRequestError(err);
  }
};

const shareProduct = async (product) => {
  const url = `${window.location.origin}/?producto=${product.id}`;
  const text = `${product.title} en NextFem`;

  try {
    if (navigator.share) {
      await navigator.share({ title: text, text, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    setNotice("Enlace copiado para compartir.");
  } catch (err) {
    setError("No se pudo compartir el enlace.");
  }
};

const loadCompletedCourses = async () => {
  if (!isLoggedIn.value) {
    completedCourseUrls.value = [];
    return;
  }

  completedCourseUrls.value = await api.completedCourses();
};

const markCourseCompleted = async (course) => {
  if (!requireLogin()) return;

  try {
    const result = await api.completeCourse(course.url, courses.length);
    completedCourseUrls.value = result.completed;
    await loadMetrics();
    setNotice(
      result.completedAll
        ? "Cursos completados. Ganaste una insignia para tu perfil."
        : "Curso marcado como completado."
    );
  } catch (err) {
    handleRequestError(err);
  }
};

const toggleFavorite = async (product) => {
  if (!requireLogin()) return;

  const productId = String(product.id);
  const wasFavorite = favoriteIds.value.includes(productId);
  const previousFavoriteIds = [...favoriteIds.value];
  const previousFavoriteProducts = [...favoriteProducts.value];

  try {
    if (wasFavorite) {
      favoriteIds.value = favoriteIds.value.filter((id) => id !== productId);
      favoriteProducts.value = favoriteProducts.value.filter((item) => String(item.id) !== productId);
      await api.removeFavorite(product.id);
      setNotice("Producto quitado de favoritos.");
    } else {
      favoriteIds.value = [...favoriteIds.value, productId];
      if (!favoriteProducts.value.some((item) => String(item.id) === productId)) {
        favoriteProducts.value = [product, ...favoriteProducts.value];
      }
      await api.addFavorite(product.id);
      setNotice("Producto guardado para verlo después.");
    }

    products.value = products.value.map((item) =>
      String(item.id) === productId
        ? {
            ...item,
            favorite_count: Math.max(0, Number(item.favorite_count || 0) + (wasFavorite ? -1 : 1))
          }
        : item
    );
  } catch (err) {
    favoriteIds.value = previousFavoriteIds;
    favoriteProducts.value = previousFavoriteProducts;
    handleRequestError(err);
  }
};

const reportProduct = async (product) => {
  if (!requireLogin()) return;

  const details = window.prompt(
    `Cuéntanos qué pasa con "${product.title}". Puedes escribir una señal de alerta o dejarlo en blanco.`
  );

  if (details === null) return;

  try {
    await api.reportProduct(product.id, {
      reason: "revision",
      details
    });
    setNotice("Gracias. Revisaremos esta publicación para cuidar la comunidad.");
  } catch (err) {
    handleRequestError(err);
  }
};

const loadCategories = async () => {
  categories.value = await api.categories();
  markApiOnline();
};

const syncProfileForm = () => {
  if (!user.value) return;

  profileForm.name = user.value.name || "";
  profileForm.phone = user.value.phone || "";
  profileForm.city = user.value.city || "";
  profileForm.businessName = user.value.business_name || "";
  profileForm.bio = user.value.bio || "";
  profileForm.avatarUrl = user.value.avatar_url || "";
};

const loadMe = async () => {
  if (!storage.getToken()) return;

  try {
    user.value = await api.me();
    storage.setUser(user.value);
    syncProfileForm();
  } catch (err) {
    storage.clear();
    user.value = null;
    handleRequestError(err);
  }
};

const requireLogin = () => {
  if (isLoggedIn.value) return true;

  authMode.value = "login";
  activeView.value = "auth";
  setError("Inicia sesión para continuar.");

  if (routerInstance && routerInstance.currentRoute.value.name !== "auth") {
    routerInstance.push({ name: "auth" });
  }

  return false;
};

const goTo = async (view) => {
  notice.value = "";
  error.value = "";

  if (["publish", "profile", "chat"].includes(view) && !requireLogin()) {
    return false;
  }

  await navigateTo(view);

  if (view === "profile") {
    await loadMyProducts();
    await loadFavorites();
    await loadFollowedSellers();
    await loadMetrics();
    await loadSellerReviews();
  }

  if (view === "courses") {
    await loadCompletedCourses();
  }

  if (view === "chat") {
    selectedConversation.value = null;
    messages.value = [];
    await loadConversations(false);
  }

  return true;
};

const submitAuth = async () => {
  if (loading.value) return;

  loading.value = true;
  error.value = "";
  notice.value = "";

  try {
    const payload =
      authMode.value === "register"
        ? {
            name: authForm.name,
            email: authForm.email,
            password: authForm.password,
            phone: authForm.phone,
            city: authForm.city,
            businessName: authForm.businessName
          }
        : {
            email: authForm.email,
            password: authForm.password
          };

    const result =
      authMode.value === "register"
        ? await api.register(payload)
        : await api.login(payload);

    storage.setSession(result.token, result.user);
    user.value = result.user;
    syncProfileForm();
    markApiOnline();
    connectSocket();
    await loadConversations(false);
    await loadNotifications();
    await loadBlockedUsers();
    await loadFavoriteIds();
    await loadFollowedSellers();
    await loadCompletedCourses();
    await loadMetrics();
    await navigateTo("home");
    setNotice(result.message);
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const openRecovery = async () => {
  recoveryStep.value = "request";
  recoveryMethod.value = "email";
  recoveryForm.email = authForm.email || "";
  recoveryForm.phone = authForm.phone || "";
  recoveryForm.code = "";
  recoveryForm.password = "";
  recoveryForm.confirmPassword = "";
  await navigateTo("recovery");
};

const cancelRecovery = async () => {
  recoveryStep.value = "request";
  authMode.value = "login";
  await navigateTo("auth");
};

const requestRecoveryCode = async () => {
  if (loading.value) return;

  loading.value = true;
  error.value = "";
  notice.value = "";

  try {
    const result = await api.requestPasswordRecovery({
      method: recoveryMethod.value,
      email: recoveryForm.email,
      phone: recoveryForm.phone
    });
    recoveryStep.value = "verify";
    setNotice(result.message);
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const verifyRecoveryCode = async () => {
  if (loading.value) return;

  if (!recoveryForm.code.trim()) {
    setError("Escribe el código que recibiste.");
    return;
  }

  loading.value = true;
  error.value = "";
  notice.value = "";

  try {
    await api.verifyPasswordRecoveryCode({
      method: recoveryMethod.value,
      email: recoveryForm.email,
      phone: recoveryForm.phone,
      code: recoveryForm.code.trim()
    });
    recoveryStep.value = "password";
    setNotice("Código verificado. Escribe tu nueva contraseña.");
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const finishPasswordReset = async () => {
  if (loading.value) return;

  if (recoveryForm.password !== recoveryForm.confirmPassword) {
    setError("Las contraseñas no coinciden.");
    return;
  }

  loading.value = true;
  error.value = "";
  notice.value = "";

  try {
    const result = await api.updateRecoveredPassword(recoveryForm.password);
    await api.logout().catch(() => {});
    storage.clear();
    user.value = null;
    recoveryStep.value = "request";
    authMode.value = "login";
    authForm.email = recoveryForm.email;
    authForm.password = "";
    recoveryForm.code = "";
    recoveryForm.password = "";
    recoveryForm.confirmPassword = "";
    await navigateTo("auth");
    setNotice(result.message);
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const submitRecovery = async () => {
  if (recoveryStep.value === "request") {
    await requestRecoveryCode();
    return;
  }

  if (recoveryStep.value === "verify") {
    await verifyRecoveryCode();
    return;
  }

  await finishPasswordReset();
};

const requestLogout = () => {
  showLogoutConfirm.value = true;
};

const cancelLogout = () => {
  showLogoutConfirm.value = false;
};

const confirmLogout = async () => {
  showLogoutConfirm.value = false;
  try {
    await api.logout();
  } catch (err) {
    // If the remote session is already gone, the local cleanup still matters.
  }
  storage.clear();
  user.value = null;
  myProducts.value = [];
  favoriteIds.value = [];
  favoriteProducts.value = [];
  metrics.value = null;
  sellerReviews.value = [];
  conversations.value = [];
  notifications.value = [];
  notificationPanelOpen.value = false;
  blockedUsers.value = [];
  typingUsers.value = {};
  messages.value = [];
  selectedConversation.value = null;
  quickReplies.value = [];
  safetyNotice.value = "";
  conversationSummary.value = null;
  clearProductMedia();
  clearChatMedia();
  clearLocationDraft();
  clearUndoToast();
  disconnectSocket();
  await navigateTo("home");
  setNotice("Sesion cerrada. Tu perfil estara listo cuando vuelvas.");
};

const saveProfile = async () => {
  if (!requireLogin()) return;
  loading.value = true;

  try {
    let avatarUrl = profileForm.avatarUrl;

    if (profileImageFile.value) {
      avatarUrl = await uploadSelectedImage(profileImageFile.value);
      profileForm.avatarUrl = avatarUrl;
    }

    const result = await api.updateProfile({ ...profileForm, avatarUrl });
    user.value = result.user;
    storage.setUser(result.user);
    profileImageFile.value = null;
    profileImagePreview.value = "";
    setNotice(result.message);
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const createProduct = async () => {
  if (!requireLogin()) return;
  loading.value = true;

  try {
    const media = await Promise.all(
      productMediaFiles.value.map(async (file, index) => ({
        ...(await uploadProductMediaFile(file)),
        sortOrder: index,
        isPrimary: index === 0
      }))
    );

    const result = await api.createProduct({
      title: productForm.title,
      description: productForm.description,
      categoryId: productForm.categoryId || null,
      price: Number(productForm.price || 0),
      isFree: Number(productForm.price || 0) === 0,
      city: productForm.city,
      hashtags: parseHashtags(productForm.hashtags),
      media
    });

    const createdProduct = {
      ...result.product,
      media: media.map((item, index) => ({
        ...item,
        sortOrder: index,
        isPrimary: index === 0
      })),
      category_name:
        categories.value.find((category) => String(category.id) === String(productForm.categoryId))?.name ||
        "General",
      seller_name: user.value?.business_name || user.value?.name,
      seller_business_name: user.value?.business_name,
      seller_avatar_url: user.value?.avatar_url,
      seller_rating: metrics.value?.average_rating || 0,
      favorite_count: 0
    };

    products.value = [createdProduct, ...products.value];
    myProducts.value = [createdProduct, ...myProducts.value];

    productForm.title = "";
    productForm.description = "";
    productForm.categoryId = "";
    productForm.price = 0;
    productForm.city = user.value?.city || "";
    productForm.hashtags = "";
    clearProductMedia();

    setNotice("Publicación creada correctamente.");
    await navigateTo("profile");
    window.setTimeout(() => {
      Promise.all([loadProducts(), loadMyProducts(), loadMetrics()]).catch(() => {});
    }, 1200);
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const loadMyProducts = async () => {
  if (!isLoggedIn.value) return;
  myProducts.value = await api.myProducts();
};

const loadMetrics = async () => {
  if (!isLoggedIn.value) {
    metrics.value = null;
    return;
  }

  metrics.value = await api.myMetrics();
};

const loadSellerReviews = async (sellerId = user.value?.id) => {
  if (!sellerId) return;
  sellerReviews.value = await api.sellerReviews(sellerId);
};

const saveReview = async () => {
  if (!requireLogin() || !reviewForm.sellerId) return;

  try {
    const result = await api.createSellerReview(reviewForm.sellerId, {
      rating: Number(reviewForm.rating || 5),
      comment: reviewForm.comment,
      productId: reviewForm.productId || null
    });
    reviewForm.comment = "";
    setNotice(result.message);
    await loadSellerReviews(reviewForm.sellerId);
    await loadMetrics();
    await loadProducts();
  } catch (err) {
    handleRequestError(err);
  }
};

const generateProductWithAI = async () => {
  if (!requireLogin()) return;

  try {
    const result = await api.aiProductCopy({
      title: productForm.title,
      categoryId: productForm.categoryId,
      city: productForm.city,
      price: productForm.price
    });

    assistantResult.value = result;

    if (!productForm.title && result.suggestedTitle) {
      productForm.title = result.suggestedTitle;
    }

    productForm.description = result.description;

    if (!productForm.categoryId && result.categoryId) {
      productForm.categoryId = result.categoryId;
    }

    if (!Number(productForm.price || 0)) {
      productForm.price = result.suggestedPrice;
    }

    if (result.hashtags?.length) {
      productForm.hashtags = result.hashtags.join(" ");
    }

    setNotice(
      result.aiMode === "openai"
        ? "Sugerencias preparó tu publicación."
        : "Sugerencias preparó tu publicación."
    );
  } catch (err) {
    handleRequestError(err);
  }
};

const deleteProduct = async (product) => {
  if (!requireLogin()) return;

  const ok = window.confirm(`Eliminar "${product.title}"?`);
  if (!ok) return;

  try {
    await api.deleteProduct(product.id);
    setNotice("Publicación eliminada.");
    await loadProducts();
    await loadMyProducts();
  } catch (err) {
    handleRequestError(err);
  }
};

const showSimilar = async (product) => {
  try {
    await trackProductEvent({
      productId: product.id,
      query: filters.search,
      eventType: "similar"
    });
    similarProducts.value = await api.similarProducts(product.id);
    markApiOnline();
    setNotice(`Productos similares a "${product.title}".`);
  } catch (err) {
    handleRequestError(err);
  }
};

const openContact = async (product) => {
  if (!requireLogin()) return;

  contactProduct.value = product;
  contactSeller.value = null;
  chatDraft.initialMessage = `Hola, me interesa "${product.title}". Me gustaría saber más.`;
  await trackProductEvent({
    productId: product.id,
    query: filters.search,
    eventType: "contact"
  });
  await navigateTo("chat");
};

const openSellerContact = async (seller) => {
  if (!requireLogin()) return;

  contactProduct.value = null;
  contactSeller.value = seller;
  chatDraft.initialMessage = "";
  await navigateTo("chat");
};

const loadConversations = async (autoSelect = false) => {
  if (!isLoggedIn.value) return;

  conversations.value = await api.conversations();
  markApiOnline();

  if (autoSelect && !selectedConversation.value && conversations.value.length > 0) {
    await selectConversation(conversations.value[0]);
  }
};

const loadNotifications = async () => {
  if (!isLoggedIn.value) {
    notifications.value = [];
    return;
  }

  try {
    notifications.value = await api.notifications();
  } catch (err) {
    notifications.value = [];
  }
};

const loadBlockedUsers = async () => {
  if (!isLoggedIn.value) {
    blockedUsers.value = [];
    return;
  }

  try {
    blockedUsers.value = await api.blockedUsers();
  } catch (err) {
    blockedUsers.value = [];
  }
};

const toggleNotificationsPanel = async () => {
  if (!requireLogin()) return;

  notificationPanelOpen.value = !notificationPanelOpen.value;

  if (notificationPanelOpen.value) {
    await loadNotifications();
  }
};

const closeNotificationsPanel = () => {
  notificationPanelOpen.value = false;
};

const markNotificationsRead = async () => {
  if (!isLoggedIn.value) return;

  try {
    await api.markNotificationsRead();
    notifications.value = notifications.value.map((notification) => ({
      ...notification,
      is_read: true
    }));
  } catch (err) {
    handleRequestError(err);
  }
};

const openNotification = async (notification) => {
  if (!notification) return;

  try {
    if (!notification.is_read) {
      await api.markNotificationRead(notification.id);
      notifications.value = notifications.value.map((item) =>
        String(item.id) === String(notification.id)
          ? { ...item, is_read: true }
          : item
      );
    }

    notificationPanelOpen.value = false;
    await goTo("chat");

    const conversation = conversations.value.find(
      (item) => String(item.id) === String(notification.conversation_id)
    );

    if (conversation) {
      await selectConversation(conversation);
    }
  } catch (err) {
    handleRequestError(err);
  }
};

const requestBrowserNotifications = async () => {
  if (!requireLogin()) return;

  if (typeof window === "undefined" || !("Notification" in window)) {
    setError("Este navegador no permite notificaciones.");
    return;
  }

  if (window.Notification.permission === "granted") {
    setNotice("Las notificaciones ya estan activas.");
    return;
  }

  if (window.Notification.permission === "denied") {
    setError("Las notificaciones estan bloqueadas en el navegador.");
    return;
  }

  const permission = await window.Notification.requestPermission();

  if (permission === "granted") {
    setNotice("Notificaciones activadas.");
  }
};

const blockSelectedConversationUser = async () => {
  if (!selectedConversation.value?.other_user_id) return;

  const ok = window.confirm(
    `Bloquear a ${selectedConversation.value.other_user_name}? No podra enviarte mensajes.`
  );

  if (!ok) return;

  try {
    const result = await api.blockUser(selectedConversation.value.other_user_id, {
      reason: "seguridad",
      details: "Bloqueada desde el chat"
    });
    await loadBlockedUsers();
    setNotice(result.message);
  } catch (err) {
    handleRequestError(err);
  }
};

const unblockSelectedConversationUser = async () => {
  if (!selectedConversation.value?.other_user_id) return;

  try {
    const result = await api.unblockUser(selectedConversation.value.other_user_id);
    await loadBlockedUsers();
    setNotice(result.message);
  } catch (err) {
    handleRequestError(err);
  }
};

const startConversation = async () => {
  if (!contactProduct.value && !contactSeller.value) return;

  try {
    const result = await api.startConversation({
      productId: contactProduct.value?.id,
      sellerId: contactSeller.value?.id,
      initialMessage: chatDraft.initialMessage
    });

    contactProduct.value = null;
    contactSeller.value = null;
    chatDraft.initialMessage = "";
    selectedConversation.value = result.conversation;
    setNotice("Conversación abierta.");
    await selectConversation(result.conversation);
    await loadConversations(false);
  } catch (err) {
    handleRequestError(err);
  }
};

const selectConversation = async (conversation) => {
  selectedConversation.value = conversation;
  conversationSummary.value = null;
  connectSocket();
  joinedConversationId = conversation.id;

  messages.value = await api.messages(conversation.id);
  conversations.value = conversations.value.map((item) =>
    item.id === conversation.id ? { ...item, unread_count: 0 } : item
  );
  await loadQuickReplies();
  markApiOnline();
};

const closeConversation = () => {
  joinedConversationId = null;
  selectedConversation.value = null;
  contactProduct.value = null;
  contactSeller.value = null;
  messages.value = [];
  typingUsers.value = {};
  quickReplies.value = [];
  safetyNotice.value = "";
  conversationSummary.value = null;
  clearChatMedia();
  clearLocationDraft();
};

const restoreDeletedMessage = async (conversationId, messageId, scope) => {
  await api.restoreMessage(conversationId, messageId, scope);

  if (
    selectedConversation.value &&
    String(selectedConversation.value.id) === String(conversationId)
  ) {
    messages.value = await api.messages(conversationId);
  }

  await loadConversations(false);
  setNotice("Eliminación deshecha.");
};

const deleteMessage = async (message, scope = "me") => {
  if (!selectedConversation.value || !message?.id) return;

  const conversationId = selectedConversation.value.id;
  const previousMessages = messages.value;

  try {
    if (scope === "everyone") {
      messages.value = messages.value.map((item) =>
        String(item.id) === String(message.id)
          ? {
              ...item,
              body: "Mensaje eliminado para todos",
              media_url: null,
              media_mime: null,
              media_name: null,
              is_deleted_for_everyone: true,
              deleted_for_everyone_at: new Date().toISOString()
            }
          : item
      );
    } else {
      messages.value = messages.value.filter(
        (item) => String(item.id) !== String(message.id)
      );
    }

    await api.deleteMessage(conversationId, message.id, scope);
    await loadConversations(false);
    showUndoToast(
      scope === "everyone" ? "Mensaje eliminado para todos" : "Mensaje eliminado para mi",
      () => restoreDeletedMessage(conversationId, message.id, scope)
    );
  } catch (err) {
    messages.value = previousMessages;
    handleRequestError(err);
  }
};

const loadQuickReplies = async () => {
  quickReplies.value = [];
};

const summarizeConversationWithAI = async () => {
  if (!selectedConversation.value) return;

  try {
    const result = await api.aiConversationSummary({
      productTitle: selectedConversation.value.product_title,
      messages: messages.value.map((message) => ({
        sender: String(message.sender_id) === String(user.value?.id)
          ? "yo"
          : selectedConversation.value.other_user_name || "otra usuaria",
        body:
          message.is_deleted_for_everyone
            ? ""
            : message.body || message.media_name || message.location_label || "",
        type: message.message_type || "text"
      }))
    });

    conversationSummary.value = result;

  } catch (err) {
    handleRequestError(err);
  }
};

const applyQuickReply = (reply) => {
  chatDraft.message = reply;
  emitTyping();
};

const emitTyping = () => {
  if (!selectedConversation.value) return;

  if (typingTimer) {
    window.clearTimeout(typingTimer);
  }

  typingTimer = window.setTimeout(() => {
    typingTimer = null;
  }, 1500);
};

const getConversationReceiverId = () => {
  if (!selectedConversation.value || !user.value?.id) return null;

  return String(selectedConversation.value.buyer_id) === String(user.value.id)
    ? selectedConversation.value.seller_id
    : selectedConversation.value.buyer_id;
};

const touchConversationPreview = ({ body, mediaName, locationLabel, createdAt }) => {
  if (!selectedConversation.value) return;

  const conversationId = selectedConversation.value.id;
  const preview = body || mediaName || locationLabel || "Contenido multimedia";

  selectedConversation.value = {
    ...selectedConversation.value,
    last_message: preview,
    updated_at: createdAt
  };

  conversations.value = conversations.value
    .map((conversation) =>
      String(conversation.id) === String(conversationId)
        ? {
            ...conversation,
            last_message: preview,
            last_message_created_at: createdAt,
            updated_at: createdAt
          }
        : conversation
    )
    .sort(
      (a, b) =>
        new Date(b.last_message_created_at || b.updated_at || 0) -
        new Date(a.last_message_created_at || a.updated_at || 0)
    );
};

const queueChatRefresh = () => {
  window.setTimeout(() => {
    if (isLoggedIn.value) {
      loadConversations(false).catch(() => {});
    }
  }, 400);
};

const makeLocalMessage = (payload) => {
  const createdAt = new Date().toISOString();

  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    conversation_id: selectedConversation.value?.id,
    sender_id: user.value?.id,
    sender_name: user.value?.business_name || user.value?.name || "Tu",
    body: payload.body || "",
    message_type: payload.messageType || "text",
    media_url: payload.mediaUrl || null,
    media_mime: payload.mediaMime || null,
    media_name: payload.mediaName || null,
    latitude: payload.latitude || payload.locationLat || null,
    longitude: payload.longitude || payload.locationLng || null,
    location_label: payload.locationLabel || null,
    location_mode:
      payload.locationMode ||
      (payload.locationLive === true ? "realtime" : payload.locationLat ? "fixed" : null),
    read_at: null,
    created_at: createdAt,
    is_local: true
  };
};

const settleLocalMessage = (localId, serverMessage) => {
  const serverExists = messages.value.some((message) => String(message.id) === String(serverMessage.id));
  messages.value = messages.value.filter((message) => String(message.id) !== String(localId));

  if (!serverExists) {
    messages.value = [...messages.value, serverMessage];
  }
};

const sendMediaMessage = async (file, caption = "") => {
  if (!selectedConversation.value || !file) return;

  const localUrl = URL.createObjectURL(file);
  const messageType = getMessageTypeForFile(file);
  const body = caption || chatDraft.message;
  const localMessage = makeLocalMessage({
    body,
    messageType,
    mediaUrl: localUrl,
    mediaMime: file.type,
    mediaName: file.name
  });

  messages.value = [...messages.value, localMessage];
  touchConversationPreview({
    body,
    mediaName: file.name,
    createdAt: localMessage.created_at
  });
  clearChatMedia();
  chatDraft.message = "";

  try {
    const uploadFile = file.type.startsWith("image/") ? await compressImage(file) : file;
    const result = await api.uploadFile(uploadFile);
    const sent = await api.sendMessage(selectedConversation.value.id, {
      body,
      messageType,
      mediaUrl: result.imageUrl,
      mediaMime: uploadFile.type,
      mediaName: uploadFile.name,
      receiverId: getConversationReceiverId(),
      productId: selectedConversation.value.product_id
    });
    settleLocalMessage(localMessage.id, sent.messageData);
    URL.revokeObjectURL(localUrl);
    queueChatRefresh();
  } catch (err) {
    messages.value = messages.value.filter((message) => String(message.id) !== String(localMessage.id));
    URL.revokeObjectURL(localUrl);
    handleRequestError(err);
  }
};

const sendMessage = async () => {
  if (!selectedConversation.value) return;

  if (chatMediaFile.value) {
    await sendMediaMessage(chatMediaFile.value);
    return;
  }

  if (chatLocationDraft.value) {
    const payload = {
      body: chatDraft.message,
      messageType: "location",
      ...chatLocationDraft.value
    };
    const localMessage = makeLocalMessage(payload);
    messages.value = [...messages.value, localMessage];
    touchConversationPreview({
      body: payload.body,
      locationLabel: payload.locationLabel,
      createdAt: localMessage.created_at
    });
    chatDraft.message = "";
    clearLocationDraft();

    try {
      const result = await api.sendMessage(selectedConversation.value.id, {
        ...payload,
        receiverId: getConversationReceiverId(),
        productId: selectedConversation.value.product_id
      });
      settleLocalMessage(localMessage.id, result.messageData);
      queueChatRefresh();
    } catch (err) {
      messages.value = messages.value.filter((message) => String(message.id) !== String(localMessage.id));
      handleRequestError(err);
    }
    return;
  }

  if (!chatDraft.message.trim()) return;

  const body = chatDraft.message.trim();
  const localMessage = makeLocalMessage({ body });
  messages.value = [...messages.value, localMessage];
  touchConversationPreview({
    body,
    createdAt: localMessage.created_at
  });
  chatDraft.message = "";

  try {
    const result = await api.sendMessage(
      selectedConversation.value.id,
      {
        body,
        receiverId: getConversationReceiverId(),
        productId: selectedConversation.value.product_id
      }
    );
    settleLocalMessage(localMessage.id, result.messageData);
    queueChatRefresh();
  } catch (err) {
    messages.value = messages.value.filter((message) => String(message.id) !== String(localMessage.id));
    handleRequestError(err);
  }
};

const refreshChatState = async () => {
  if (!isLoggedIn.value) return;

  try {
    if (activeView.value === "chat" && selectedConversation.value) {
      messages.value = await api.messages(selectedConversation.value.id);
    }

    await loadConversations(false);
    await loadNotifications();
    await loadBlockedUsers();
  } catch (err) {
    // Silent refresh should not interrupt the user while she is reading.
  }
};

const initializeApp = async () => {
  if (initialized.value) return;
  initialized.value = true;

  try {
    await checkApi();
    await Promise.all([loadCategories(), loadProducts(), loadSearchTrends(), loadMe()]);
    connectSocket();
    await loadConversations(false);
    await loadNotifications();
    await loadBlockedUsers();
    await loadFavoriteIds();
    await loadFollowedSellers();
    await loadCompletedCourses();
    await loadMetrics();
    productForm.city = user.value?.city || "";
    refreshTimer = window.setInterval(refreshChatState, 30000);
  } catch (err) {
    handleRequestError(err);
  }
};

const teardownApp = () => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  disconnectSocket();
  initialized.value = false;
};

export const useMarketplace = () => ({
  activeView,
  authMode,
  recoveryStep,
  recoveryMethod,
  loading,
  notice,
  error,
  apiStatus,
  productMediaFiles,
  productMediaPreviews,
  profileImageFile,
  profileImagePreview,
  showLogoutConfirm,
  user,
  categories,
  products,
  myProducts,
  favoriteIds,
  favoriteProducts,
  sellerReviews,
  metrics,
  followedSellerIds,
  followedProducts,
  completedCourseUrls,
  assistantResult,
  smartSearchResult,
  conversationSummary,
  quickReplies,
  safetyNotice,
  searchTrends,
  selectedImage,
  chatMediaFile,
  chatMediaPreview,
  chatLocationDraft,
  isRecordingAudio,
  audioRecorderSupported,
  similarProducts,
  conversations,
  messages,
  selectedConversation,
  contactProduct,
  contactSeller,
  notifications,
  notificationPanelOpen,
  blockedUsers,
  typingUsers,
  undoToast,
  filters,
  authForm,
  recoveryForm,
  profileForm,
  productForm,
  chatDraft,
  reviewForm,
  courses,
  isLoggedIn,
  visibleProducts,
  recentProducts,
  sellerBadges,
  selectedCategoryName,
  unreadMessages,
  unreadNotifications,
  notificationCount,
  selectedConversationBlocked,
  selectedTypingNames,
  authButtonText,
  recoveryButtonText,
  setRouter,
  syncRouteView,
  goTo,
  requireLogin,
  requestLogout,
  cancelLogout,
  confirmLogout,
  money,
  categoryInitial,
  getProductMedia,
  getPrimaryMedia,
  isVideoMedia,
  onProductImageChange,
  clearProductImage,
  onProductMediaChange,
  clearProductMedia,
  removeProductMedia,
  onProfileImageChange,
  loadProducts,
  loadCategories,
  loadMe,
  loadMyProducts,
  loadFavoriteIds,
  loadFavorites,
  loadFollowedSellers,
  toggleFollowSeller,
  shareProduct,
  loadCompletedCourses,
  markCourseCompleted,
  toggleFavorite,
  reportProduct,
  loadMetrics,
  loadSellerReviews,
  saveReview,
  generateProductWithAI,
  submitAuth,
  openRecovery,
  cancelRecovery,
  submitRecovery,
  saveProfile,
  createProduct,
  deleteProduct,
  showSimilar,
  openContact,
  openSellerContact,
  loadConversations,
  loadNotifications,
  loadBlockedUsers,
  toggleNotificationsPanel,
  closeNotificationsPanel,
  markNotificationsRead,
  openNotification,
  requestBrowserNotifications,
  blockSelectedConversationUser,
  unblockSelectedConversationUser,
  startConversation,
  selectConversation,
  closeConversation,
  loadQuickReplies,
  applyQuickReply,
  emitTyping,
  onChatMediaChange,
  clearChatMedia,
  prepareLocationMessage,
  clearLocationDraft,
  startAudioRecording,
  stopAudioRecording,
  openProductImage,
  closeProductImage,
  loadSearchTrends,
  applySearchTrend,
  smartSearchWithAI,
  trackProductEvent,
  deleteMessage,
  summarizeConversationWithAI,
  undoLastAction,
  clearUndoToast,
  sendMessage,
  initializeApp,
  teardownApp
});
