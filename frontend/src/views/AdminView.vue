<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  CheckCircle2,
  Eye,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX
} from "lucide-vue-next";
import ProductDetailModal from "../components/ProductDetailModal.vue";
import { api } from "../services/api";
import { useMarketplace } from "../composables/useMarketplace";

const { user } = useMarketplace();
const router = useRouter();

const loading = ref(false);
const error = ref("");
const notice = ref("");
const users = ref([]);
const products = ref([]);
const reports = ref([]);
const productSearch = ref("");
const selectedProduct = ref(null);

const isAdmin = () => user.value?.role === "admin";
const isReviewed = (report) => String(report.status || "").toLowerCase() === "reviewed";

const filteredProducts = computed(() => {
  const term = productSearch.value.trim().toLowerCase();
  if (!term) return products.value;

  return products.value.filter((product) => {
    const text = [
      product.title,
      product.description,
      product.seller_name,
      product.seller_business_name,
      product.category_name,
      product.city,
      product.status,
      ...(product.hashtags || [])
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(term);
  });
});

const findProduct = (productId) =>
  products.value.find((product) => String(product.id) === String(productId));

const loadAdminData = async () => {
  if (!isAdmin()) return;

  loading.value = true;
  error.value = "";

  try {
    const [userRows, productRows, reportRows] = await Promise.all([
      api.adminUsers(),
      api.adminProducts(),
      api.adminReports()
    ]);
    users.value = userRows;
    products.value = productRows;
    reports.value = reportRows;
  } catch (err) {
    error.value = err?.message || "No se pudo cargar el panel de soporte.";
  } finally {
    loading.value = false;
  }
};

const runAdminAction = async (action) => {
  loading.value = true;
  error.value = "";
  notice.value = "";

  try {
    const result = await action();
    notice.value = result?.message || "Acción realizada.";
    await loadAdminData();
  } catch (err) {
    error.value = err?.message || "No se pudo completar la acción.";
  } finally {
    loading.value = false;
  }
};

const openProduct = (product) => {
  if (!product) {
    error.value = "No se encontró el producto relacionado con este reporte.";
    notice.value = "";
    return;
  }

  selectedProduct.value = product;
};

const openUserProfile = async (profile) => {
  if (!profile?.id) return;
  await router.push({ name: "seller-profile", params: { sellerId: profile.id } });
};

onMounted(loadAdminData);
</script>

<template>
  <section class="admin-dashboard">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Soporte</p>
        <h1>Panel administrativo</h1>
      </div>
      <Shield :size="34" />
    </div>

    <p v-if="!isAdmin()" class="form-status error">
      Esta sección solo está disponible para cuentas administradoras.
    </p>

    <template v-else>
      <p v-if="error || notice" class="form-status" :class="{ error: error }">
        {{ error || notice }}
      </p>

      <button class="primary" type="button" :disabled="loading" @click="loadAdminData">
        {{ loading ? "Cargando..." : "Actualizar panel" }}
      </button>

      <section class="admin-grid">
        <article class="admin-card">
          <h2>Reportes</h2>
          <div v-if="reports.length === 0" class="empty-state">No hay reportes pendientes.</div>
          <div
            v-for="report in reports"
            :key="report.id"
            class="admin-row"
            :class="{ reviewed: isReviewed(report) }"
          >
            <div>
              <strong>{{ report.reason || "Revisión" }}</strong>
              <span>{{ report.details || "Sin detalles" }}</span>
              <small>
                Producto:
                {{ findProduct(report.product_id)?.title || report.product_id }}
              </small>
            </div>
            <div class="admin-actions">
              <button type="button" @click="openProduct(findProduct(report.product_id))">
                <Eye :size="16" />
                Ver
              </button>
              <button
                type="button"
                :class="{ success: isReviewed(report) }"
                :disabled="isReviewed(report)"
                @click="runAdminAction(() => api.adminResolveReport(report.id))"
              >
                <CheckCircle2 :size="16" />
                {{ isReviewed(report) ? "Revisado" : "Marcar revisado" }}
              </button>
              <button
                v-if="findProduct(report.product_id)?.status !== 'deleted'"
                class="danger"
                type="button"
                @click="runAdminAction(() => api.adminDeleteProduct(report.product_id))"
              >
                <Trash2 :size="16" />
                Retirar
              </button>
            </div>
          </div>
        </article>

        <article class="admin-card">
          <div class="admin-card-heading">
            <h2>Productos</h2>
            <label class="admin-search">
              <Search :size="17" />
              <input
                v-model="productSearch"
                type="search"
                placeholder="Buscar producto, vendedora, categoría o ciudad"
              />
            </label>
          </div>
          <div v-if="filteredProducts.length === 0" class="empty-state">No hay productos.</div>
          <div v-for="product in filteredProducts" :key="product.id" class="admin-row">
            <div>
              <strong>{{ product.title }}</strong>
              <span>{{ product.seller_name }} - {{ product.status }}</span>
              <small>{{ product.category_name || "General" }}</small>
            </div>
            <div class="admin-actions">
              <button type="button" @click="openProduct(product)">
                <Eye :size="16" />
                Ver
              </button>
              <button
                v-if="product.status === 'deleted'"
                type="button"
                @click="runAdminAction(() => api.adminRestoreProduct(product.id))"
              >
                <RotateCcw :size="16" />
                Restaurar
              </button>
              <button
                v-else
                class="danger"
                type="button"
                @click="runAdminAction(() => api.adminDeleteProduct(product.id))"
              >
                <Trash2 :size="16" />
                Retirar
              </button>
            </div>
          </div>
        </article>

        <article class="admin-card">
          <h2>Usuarias</h2>
          <div v-if="users.length === 0" class="empty-state">No hay usuarias.</div>
          <div v-for="profile in users" :key="profile.id" class="admin-row">
            <div>
              <strong>{{ profile.business_name || profile.name || "Usuaria" }}</strong>
              <span>{{ profile.email }}</span>
              <small>{{ profile.role }} {{ profile.is_disabled ? "- desactivada" : "" }}</small>
            </div>
            <div class="admin-actions">
              <button type="button" @click="openUserProfile(profile)">
                <Eye :size="16" />
                Ver
              </button>
              <button
                v-if="profile.is_disabled"
                type="button"
                @click="runAdminAction(() => api.adminEnableUser(profile.id))"
              >
                <UserCheck :size="16" />
                Activar
              </button>
              <button
                v-else
                class="danger"
                type="button"
                @click="runAdminAction(() => api.adminDisableUser(profile.id))"
              >
                <UserX :size="16" />
                Desactivar
              </button>
            </div>
          </div>
        </article>
      </section>
    </template>

    <ProductDetailModal :product="selectedProduct" @close="selectedProduct = null" />
  </section>
</template>
