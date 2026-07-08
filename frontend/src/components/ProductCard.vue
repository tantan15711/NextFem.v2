<script setup>
import { computed, reactive, ref } from "vue";
import { Flag, Heart, MessageCircle, Star, Store } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

const {
  categoryInitial,
  favoriteIds,
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
  showSimilar,
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
  <article class="product-card">
    <button
      class="product-media"
      type="button"
      :disabled="!getPrimaryMedia(product)"
      title="Abrir galeria"
      @click="openProductImage(product)"
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
          @click="toggleFavorite(product)"
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
    </div>

    <footer class="card-actions">
      <button type="button" @click="showSimilar(product)">Similares</button>
      <button class="primary subtle" type="button" @click="openContact(product)">
        <MessageCircle :size="16" />
        Preguntar
      </button>
      <button type="button" @click="reportProduct(product)">
        <Flag :size="16" />
        Reportar
      </button>
      <button v-if="canReview" type="button" @click="reviewOpen = !reviewOpen">
        <Star :size="16" />
        Reseñar
      </button>
    </footer>

    <form v-if="reviewOpen" class="inline-review-form" @submit.prevent="submitReview">
      <select v-model="reviewDraft.rating" aria-label="Calificacion">
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
