<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  BriefcaseBusiness,
  Camera,
  Check,
  CheckCheck,
  ExternalLink,
  GraduationCap,
  ImagePlus,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  Store,
  Trash2,
  UserRound
} from "lucide-vue-next";
import { api, storage } from "./services/api";

const activeView = ref("home");
const authMode = ref("login");
const loading = ref(false);
const notice = ref("");
const error = ref("");
const apiStatus = ref("checking");
const productImageFile = ref(null);
const productImagePreview = ref("");
const profileImageFile = ref(null);
const profileImagePreview = ref("");
let refreshTimer = null;

const user = ref(storage.getUser());
const categories = ref([]);
const products = ref([]);
const myProducts = ref([]);
const similarProducts = ref([]);
const conversations = ref([]);
const messages = ref([]);
const selectedConversation = ref(null);
const contactProduct = ref(null);

const filters = reactive({
  search: "",
  category: "",
  city: ""
});

const authForm = reactive({
  name: "",
  email: "",
  password: "",
  phone: "",
  city: "",
  businessName: ""
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
  imageUrl: ""
});

const chatDraft = reactive({
  initialMessage: "",
  message: ""
});

const courses = [
  {
    title: "Emprendimiento",
    provider: "GCFGlobal",
    url: "https://edu.gcfglobal.org/es/emprendimiento/"
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
const featuredProducts = computed(() => products.value.slice(0, 8));
const selectedCategoryName = computed(() => {
  const found = categories.value.find((category) => category.slug === filters.category);
  return found ? found.name : "Todas";
});
const unreadMessages = computed(() =>
  conversations.value.reduce((total, conversation) => {
    return total + Number(conversation.unread_count || 0);
  }, 0)
);
const authButtonText = computed(() => {
  if (loading.value) {
    return authMode.value === "register" ? "Creando cuenta..." : "Entrando...";
  }

  return authMode.value === "register" ? "Crear cuenta" : "Entrar";
});

const setNotice = (message) => {
  notice.value = message;
  error.value = "";
};

const setError = (message) => {
  error.value = message;
  notice.value = "";
};

const handleRequestError = (err) => {
  const message = err?.message || "No se pudo completar la solicitud.";

  if (
    message.includes("backend") ||
    message.includes("localhost:3000") ||
    message.includes("tardo")
  ) {
    apiStatus.value = "offline";
  }

  setError(message);
};

const markApiOnline = () => {
  apiStatus.value = "online";
};

const checkApi = async (showMessage = false) => {
  apiStatus.value = "checking";

  try {
    await api.health();
    markApiOnline();

    if (showMessage) {
      setNotice("Backend conectado correctamente.");
    }
  } catch (err) {
    handleRequestError(err);
  }
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

const categoryInitial = (product) => {
  return (product.category_name || product.title || "N").slice(0, 1).toUpperCase();
};

const uploadSelectedImage = async (file) => {
  if (!file) return "";

  const result = await api.uploadImage(file);
  markApiOnline();
  return result.imageUrl;
};

const onProductImageChange = (event) => {
  const file = event.target.files?.[0];
  productImageFile.value = file || null;
  productImagePreview.value = file ? URL.createObjectURL(file) : "";
};

const clearProductImage = () => {
  productImageFile.value = null;
  productImagePreview.value = "";
};

const onProfileImageChange = (event) => {
  const file = event.target.files?.[0];
  profileImageFile.value = file || null;
  profileImagePreview.value = file ? URL.createObjectURL(file) : "";
};

const loadProducts = async () => {
  loading.value = true;

  try {
    products.value = await api.products(filters);
    markApiOnline();
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  categories.value = await api.categories();
  markApiOnline();
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

const syncProfileForm = () => {
  if (!user.value) return;

  profileForm.name = user.value.name || "";
  profileForm.phone = user.value.phone || "";
  profileForm.city = user.value.city || "";
  profileForm.businessName = user.value.business_name || "";
  profileForm.bio = user.value.bio || "";
  profileForm.avatarUrl = user.value.avatar_url || "";
};

const goTo = async (view) => {
  activeView.value = view;
  notice.value = "";
  error.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (view === "profile") {
    if (!requireLogin()) return;
    await loadMyProducts();
  }

  if (view === "chat") {
    if (!requireLogin()) return;
    await loadConversations(true);
  }
};

const requireLogin = () => {
  if (isLoggedIn.value) return true;

  authMode.value = "login";
  activeView.value = "auth";
  setError("Inicia sesion para continuar.");
  return false;
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
    setNotice(result.message);
    await loadConversations(false);
    activeView.value = "home";
  } catch (err) {
    handleRequestError(err);
  } finally {
    loading.value = false;
  }
};

const logout = () => {
  storage.clear();
  user.value = null;
  myProducts.value = [];
  conversations.value = [];
  messages.value = [];
  selectedConversation.value = null;
  activeView.value = "home";
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
    let imageUrl = productForm.imageUrl;

    if (productImageFile.value) {
      imageUrl = await uploadSelectedImage(productImageFile.value);
    }

    await api.createProduct({
      title: productForm.title,
      description: productForm.description,
      categoryId: productForm.categoryId || null,
      price: Number(productForm.price || 0),
      isFree: Number(productForm.price || 0) === 0,
      city: productForm.city,
      imageUrl
    });

    productForm.title = "";
    productForm.description = "";
    productForm.categoryId = "";
    productForm.price = 0;
    productForm.city = user.value?.city || "";
    productForm.imageUrl = "";
    clearProductImage();

    setNotice("Publicacion creada correctamente.");
    await loadProducts();
    await loadMyProducts();
    activeView.value = "profile";
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

const deleteProduct = async (product) => {
  if (!requireLogin()) return;

  const ok = window.confirm(`Eliminar "${product.title}"?`);
  if (!ok) return;

  try {
    await api.deleteProduct(product.id);
    setNotice("Publicacion eliminada.");
    await loadProducts();
    await loadMyProducts();
  } catch (err) {
    handleRequestError(err);
  }
};

const showSimilar = async (product) => {
  try {
    similarProducts.value = await api.similarProducts(product.id);
    markApiOnline();
    setNotice(`Productos similares a "${product.title}".`);
  } catch (err) {
    handleRequestError(err);
  }
};

const openContact = (product) => {
  if (!requireLogin()) return;

  contactProduct.value = product;
  chatDraft.initialMessage = `Hola, me interesa "${product.title}". Me gustaria saber mas.`;
  activeView.value = "chat";
};

const loadConversations = async (autoSelect = false) => {
  if (!isLoggedIn.value) return;

  conversations.value = await api.conversations();
  markApiOnline();

  if (autoSelect && !selectedConversation.value && conversations.value.length > 0) {
    await selectConversation(conversations.value[0]);
  }
};

const startConversation = async () => {
  if (!contactProduct.value) return;

  try {
    const result = await api.startConversation({
      productId: contactProduct.value.id,
      initialMessage: chatDraft.initialMessage
    });

    contactProduct.value = null;
    chatDraft.initialMessage = "";
    selectedConversation.value = result.conversation;
    setNotice("Conversacion abierta.");
    await loadConversations();
    await selectConversation(result.conversation);
  } catch (err) {
    handleRequestError(err);
  }
};

const selectConversation = async (conversation) => {
  selectedConversation.value = conversation;
  messages.value = await api.messages(conversation.id);
  conversations.value = conversations.value.map((item) =>
    item.id === conversation.id ? { ...item, unread_count: 0 } : item
  );
  markApiOnline();
};

const sendMessage = async () => {
  if (!selectedConversation.value || !chatDraft.message.trim()) return;

  try {
    await api.sendMessage(selectedConversation.value.id, chatDraft.message);
    chatDraft.message = "";
    await selectConversation(selectedConversation.value);
    await loadConversations(false);
  } catch (err) {
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
  } catch (err) {
    // Silent refresh should not interrupt the user while she is reading.
  }
};

onMounted(async () => {
  try {
    await checkApi();
    await Promise.all([loadCategories(), loadProducts(), loadMe()]);
    await loadConversations(false);
    productForm.city = user.value?.city || "";
    refreshTimer = window.setInterval(refreshChatState, 10000);
  } catch (err) {
    handleRequestError(err);
  }
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <button class="brand" type="button" @click="goTo('home')">
        <span class="brand-mark logo-mark">
          <img src="/nextfem-logo.svg" alt="" />
        </span>
        <span>
          <strong>NextFem</strong>
          <small>Marketplace de emprendedoras</small>
        </span>
      </button>

      <nav class="nav-actions">
        <button :class="{ active: activeView === 'home' }" type="button" @click="goTo('home')">
          Inicio
        </button>
        <button type="button" @click="goTo('publish')">
          <Plus :size="18" />
          Publicar
        </button>
        <button class="chat-nav-button" type="button" @click="goTo('chat')">
          <MessageCircle :size="18" />
          Chat
          <span v-if="unreadMessages > 0" class="nav-badge">{{ unreadMessages }}</span>
        </button>
        <button type="button" @click="goTo('courses')">
          <GraduationCap :size="18" />
          Aprender
        </button>
        <button v-if="isLoggedIn" type="button" @click="goTo('profile')">
          <UserRound :size="18" />
          Perfil
        </button>
        <button v-if="!isLoggedIn" class="primary" type="button" @click="goTo('auth')">
          Entrar
        </button>
        <button v-else class="icon-button" title="Cerrar sesion" type="button" @click="logout">
          <LogOut :size="18" />
        </button>
      </nav>
    </header>

    <main>
      <section v-if="notice || error" class="status-band" :class="{ error: error }">
        {{ error || notice }}
      </section>

      <section v-if="activeView === 'home'" class="home-layout">
        <div class="intro-band">
          <div class="intro-copy">
            <p class="eyebrow">Sin comisiones de plataforma</p>
            <h1>Un espacio para vender, conectar y crecer con otras mujeres.</h1>
            <p>
              Publica productos, servicios o apoyos comunitarios. La conversacion
              sucede directo entre usuarias y tu perfil queda guardado.
            </p>
            <div class="intro-actions">
              <button class="hero-button" type="button" @click="goTo('publish')">
                <Plus :size="18" />
                Publicar
              </button>
              <button class="hero-button ghost" type="button" @click="goTo('auth')">
                <UserRound :size="18" />
                Crear cuenta
              </button>
            </div>
          </div>
          <div class="intro-visual" aria-hidden="true">
            <img src="/marketplace-hero.svg" alt="" />
            <div class="visual-note">
              <BriefcaseBusiness :size="18" />
              <span>Emprendimientos locales, servicios y apoyos</span>
            </div>
          </div>
        </div>

        <div class="toolbar-band">
          <label class="search-box">
            <Search :size="20" />
            <input
              v-model="filters.search"
              type="search"
              placeholder="Buscar ropa, comida, servicios..."
              @keyup.enter="loadProducts"
            />
          </label>
          <input v-model="filters.city" class="city-input" type="text" placeholder="Ciudad" />
          <button class="primary" type="button" @click="loadProducts">Buscar</button>
        </div>

        <div class="market-grid">
          <aside class="category-rail">
            <button
              class="category-pill"
              :class="{ active: filters.category === '' }"
              type="button"
              @click="filters.category = ''; loadProducts()"
            >
              Todas
            </button>
            <button
              v-for="category in categories"
              :key="category.id"
              class="category-pill"
              :class="{ active: filters.category === category.slug }"
              type="button"
              @click="filters.category = category.slug; loadProducts()"
            >
              {{ category.name }}
            </button>
          </aside>

          <section class="product-area">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Categoria</p>
                <h2>{{ selectedCategoryName }}</h2>
              </div>
              <span>{{ products.length }} publicaciones</span>
            </div>

            <div v-if="loading" class="empty-state">Cargando publicaciones...</div>
            <div v-else-if="featuredProducts.length === 0" class="empty-state">
              Aun no hay publicaciones para esta busqueda.
            </div>
            <div v-else class="product-grid">
              <article v-for="product in featuredProducts" :key="product.id" class="product-card">
                <div class="product-media">
                  <img v-if="product.image_url" :src="product.image_url" :alt="product.title" />
                  <span v-else>{{ categoryInitial(product) }}</span>
                </div>
                <div class="product-body">
                  <span class="tag">{{ product.category_name || "General" }}</span>
                  <h3>{{ product.title }}</h3>
                  <p>{{ product.description }}</p>
                  <div class="product-meta">
                    <strong>{{ money(product.price) }}</strong>
                    <span>{{ product.city || "Sin ciudad" }}</span>
                  </div>
                  <div class="seller-line">
                    <Store :size="16" />
                    {{ product.seller_name }}
                  </div>
                </div>
                <footer class="card-actions">
                  <button type="button" @click="showSimilar(product)">Similares</button>
                  <button class="primary subtle" type="button" @click="openContact(product)">
                    <MessageCircle :size="16" />
                    Preguntar
                  </button>
                </footer>
              </article>
            </div>
          </section>
        </div>

        <section v-if="similarProducts.length" class="similar-band">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Relacionados</p>
              <h2>Productos similares</h2>
            </div>
            <button type="button" @click="similarProducts = []">Cerrar</button>
          </div>
          <div class="compact-list">
            <article v-for="product in similarProducts" :key="product.id" class="compact-item">
              <strong>{{ product.title }}</strong>
              <span>{{ product.category_name }} - {{ product.city || "Sin ciudad" }}</span>
              <button type="button" @click="openContact(product)">Mensaje</button>
            </article>
          </div>
        </section>
      </section>

      <section v-if="activeView === 'auth'" class="form-band auth-band">
        <div class="form-copy">
          <p class="eyebrow">{{ authMode === "register" ? "Crear cuenta" : "Bienvenida" }}</p>
          <h1>{{ authMode === "register" ? "Tu perfil emprendedor empieza aqui." : "Vuelve a tu espacio." }}</h1>
          <p>
            Al entrar, tus publicaciones, perfil y conversaciones se mantienen ligados
            a tu cuenta.
          </p>
        </div>

        <form class="panel-form" @submit.prevent="submitAuth">
          <div class="segmented">
            <button
              :class="{ active: authMode === 'login' }"
              type="button"
              @click="authMode = 'login'"
            >
              Iniciar sesion
            </button>
            <button
              :class="{ active: authMode === 'register' }"
              type="button"
              @click="authMode = 'register'"
            >
              Registro
            </button>
          </div>

          <p v-if="error || notice" class="form-status" :class="{ error: error }">
            {{ error || notice }}
          </p>

          <label v-if="authMode === 'register'">
            Nombre
            <input v-model="authForm.name" required type="text" />
          </label>
          <label v-if="authMode === 'register'">
            Nombre del emprendimiento
            <input v-model="authForm.businessName" type="text" />
          </label>
          <label>
            Correo
            <input v-model="authForm.email" required type="email" />
          </label>
          <label>
            Contrasena
            <input v-model="authForm.password" required minlength="6" type="password" />
          </label>
          <label v-if="authMode === 'register'">
            Telefono
            <input v-model="authForm.phone" type="tel" />
          </label>
          <label v-if="authMode === 'register'">
            Ciudad
            <input v-model="authForm.city" type="text" />
          </label>
          <button class="primary wide" type="submit" :disabled="loading">
            {{ authButtonText }}
          </button>
        </form>
      </section>

      <section v-if="activeView === 'publish'" class="form-band">
        <div class="form-copy">
          <p class="eyebrow">Nueva publicacion</p>
          <h1>Comparte lo que vendes, haces o puedes ofrecer.</h1>
          <p>
            No hay carrito ni cobros dentro de la plataforma. El contacto ocurre
            por chat entre compradora y vendedora.
          </p>
        </div>

        <form class="panel-form" @submit.prevent="createProduct">
          <label>
            Titulo
            <input v-model="productForm.title" required type="text" />
          </label>
          <label>
            Categoria
            <select v-model="productForm.categoryId">
              <option value="">General</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <label>
            Descripcion
            <textarea v-model="productForm.description" required rows="5"></textarea>
          </label>
          <div class="two-columns">
            <label>
              Precio MXN
              <input v-model="productForm.price" min="0" step="1" type="number" />
            </label>
            <label>
              Ciudad
              <input v-model="productForm.city" type="text" />
            </label>
          </div>
          <label>
            Imagen por URL
            <input v-model="productForm.imageUrl" type="url" placeholder="https://..." />
          </label>
          <label class="file-picker">
            <input accept="image/*" type="file" @change="onProductImageChange" />
            <span class="file-picker-icon"><ImagePlus :size="22" /></span>
            <span>
              <strong>Importar imagen desde galeria</strong>
              <small>JPG, PNG o WEBP. Maximo 4 MB.</small>
            </span>
          </label>
          <div v-if="productImagePreview" class="image-preview">
            <img :src="productImagePreview" alt="" />
            <button type="button" @click="clearProductImage">Quitar imagen</button>
          </div>
          <button class="primary wide" type="submit">Guardar publicacion</button>
        </form>
      </section>

      <section v-if="activeView === 'profile' && isLoggedIn" class="profile-layout">
        <div class="profile-summary">
          <div class="avatar">
            <img v-if="profileImagePreview || user?.avatar_url" :src="profileImagePreview || user.avatar_url" alt="" />
            <span v-else>{{ (user?.name || "N").slice(0, 1).toUpperCase() }}</span>
          </div>
          <h1>{{ user?.business_name || user?.name }}</h1>
          <p>{{ user?.bio || "Perfil listo para presentar tu emprendimiento." }}</p>
          <div class="profile-facts">
            <span>{{ user?.city || "Sin ciudad" }}</span>
            <span>{{ user?.phone || "Sin telefono" }}</span>
          </div>
        </div>

        <form class="panel-form" @submit.prevent="saveProfile">
          <h2>Perfil</h2>
          <label class="file-picker">
            <input accept="image/*" type="file" @change="onProfileImageChange" />
            <span class="file-picker-icon"><Camera :size="22" /></span>
            <span>
              <strong>Cambiar foto de perfil</strong>
              <small>Elige una imagen desde tu galeria.</small>
            </span>
          </label>
          <div v-if="profileImagePreview" class="profile-preview">
            <img :src="profileImagePreview" alt="" />
            <span>Vista previa</span>
          </div>
          <label>
            Nombre
            <input v-model="profileForm.name" type="text" />
          </label>
          <label>
            Emprendimiento
            <input v-model="profileForm.businessName" type="text" />
          </label>
          <div class="two-columns">
            <label>
              Telefono
              <input v-model="profileForm.phone" type="tel" />
            </label>
            <label>
              Ciudad
              <input v-model="profileForm.city" type="text" />
            </label>
          </div>
          <label>
            Bio
            <textarea v-model="profileForm.bio" rows="4"></textarea>
          </label>
          <button class="primary wide" type="submit">Guardar perfil</button>
        </form>

        <section class="my-products">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Mis publicaciones</p>
              <h2>Tus publicaciones</h2>
            </div>
            <button type="button" @click="goTo('publish')">Nueva</button>
          </div>
          <div v-if="myProducts.length === 0" class="empty-state">
            Todavia no has publicado productos.
          </div>
          <article v-for="product in myProducts" :key="product.id" class="own-product">
            <div>
              <strong>{{ product.title }}</strong>
              <span>{{ product.category_name || "General" }} - {{ money(product.price) }}</span>
            </div>
            <button class="danger" title="Eliminar" type="button" @click="deleteProduct(product)">
              <Trash2 :size="17" />
            </button>
          </article>
        </section>
      </section>

      <section v-if="activeView === 'chat'" class="chat-layout">
        <aside class="conversation-list">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Mensajes</p>
              <h2>Conversaciones</h2>
            </div>
            <button type="button" @click="loadConversations">Actualizar</button>
          </div>

          <article
            v-for="conversation in conversations"
            :key="conversation.id"
            class="conversation-item"
            :class="{ active: selectedConversation?.id === conversation.id }"
            @click="selectConversation(conversation)"
          >
            <strong>{{ conversation.other_user_name }}</strong>
            <span>{{ conversation.product_title }}</span>
            <p>{{ conversation.last_message || "Sin mensajes todavia." }}</p>
            <b v-if="conversation.unread_count > 0">{{ conversation.unread_count }}</b>
          </article>

          <div v-if="conversations.length === 0" class="empty-state">
            No tienes conversaciones abiertas.
          </div>
        </aside>

        <section class="message-panel">
          <div v-if="contactProduct" class="new-chat-box">
            <p class="eyebrow">Nuevo chat</p>
            <h2>{{ contactProduct.title }}</h2>
            <textarea v-model="chatDraft.initialMessage" rows="3"></textarea>
            <button class="primary" type="button" @click="startConversation">
              <Send :size="17" />
              Enviar mensaje
            </button>
          </div>

          <template v-if="selectedConversation">
            <div class="message-heading">
              <div>
                <p class="eyebrow">{{ selectedConversation.product_title }}</p>
                <h2>{{ selectedConversation.other_user_name }}</h2>
              </div>
            </div>

            <div class="message-stream">
              <article
                v-for="message in messages"
                :key="message.id"
                class="message-bubble"
                :class="{ mine: String(message.sender_id) === String(user?.id) }"
              >
                <span>{{ message.sender_name }}</span>
                <p>{{ message.body }}</p>
                <footer
                  v-if="String(message.sender_id) === String(user?.id)"
                  class="message-state"
                  :class="{ read: message.read_at }"
                >
                  <CheckCheck v-if="message.read_at" :size="16" />
                  <Check v-else :size="16" />
                  <small>{{ message.read_at ? "Visto" : "Enviado" }}</small>
                </footer>
              </article>
            </div>

            <form class="message-compose" @submit.prevent="sendMessage">
              <input v-model="chatDraft.message" type="text" placeholder="Escribe un mensaje" />
              <button class="primary icon-send" title="Enviar" type="submit">
                <Send :size="18" />
              </button>
            </form>
          </template>

          <div v-else-if="!contactProduct" class="empty-state">
            Selecciona una conversacion o abre una desde una publicacion.
          </div>
        </section>
      </section>

      <section v-if="activeView === 'courses'" class="courses-layout">
        <div class="form-copy course-copy">
          <p class="eyebrow">Aprendizaje gratuito</p>
          <h1>Recursos para fortalecer tu emprendimiento.</h1>
          <p>
            Una seleccion de cursos y videos externos para aprender ventas,
            modelo de negocio, marketing y herramientas digitales.
          </p>
        </div>

        <div class="course-grid">
          <article v-for="course in courses" :key="course.url" class="course-card">
            <span>{{ course.provider }}</span>
            <h2>{{ course.title }}</h2>
            <a :href="course.url" target="_blank" rel="noreferrer">
              Ver recurso
              <ExternalLink :size="17" />
            </a>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>
