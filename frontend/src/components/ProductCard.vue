<script setup>
import { Flag, Heart, MessageCircle, Star, Store } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

defineProps({
  product: {
    type: Object,
    required: true
  }
});

const {
  categoryInitial,
  favoriteIds,
  money,
  openProductImage,
  openContact,
  reportProduct,
  showSimilar,
  toggleFavorite
} = useMarketplace();
</script>

<template>
  <article class="product-card">
    <button
      class="product-media"
      type="button"
      :disabled="!product.image_url"
      title="Abrir imagen"
      @click="openProductImage(product)"
    >
      <img v-if="product.image_url" :src="product.image_url" :alt="product.title" />
      <span v-else>{{ categoryInitial(product) }}</span>
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
    </footer>
  </article>
</template>
