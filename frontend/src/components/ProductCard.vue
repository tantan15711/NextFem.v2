<script setup>
import { computed, reactive, ref } from "vue";
import { Flag, Heart, MessageCircle, Share2, Star, Store, UserPlus } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["open-detail"]);

const {
  categoryInitial,
  favoriteIds,
  followedSellerIds,
  getPrimaryMedia,
  getProductMedia,
  isVideoMedia,
  isLoggedIn,
  money,
  openProductImage,
  openContact,
  reportProduct,
  reviewForm,
  saveReview,
  shareProduct,
  showSimilar,
  toggleFollowSeller,
  toggleFavorite,
  user
} = useMarketplace();

const reviewOpen = ref(false);
const reviewDraft = reactive({
  rating: 5,
  comment: ""
});
const ratingOptions = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

const canReview = computed(
  () => isLoggedIn.value && String(user.value?.id) !== String(props.product.seller_id)
);
const canFollow = computed(
  () => isLoggedIn.value && String(user.value?.id) !== String(props.product.seller_id)
);
const isFollowing = computed(() =>
  followedSellerIds.value.includes(String(props.product.seller_id))
);

const submitReview = async () => {
  reviewForm.sellerId = props.product.seller_id;
  reviewForm.productId = props.product.id;
  reviewForm.rating = reviewDraft.rating;
  reviewForm.comment = reviewDraft.comment;
  await saveReview();
  reviewDraft.comment = "";
  reviewDraft.rating = 5;
  reviewOpen.value = false;
};
</script>

<template>
  <article class="product-card" role="button" tabindex="0" @click="emit('open-detail', product)" @keydown.enter="emit('open-detail', product)">
    <button
      class="product-media"
      type="button"
      :disabled="!getPrimaryMedia(product)"
      title="Ver producto"
      @click.stop="emit('open-detail', product)"
    >
      <video
        v-if="getPrimaryMedia(product) && isVideoMedia(getPrimaryMedia(product))"
        :src="getPrimaryMedia(product).url"
        muted
        playsinline
        preload="metadata"
      ></video>
      <img
        v-else-if="getPrimaryMedia(product)"
        :src="getPrimaryMedia(product).url"
        :alt="product.title"
      />
      <span v-else>{{ categoryInitial(product) }}</span>
      <b v-if="getProductMedia(product).length > 1" class="media-count">
        {{ getProductMedia(product).length }} archivos
      </b>
    </button>

    <div class="product-body">
      <div class="product-card-topline">
        <span class="tag">{{ product.category_name || "General" }}</span>
        <button
          class="soft-icon"
          :class="{ active: favoriteIds.includes(String(product.id)) }"
          type="button"
          title="Guardar producto"
          @click.stop="toggleFavorite(product)"
        >
          <Heart :size="17" />
        </button>
      </div>
      <h3>{{ product.title }}</h3>
      <p>{{ product.description }}</p>
      <div class="product-meta">
        <strong>{{ money(product.price) }}</strong>
        <span>{{ product.city || "Sin ciudad" }}</span>
      </div>
      <div class="trust-line">
        <span>
          <Star :size="15" />
          {{ Number(product.seller_rating || 0) > 0 ? product.seller_rating : "Nuevo" }}
        </span>
        <span>{{ product.favorite_count || 0 }} guardados</span>
      </div>
      <div class="seller-line">
        <Store :size="16" />
        {{ product.seller_name }}
      </div>
      <div v-if="product.published_at" class="published-line">
        Publicado {{ new Date(product.published_at).toLocaleDateString("es-MX") }}
      </div>
    </div>

    <footer class="card-actions">
      <button type="button" @click.stop="showSimilar(product)">Similares</button>
      <button class="primary subtle" type="button" @click.stop="openContact(product)">
        <MessageCircle :size="16" />
        Preguntar
      </button>
      <button type="button" @click.stop="reportProduct(product)">
        <Flag :size="16" />
        Reportar
      </button>
      <button type="button" @click.stop="shareProduct(product)">
        <Share2 :size="16" />
        Compartir
      </button>
      <button v-if="canFollow" type="button" @click.stop="toggleFollowSeller(product.seller_id)">
        <UserPlus :size="16" />
        {{ isFollowing ? "Siguiendo" : "Seguir" }}
      </button>
      <button v-if="canReview" type="button" @click.stop="reviewOpen = !reviewOpen">
        <Star :size="16" />
        Reseñar
      </button>
    </footer>

    <form v-if="reviewOpen" class="inline-review-form" @click.stop @submit.prevent="submitReview">
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
        placeholder="Escribe una reseña breve"
      />
      <button class="primary subtle" type="submit">Guardar</button>
    </form>
  </article>
</template>
