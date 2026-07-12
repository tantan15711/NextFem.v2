<script setup>
import { ref } from "vue";
import { BriefcaseBusiness, Plus, Search, UserRound } from "lucide-vue-next";
import ProductDetailModal from "../components/ProductDetailModal.vue";
import ProductCard from "../components/ProductCard.vue";
import { useMarketplace } from "../composables/useMarketplace";

const {
  categories,
  filters,
  goTo,
  isLoggedIn,
  loadProducts,
  loading,
  openContact,
  followedProducts,
  products,
  applySearchTrend,
  recentProducts,
  searchTrends,
  selectedCategoryName,
  similarProducts,
  visibleProducts
} = useMarketplace();

const selectedProduct = ref(null);
</script>

<template>
  <section class="home-layout">
    <div class="intro-band">
      <div class="intro-copy">
        <p class="eyebrow">Sin comisiones de plataforma</p>
        <h1>Un espacio para vender, conectar y crecer con otras mujeres.</h1>
        <p>
          Publica productos, servicios o apoyos comunitarios. La conversación
          sucede directo entre usuarias y tu perfil queda guardado.
        </p>
        <div class="intro-actions">
          <button class="hero-button" type="button" @click="goTo('publish')">
            <Plus :size="18" />
            Publicar
          </button>
          <button v-if="!isLoggedIn" class="hero-button ghost" type="button" @click="goTo('auth')">
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
          v-mobile-keyboard
          v-model="filters.search"
          type="search"
          inputmode="search"
          enterkeyhint="search"
          autocomplete="off"
          placeholder="Buscar ropa, comida, servicios..."
          @keyup.enter="loadProducts"
        />
      </label>
      <input
        v-mobile-keyboard
        v-model="filters.city"
        class="city-input"
        type="text"
        inputmode="text"
        enterkeyhint="search"
        autocomplete="address-level2"
        placeholder="Ciudad"
      />
      <button class="primary" type="button" @click="loadProducts">Buscar</button>
    </div>

    <div class="smart-filter-band">
      <label>
        Precio minimo
        <input
          v-mobile-keyboard
          v-model="filters.minPrice"
          min="0"
          type="number"
          inputmode="decimal"
          enterkeyhint="search"
          placeholder="$0"
          @keyup.enter="loadProducts"
        />
      </label>
      <label>
        Precio maximo
        <input
          v-mobile-keyboard
          v-model="filters.maxPrice"
          min="0"
          type="number"
          inputmode="decimal"
          enterkeyhint="search"
          placeholder="$500"
          @keyup.enter="loadProducts"
        />
      </label>
      <label>
        Ordenar
        <select v-model="filters.sort" @change="loadProducts">
          <option value="recent">Recientes</option>
          <option value="searched">Mas buscados</option>
          <option value="popular">Mas guardados</option>
          <option value="price_asc">Menor precio</option>
          <option value="price_desc">Mayor precio</option>
        </select>
      </label>
      <label class="toggle-filter">
        <input v-model="filters.freeOnly" type="checkbox" @change="loadProducts" />
        Solo apoyos gratuitos
      </label>
      <button type="button" @click="loadProducts">Aplicar filtros</button>
    </div>

    <div v-if="searchTrends.length" class="trend-band">
      <span>Busquedas populares</span>
      <button
        v-for="trend in searchTrends"
        :key="trend.query"
        type="button"
        @click="applySearchTrend(trend)"
      >
        {{ trend.query }}
      </button>
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
        <div v-else-if="visibleProducts.length === 0" class="empty-state">
          Aún no hay publicaciones para esta búsqueda.
        </div>
        <div v-else class="product-grid">
          <ProductCard
            v-for="product in visibleProducts"
            :key="product.id"
            :product="product"
            @open-detail="selectedProduct = product"
          />
        </div>
      </section>
    </div>

    <section v-if="recentProducts.length" class="featured-strip">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Recién publicados</p>
          <h2>Lo más nuevo en NextFem</h2>
        </div>
      </div>
      <div class="horizontal-products">
        <ProductCard
          v-for="product in recentProducts"
          :key="`recent-${product.id}`"
          :product="product"
          @open-detail="selectedProduct = product"
        />
      </div>
    </section>

    <section v-if="followedProducts.length" class="featured-strip">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Novedades</p>
          <h2>Publicaciones de vendedoras que sigues</h2>
        </div>
      </div>
      <div class="horizontal-products">
        <ProductCard
          v-for="product in followedProducts"
          :key="`followed-${product.id}`"
          :product="product"
          @open-detail="selectedProduct = product"
        />
      </div>
    </section>

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

    <ProductDetailModal :product="selectedProduct" @close="selectedProduct = null" />
  </section>
</template>
