<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Flag,
  Heart,
  MessageCircle,
  Share2,
  Star,
  Store,
  UserPlus,
  X
} from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const props = defineProps({
  product: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["close"]);
const router = useRouter();

const {
  favoriteIds,
  followedSellerIds,
  getProductMedia,
  isLoggedIn,
  isVideoMedia,
  loadSellerReviews,
  money,
  openContact,
  openProductImage,
  reportProduct,
  reviewForm,
  saveReview,
  sellerReviews,
  shareProduct,
  toggleFavorite,
  toggleFollowSeller,
  user
} = useMarketplace();

const activeMedia = ref(0);
const mediaScroller = ref(null);
const reviewDraft = reactive({
  rating: 5,
  comment: ""
});

const ratingOptions = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

const media = computed(() => (props.product ? getProductMedia(props.product) : []));
const productReviews = computed(() =>
  sellerReviews.value.filter((review) => String(review.product_id) === String(props.product?.id))
);
const storeReviews = computed(() =>
  sellerReviews.value.filter((review) => String(review.product_id) !== String(props.product?.id))
);
const canInteractWithSeller = computed(
  () => isLoggedIn.value && String(user.value?.id) !== String(props.product?.seller_id)
);
const isFavorite = computed(() => favoriteIds.value.includes(String(props.product?.id)));
const isFollowing = computed(() => followedSellerIds.value.includes(String(props.product?.seller_id)));

const updateActiveMediaFromScroll = () => {
  const scroller = mediaScroller.value;
  if (!scroller || media.value.length === 0) return;

  const width = scroller.clientWidth || 1;
  activeMedia.value = Math.min(media.value.length - 1, Math.max(0, Math.round(scroller.scrollLeft / width)));
};

const goToMedia = (index) => {
  activeMedia.value = index;
  const scroller = mediaScroller.value;

  if (scroller) {
    scroller.scrollTo({
      left: index * scroller.clientWidth,
      behavior: "smooth"
    });
  }
};

watch(
  () => props.product?.id,
  async () => {
    activeMedia.value = 0;
    if (props.product?.seller_id) {
      await loadSellerReviews(props.product.seller_id);
    }
  },
  { immediate: true }
);

const submitReview = async () => {
  if (!props.product) return;

  reviewForm.sellerId = props.product.seller_id;
  reviewForm.productId = props.product.id;
  reviewForm.rating = reviewDraft.rating;
  reviewForm.comment = reviewDraft.comment;
  await saveReview();
  reviewDraft.rating = 5;
  reviewDraft.comment = "";
};

const visitSeller = async () => {
  if (!props.product?.seller_id) return;
  emit("close");
  await router.push({ name: "seller-profile", params: { sellerId: props.product.seller_id } });
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-soft">
      <section v-if="product" class="product-detail-backdrop" @click.self="emit('close')">
        <article class="product-detail">
          <button class="detail-close" type="button" @click="emit('close')">
            <X :size="20" />
            Cerrar
          </button>

          <div class="detail-gallery">
            <div
              v-if="media.length"
              ref="mediaScroller"
              class="detail-media-scroller"
              @scroll.passive="updateActiveMediaFromScroll"
            >
              <button
                v-for="(item, index) in media"
                :key="item.url"
                class="detail-media-slide"
                type="button"
                @click="openProductImage(product, index)"
              >
                <video
                  v-if="isVideoMedia(item)"
                  :src="item.url"
                  controls
                  playsinline
                ></video>
                <img v-else :src="item.url" :alt="`${product.title} ${index + 1}`" />
              </button>
            </div>
            <button v-else class="detail-main-media" type="button" disabled>
              <span>{{ product.title.slice(0, 1).toUpperCase() }}</span>
            </button>
            <span v-if="media.length > 1" class="detail-media-counter">
              {{ activeMedia + 1 }}/{{ media.length }}
            </span>
            <div v-if="media.length > 1" class="detail-dots">
              <button
                v-for="(item, index) in media"
                :key="item.url"
                type="button"
                :class="{ active: index === activeMedia }"
                :aria-label="`Ver archivo ${index + 1}`"
                @click="goToMedia(index)"
              ></button>
            </div>
          </div>

          <div class="detail-info">
            <span class="tag">{{ product.category_name || "General" }}</span>
            <h2>{{ product.title }}</h2>
            <p>{{ product.description }}</p>
            <div class="detail-price-row">
              <strong>{{ money(product.price) }}</strong>
              <span>{{ product.city || "Sin ciudad" }}</span>
            </div>
            <div class="trust-line detail-trust">
              <span>
                <Star :size="16" />
                {{ Number(product.seller_rating || 0) > 0 ? product.seller_rating : "Nuevo" }}
              </span>
              <span>{{ product.favorite_count || 0 }} guardados</span>
            </div>

            <section class="seller-card-detail">
              <div class="seller-avatar">
                <img v-if="product.seller_avatar_url" :src="product.seller_avatar_url" alt="" />
                <span v-else>{{ (product.seller_name || "N").slice(0, 1).toUpperCase() }}</span>
              </div>
              <div>
                <small>Vendedora</small>
                <strong>{{ product.seller_name }}</strong>
                <span>{{ product.seller_business_name || "Emprendimiento NextFem" }}</span>
              </div>
              <button type="button" @click="visitSeller">
                <Store :size="16" />
                Visitar
              </button>
            </section>

            <div class="detail-actions">
              <button class="primary subtle" type="button" @click="openContact(product)">
                <MessageCircle :size="17" />
                Preguntar
              </button>
              <button type="button" @click="toggleFavorite(product)">
                <Heart :size="17" />
                {{ isFavorite ? "Guardado" : "Guardar" }}
              </button>
              <button type="button" @click="shareProduct(product)">
                <Share2 :size="17" />
                Compartir
              </button>
              <button v-if="canInteractWithSeller" type="button" @click="toggleFollowSeller(product.seller_id)">
                <UserPlus :size="17" />
                {{ isFollowing ? "Siguiendo" : "Seguir" }}
              </button>
              <button type="button" @click="reportProduct(product)">
                <Flag :size="17" />
                Reportar
              </button>
            </div>
          </div>

          <section class="detail-reviews">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">Confianza</p>
                <h3>Reseñas del producto</h3>
              </div>
              <span>{{ productReviews.length }} reseñas</span>
            </div>

            <form v-if="canInteractWithSeller" class="review-form detail-review-form" @submit.prevent="submitReview">
              <select v-model="reviewDraft.rating" aria-label="Calificación">
                <option v-for="rating in ratingOptions" :key="rating" :value="rating">
                  {{ rating }} estrellas
                </option>
              </select>
              <input
                v-mobile-keyboard
                v-model="reviewDraft.comment"
                type="text"
                inputmode="text"
                enterkeyhint="send"
                placeholder="Escribe tu reseña"
              />
              <button class="primary" type="submit">Enviar reseña</button>
            </form>

            <div v-if="productReviews.length === 0" class="empty-state">Aún no hay reseñas de este producto.</div>
            <article v-for="review in productReviews" :key="review.id" class="detail-review">
              <strong>{{ Number(review.rating).toFixed(1) }} estrellas</strong>
              <p>{{ review.comment || "Sin comentario" }}</p>
              <small>{{ review.reviewer_name }}</small>
            </article>

            <div v-if="storeReviews.length" class="section-heading compact store-review-heading">
              <div>
                <p class="eyebrow">Tienda</p>
                <h3>Más reseñas de la vendedora</h3>
              </div>
            </div>
            <article v-for="review in storeReviews.slice(0, 3)" :key="`store-${review.id}`" class="detail-review">
              <strong>{{ Number(review.rating).toFixed(1) }} estrellas</strong>
              <p>{{ review.comment || "Sin comentario" }}</p>
              <small>{{ review.reviewer_name }}</small>
            </article>
          </section>
        </article>
      </section>
    </Transition>
  </Teleport>
</template>
