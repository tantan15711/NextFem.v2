<script setup>
import { ImagePlus, Sparkles } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const {
  categories,
  assistantResult,
  createProduct,
  generateProductWithAI,
  isEditingProduct,
  onProductMediaChange,
  productForm,
  productMediaPreviews,
  productSubmitText,
  removeProductMedia
} = useMarketplace();
</script>

<template>
  <section class="form-band">
    <div class="form-copy">
      <p class="eyebrow">{{ isEditingProduct ? "Editar publicación" : "Nueva publicación" }}</p>
      <h1>
        {{
          isEditingProduct
            ? "Actualiza los datos de tu producto."
            : "Comparte lo que vendes, haces o puedes ofrecer."
        }}
      </h1>
      <p>
        {{
          isEditingProduct
            ? "Puedes cambiar el texto, precio, categoría, ciudad, hashtags y archivos multimedia."
            : "No hay carrito ni cobros dentro de la plataforma. El contacto ocurre por chat entre compradora y vendedora."
        }}
      </p>
    </div>

    <form class="panel-form" @submit.prevent="createProduct">
      <div class="ai-helper-card">
        <div>
          <p class="eyebrow">Sugerencias</p>
          <strong>Escribe un título y deja que NextFem prepare tu publicación.</strong>
        </div>
        <button type="button" @click="generateProductWithAI">
          <Sparkles :size="17" />
          Sugerir
        </button>
        <div v-if="assistantResult" class="ai-result-card">
          <p>
            Categoría sugerida: <b>{{ assistantResult.categoryName }}</b> -
            Precio sugerido: <b>${{ assistantResult.suggestedPrice }}</b>
          </p>
          <div v-if="assistantResult.hashtags?.length" class="ai-chip-row">
            <span v-for="tag in assistantResult.hashtags" :key="tag">{{ tag }}</span>
          </div>
          <div v-if="assistantResult.sellingTips?.length" class="ai-mini-grid">
            <article>
              <strong>Tips para vender mejor</strong>
              <ul>
                <li v-for="tip in assistantResult.sellingTips" :key="tip">{{ tip }}</li>
              </ul>
            </article>
            <article v-if="assistantResult.missingInfo?.length">
              <strong>Detalles que faltan</strong>
              <ul>
                <li v-for="item in assistantResult.missingInfo" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </div>
      </div>

      <label>
        Título
        <input
          v-mobile-keyboard
          v-model="productForm.title"
          required
          type="text"
          inputmode="text"
          enterkeyhint="next"
          autocomplete="off"
        />
      </label>

      <label>
        Categoría
        <select v-model="productForm.categoryId">
          <option value="">General</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>

      <label>
        Descripción
        <textarea
          v-mobile-keyboard
          v-model="productForm.description"
          required
          rows="5"
          inputmode="text"
          enterkeyhint="next"
          autocomplete="off"
        ></textarea>
      </label>

      <label>
        Hashtags
        <input
          v-mobile-keyboard
          v-model="productForm.hashtags"
          type="text"
          inputmode="text"
          enterkeyhint="next"
          autocomplete="off"
          placeholder="#Ropa #Tapachula #Regalos"
        />
      </label>

      <div class="two-columns">
        <label>
          Precio MXN
          <input
            v-mobile-keyboard
            v-model="productForm.price"
            min="0"
            step="1"
            type="number"
            inputmode="decimal"
            enterkeyhint="next"
          />
        </label>
        <label>
          Ciudad
          <input
            v-mobile-keyboard
            v-model="productForm.city"
            type="text"
            inputmode="text"
            enterkeyhint="next"
            autocomplete="address-level2"
          />
        </label>
      </div>

      <label class="file-picker">
        <input accept="image/*,video/mp4,video/webm" multiple type="file" @change="onProductMediaChange" />
        <span class="file-picker-icon"><ImagePlus :size="22" /></span>
        <span>
          <strong>Agregar fotos o video</strong>
          <small>Hasta 8 archivos. JPG, PNG, WEBP, MP4 o WEBM.</small>
        </span>
      </label>

      <div v-if="productMediaPreviews.length" class="media-preview-grid">
        <article
          v-for="(item, index) in productMediaPreviews"
          :key="item.id"
          class="media-preview-item"
        >
          <img v-if="item.mediaType === 'image'" :src="item.url" alt="" />
          <video v-else :src="item.url" muted playsinline controls></video>
          <span>{{ index === 0 ? "Portada" : item.name }}</span>
          <button type="button" @click="removeProductMedia(index)">Quitar</button>
        </article>
      </div>

      <button class="primary wide" type="submit">{{ productSubmitText }}</button>
    </form>
  </section>
</template>
