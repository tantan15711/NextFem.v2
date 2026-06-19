<script setup>
import { useRoute } from "vue-router";
import {
  Bell,
  GraduationCap,
  LogOut,
  MessageCircle,
  Plus,
  UserRound
} from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const route = useRoute();
const {
  closeNotificationsPanel,
  goTo,
  isLoggedIn,
  markNotificationsRead,
  notificationPanelOpen,
  notifications,
  openNotification,
  requestLogout,
  requestBrowserNotifications,
  unreadMessages,
  unreadNotifications,
  toggleNotificationsPanel
} = useMarketplace();

const notificationTime = (notification) =>
  new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(notification.created_at));
</script>

<template>
  <header class="topbar">
    <button class="brand" type="button" @click="goTo('home')">
      <span class="brand-mark logo-mark">
        <img src="/nextfem-logo.svg" alt="" />
      </span>
      <span>
        <strong>NextFem</strong>
        <small>Marketplace de emprendedoras</small>
      </span>
    </button>

    <nav class="nav-actions">
      <button :class="{ active: route.name === 'home' }" type="button" @click="goTo('home')">
        Inicio
      </button>
      <button :class="{ active: route.name === 'publish' }" type="button" @click="goTo('publish')">
        <Plus :size="18" />
        Publicar
      </button>
      <button class="chat-nav-button" :class="{ active: route.name === 'chat' }" type="button" @click="goTo('chat')">
        <MessageCircle :size="18" />
        Chat
        <span v-if="unreadMessages > 0" class="nav-badge">{{ unreadMessages }}</span>
      </button>
      <div v-if="isLoggedIn" class="notification-menu">
        <button class="chat-nav-button" type="button" @click="toggleNotificationsPanel">
          <Bell :size="18" />
          Notificaciones
          <span v-if="unreadNotifications > 0" class="nav-badge">{{ unreadNotifications }}</span>
        </button>
        <section v-if="notificationPanelOpen" class="notification-panel">
          <header>
            <strong>Notificaciones</strong>
            <button type="button" @click="closeNotificationsPanel">Cerrar</button>
          </header>
          <div class="notification-actions">
            <button type="button" @click="requestBrowserNotifications">
              Activar avisos
            </button>
            <button type="button" @click="markNotificationsRead">
              Marcar leidas
            </button>
          </div>
          <button
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ unread: !notification.is_read }"
            type="button"
            @click="openNotification(notification)"
          >
            <span>
              <strong>{{ notification.title }}</strong>
              <small>{{ notification.body }}</small>
            </span>
            <time>{{ notificationTime(notification) }}</time>
          </button>
          <p v-if="notifications.length === 0">No tienes notificaciones nuevas.</p>
        </section>
      </div>
      <button :class="{ active: route.name === 'courses' }" type="button" @click="goTo('courses')">
        <GraduationCap :size="18" />
        Aprender
      </button>
      <button v-if="isLoggedIn" :class="{ active: route.name === 'profile' }" type="button" @click="goTo('profile')">
        <UserRound :size="18" />
        Perfil
      </button>
      <button v-if="!isLoggedIn" class="primary" type="button" @click="goTo('auth')">
        Entrar
      </button>
      <button v-else class="logout-button" title="Cerrar sesion" type="button" @click="requestLogout">
        <LogOut :size="18" />
        Salir
      </button>
    </nav>
  </header>
</template>
