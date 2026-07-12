<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Heart, MessageCircle, Star, UserPlus } from "lucide-vue-next";
import ProductDetailModal from "../components/ProductDetailModal.vue";
import { useMarketplace } from "../composables/useMarketplace";
import { api } from "../services/api";

const route = useRoute();
const router = useRouter();
const {
  categoryInitial,
  followedSellerIds,
  getPrimaryMedia,
  isLoggedIn,
  isVideoMedia,
  money,
  openSellerContact,
  toggleFollowSeller,
  user
} = useMarketplace();

const loading = ref(true);
const error = ref("");
const sellerData = ref(null);
const selectedProduct = ref(null);

const seller = computed(() => sellerData.value?.profile || null);
const products = computed(() => sellerData.value?.products || []);
const reviews = computed(() => sellerData.value?.reviews || []);
const metrics = computed(() => sellerData.value?.metrics || {});
const isOwnProfile = computed(() => String(user.value?.id) === String(seller.value?.id));
const isFollowing = computed(() => followedSellerIds.value.includes(String(seller.value?.id)));

const loadSeller = async () => {
  loading.value = true;
  error.value = "";

  try {
    sellerData.value = await api.publicSellerProfile(route.params.sellerId);
  } catch (err) {
    error.value = err?.message || "No se pudo cargar el perfil de la vendedora.";
  } finally {
    loading.value = false;
  }
};

const followSeller = async () => {
  if (!seller.value?.id) return;
  await toggleFollowSeller(seller.value.id);
};

const askSeller = async () => {
  await openSellerContact(seller.value);
};

onMounted(loadSeller);

watch(
  () => route.params.sellerId,
  () => loadSeller()
);
</script>

<template>
  <section class="public-profile-layout">
    <button class="back-chat public-back" type="button" @click="router.back()">
      <ArrowLeft :size="18" />
      Volver
    </button>

    <div v-if="loading" class="empty-state">Cargando perfil...</div>
    <div v-else-if="error" class="status-band error">{{ error }}</div>

    <template v-else-if="seller">
      <section class="public-seller-hero">
        <div class="public-avatar">
          <img v-if="seller.avatar_url" :src="seller.avatar_url" alt="" />
          <span v-else>{{ (seller.business_name || seller.name || "N").slice(0, 1).toUpperCase() }}</span>
        </div>
        <div>
          <p class="eyebrow">Perfil de vendedora</p>
          <h1>{{ seller.business_name || seller.name }}</h1>
          <p>{{ seller.bio || "Perfil listo para presentar su emprendimiento." }}</p>
          <div class="profile-facts">
            <span>{{ seller.city || "Sin ciudad" }}</span>
            <span>{{ products.length }} publicaciones</span>
          </div>
        </div>
        <div class="public-profile-actions">
          <button
            v-if="isLoggedIn && !isOwnProfile"
            class="primary subtle"
            type="button"
            @click="askSeller"
          >
            <MessageCircle :size="17" />
            Mensaje
          </button>
          <button v-if="isLoggedIn && !isOwnProfile" type="button" @click="followSeller">
            <UserPlus :size="17" />
            {{ isFollowing ? "Siguiendo" : "Seguir" }}
          </button>
        </div>
      </section>

      <section class="dashboard-panel public-dashboard">
        <p class="eyebrow">Panel publico</p>
        <h2>Actividad del emprendimiento</h2>
        <div class="metric-grid public-metrics">
          <article>
            <strong>{{ metrics.active_products || 0 }}</strong>
            <span>Publicaciones activas</span>
          </article>
          <article>
            <strong>{{ metrics.sold_products || 0 }}</strong>
            <span>Productos vendidos</span>
          </article>
          <article>
            <strong>{{ metrics.average_rating || 0 }}</strong>
            <span>Calificación</span>
          </article>
          <article>
            <strong>{{ metrics.followers_count || 0 }}</strong>
            <span>Seguidoras</span>
          </article>
        </div>
      </section>

      <section class="my-products public-bio-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Bio</p>
            <h2>Sobre el emprendimiento</h2>
          </div>
        </div>
        <p>{{ seller.bio || "La vendedora aún no ha agregado una biografía." }}</p>
      </section>

      <section class="my-products">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Publicaciones</p>
            <h2>Productos de {{ seller.business_name || seller.name }}</h2>
          </div>
        </div>
        <div v-if="products.length === 0" class="empty-state">
          Esta vendedora aún no tiene publicaciones activas.
        </div>
        <div v-else class="seller-catalog-list">
          <article
            v-for="product in products"
            :key="product.id"
            class="seller-catalog-item"
            role="button"
            tabindex="0"
            @click="selectedProduct = product"
            @keydown.enter.prevent="selectedProduct = product"
          >
            <div class="seller-catalog-media">
              <video
                v-if="getPrimaryMedia(product) && isVideoMedia(getPrimaryMedia(product))"
                :src="getPrimaryMedia(product).url"
                muted
                playsinline
              ></video>
              <img
                v-else-if="getPrimaryMedia(product)"
                :src="getPrimaryMedia(product).url"
                :alt="product.title"
              />
              <span v-else>{{ categoryInitial(product) }}</span>
            </div>
            <div class="seller-catalog-content">
              <span class="tag">{{ product.category_name || "General" }}</span>
              <h3>{{ product.title }}</h3>
              <p>{{ product.description || "Producto publicado por la vendedora." }}</p>
              <div class="seller-catalog-meta">
                <span>
                  <Star :size="15" />
                  {{ Number(product.seller_rating || 0) > 0 ? product.seller_rating : "Nuevo" }}
                </span>
                <span>{{ product.city || "Sin ciudad" }}</span>
              </div>
              <div class="seller-catalog-footer">
                <strong>{{ money(product.price) }}</strong>
                <span>
                  <Heart :size="15" />
                  {{ product.favorite_count || 0 }} guardados
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="my-products">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Confianza</p>
            <h2>Reseñas de la vendedora</h2>
          </div>
          <span>{{ reviews.length }} opiniones</span>
        </div>
        <div v-if="reviews.length === 0" class="empty-state">
          Aún no tiene reseñas.
        </div>
        <article v-for="review in reviews" :key="review.id" class="own-product review-item public-review">
          <div>
            <strong>
              <Star :size="16" />
              {{ Number(review.rating).toFixed(1) }} estrellas
            </strong>
            <span>{{ review.comment || "Sin comentario" }}</span>
          </div>
          <small>{{ review.reviewer_name }}</small>
        </article>
      </section>

      <ProductDetailModal :product="selectedProduct" @close="selectedProduct = null" />
    </template>
  </section>
</template>
