<script setup>
import { useRoute } from "vue-router";
import { Home, MessageCircle, Plus, UserRound } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const route = useRoute();
const { goTo, isLoggedIn, unreadMessages } = useMarketplace();
</script>

<template>
  <nav class="mobile-nav" aria-label="Navegacion movil">
    <button :class="{ active: route.name === 'home' }" type="button" @click="goTo('home')">
      <Home :size="20" />
      Inicio
    </button>
    <button :class="{ active: route.name === 'publish' }" type="button" @click="goTo('publish')">
      <Plus :size="20" />
      Publicar
    </button>
    <button class="mobile-chat-link" :class="{ active: route.name === 'chat' }" type="button" @click="goTo('chat')">
      <MessageCircle :size="20" />
      Chat
      <span v-if="unreadMessages > 0">{{ unreadMessages }}</span>
    </button>
    <button
      :class="{ active: route.name === 'profile' || route.name === 'auth' }"
      type="button"
      @click="goTo(isLoggedIn ? 'profile' : 'auth')"
    >
      <UserRound :size="20" />
      {{ isLoggedIn ? "Perfil" : "Entrar" }}
    </button>
  </nav>
</template>
