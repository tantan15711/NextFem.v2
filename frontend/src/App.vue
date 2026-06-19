<script setup>
import { onBeforeUnmount, onMounted, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import ImagePreviewModal from "./components/ImagePreviewModal.vue";
import LogoutConfirm from "./components/LogoutConfirm.vue";
import MobileNav from "./components/MobileNav.vue";
import { useMarketplace } from "./composables/useMarketplace";

const route = useRoute();
const router = useRouter();
const {
  cancelLogout,
  closeProductImage,
  confirmLogout,
  error,
  initializeApp,
  notice,
  setRouter,
  showLogoutConfirm,
  selectedImage,
  syncRouteView,
  teardownApp
} = useMarketplace();

setRouter(router);

watch(
  () => route.name,
  (name) => syncRouteView(name),
  { immediate: true }
);

onMounted(() => {
  initializeApp();
});

onBeforeUnmount(() => {
  teardownApp();
});
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <main>
      <section v-if="notice || error" class="status-band" :class="{ error: error }">
        {{ error || notice }}
      </section>

      <RouterView />
    </main>

    <LogoutConfirm
      :open="showLogoutConfirm"
      @cancel="cancelLogout"
      @confirm="confirmLogout"
    />

    <ImagePreviewModal
      :image="selectedImage"
      @close="closeProductImage"
    />

    <MobileNav />
  </div>
</template>
