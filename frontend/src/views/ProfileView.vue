<script setup>
import { Camera, Trash2 } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const {
  deleteProduct,
  favoriteProducts,
  goTo,
  isLoggedIn,
  loadSellerReviews,
  metrics,
  money,
  myProducts,
  onProfileImageChange,
  profileForm,
  profileImagePreview,
  saveProfile,
  sellerReviews,
  user
} = useMarketplace();
</script>

<template>
  <section v-if="isLoggedIn" class="profile-layout">
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

    <section class="dashboard-panel">
      <p class="eyebrow">Panel de impulso</p>
      <h2>Tu emprendimiento en numeros</h2>
      <div class="metric-grid">
        <article>
          <strong>{{ metrics?.active_products || 0 }}</strong>
          <span>Publicaciones activas</span>
        </article>
        <article>
          <strong>{{ metrics?.conversations || 0 }}</strong>
          <span>Conversaciones</span>
        </article>
        <article>
          <strong>{{ metrics?.favorite_count || 0 }}</strong>
          <span>Veces guardada</span>
        </article>
        <article>
          <strong>{{ metrics?.average_rating || 0 }}</strong>
          <span>Calificacion</span>
        </article>
      </div>
    </section>

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
        <input
          v-mobile-keyboard
          v-model="profileForm.name"
          type="text"
          inputmode="text"
          enterkeyhint="next"
          autocomplete="name"
        />
      </label>
      <label>
        Emprendimiento
        <input
          v-mobile-keyboard
          v-model="profileForm.businessName"
          type="text"
          inputmode="text"
          enterkeyhint="next"
          autocomplete="organization"
        />
      </label>
      <div class="two-columns">
        <label>
          Telefono
          <input
            v-mobile-keyboard
            v-model="profileForm.phone"
            type="tel"
            inputmode="tel"
            enterkeyhint="next"
            autocomplete="tel"
          />
        </label>
        <label>
          Ciudad
          <input
            v-mobile-keyboard
            v-model="profileForm.city"
            type="text"
            inputmode="text"
            enterkeyhint="next"
            autocomplete="address-level2"
          />
        </label>
      </div>
      <label>
        Bio
        <textarea
          v-mobile-keyboard
          v-model="profileForm.bio"
          rows="4"
          inputmode="text"
          enterkeyhint="done"
          autocomplete="off"
        ></textarea>
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

    <section class="my-products">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Favoritos</p>
          <h2>Guardados para despues</h2>
        </div>
      </div>
      <div v-if="favoriteProducts.length === 0" class="empty-state">
        Aun no has guardado productos.
      </div>
      <article v-for="product in favoriteProducts" :key="product.id" class="own-product">
        <div>
          <strong>{{ product.title }}</strong>
          <span>{{ product.seller_name }} - {{ money(product.price) }}</span>
        </div>
        <button type="button" @click="goTo('home')">Ver</button>
      </article>
    </section>

    <section class="my-products">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Confianza</p>
          <h2>Reseñas de tu perfil</h2>
        </div>
        <button type="button" @click="loadSellerReviews()">Actualizar</button>
      </div>
      <div v-if="sellerReviews.length === 0" class="empty-state">
        Aun no tienes reseñas.
      </div>
      <article v-for="review in sellerReviews" :key="review.id" class="own-product review-item">
        <div>
          <strong>{{ Number(review.rating).toFixed(1) }} estrellas</strong>
          <span>{{ review.comment || "Sin comentario" }}</span>
        </div>
        <small>{{ review.reviewer_name }}</small>
      </article>
    </section>

  </section>
</template>
