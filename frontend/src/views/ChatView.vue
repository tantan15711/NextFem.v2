<script setup>
import { computed, nextTick, ref, watch } from "vue";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  File,
  MapPin,
  Mic,
  MoreVertical,
  Navigation,
  Paperclip,
  Plus,
  Send,
  Shield,
  Sparkles,
  Square,
  Trash2,
  X
} from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const mediaInput = ref(null);
const messageStream = ref(null);
const activeMessageMenuId = ref(null);
const chatToolsOpen = ref(false);

const {
  chatDraft,
  contactSeller,
  contactProduct,
  conversations,
  chatLocationDraft,
  chatMediaFile,
  chatMediaPreview,
  clearChatMedia,
  clearLocationDraft,
  closeConversation,
  conversationSummary,
  deleteMessage,
  blockSelectedConversationUser,
  emitTyping,
  isRecordingAudio,
  messages,
  onChatMediaChange,
  prepareLocationMessage,
  safetyNotice,
  selectedConversation,
  selectedConversationBlocked,
  selectedTypingNames,
  selectConversation,
  sendMessage,
  startConversation,
  startAudioRecording,
  stopAudioRecording,
  summarizeConversationWithAI,
  unblockSelectedConversationUser,
  undoLastAction,
  undoToast,
  user
} = useMarketplace();

const messageTime = (message) =>
  new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(message.created_at));

const conversationTime = (conversation) =>
  new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(conversation.last_message_created_at || conversation.updated_at));

const dayKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const dayLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return "Hoy";
  if (dayKey(date) === dayKey(yesterday)) return "Ayer";

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);
};

const messageItems = computed(() => {
  const items = [];
  let lastDay = "";

  messages.value
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((message) => {
      const key = dayKey(message.created_at);
      if (key !== lastDay) {
        items.push({
          type: "date",
          key: `date-${key}`,
          label: dayLabel(message.created_at)
        });
        lastDay = key;
      }
      items.push({
        type: "message",
        key: `message-${message.id}`,
        message
      });
    });

  return items;
});

const mapUrl = (message) =>
  `https://www.google.com/maps?q=${message.latitude},${message.longitude}`;

const isMine = (message) => String(message.sender_id) === String(user.value?.id);

const avatarInitial = (conversation) =>
  (conversation.other_user_name || conversation.product_title || "N").slice(0, 1).toUpperCase();

const toggleMessageMenu = (message) => {
  activeMessageMenuId.value =
    String(activeMessageMenuId.value) === String(message.id) ? null : message.id;
};

const handleDeleteMessage = async (message, scope) => {
  if (
    scope === "everyone" &&
    !window.confirm("¿Borrar este mensaje para todos? Esta acción afectará a la otra usuaria.")
  ) {
    return;
  }

  activeMessageMenuId.value = null;
  await deleteMessage(message, scope);
};

const scrollMessagesToBottom = async () => {
  await nextTick();
  if (!messageStream.value) return;
  messageStream.value.scrollTop = messageStream.value.scrollHeight;
};

watch(
  () => messages.value.map((message) => `${message.id}-${message.created_at}`).join("|"),
  () => scrollMessagesToBottom()
);

watch(
  () => selectedConversation.value?.id,
  () => scrollMessagesToBottom()
);
</script>

<template>
  <section
    class="chat-layout"
    :class="{ 'conversation-open': selectedConversation || contactProduct || contactSeller }"
  >
    <aside v-if="!contactProduct && !contactSeller" class="conversation-list chat-inbox">
      <div class="section-heading compact inbox-heading">
        <div>
          <p class="eyebrow">Mensajes</p>
          <h2>Chats</h2>
        </div>
      </div>

      <article
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item inbox-item"
        @click="selectConversation(conversation)"
      >
        <img v-if="conversation.product_image_url" :src="conversation.product_image_url" alt="" />
        <span v-else class="conversation-avatar">{{ avatarInitial(conversation) }}</span>
        <div class="conversation-main">
          <strong>{{ conversation.other_user_name }}</strong>
          <p>{{ conversation.last_message || "Sin mensajes todavía." }}</p>
        </div>
        <div class="conversation-side">
          <time>{{ conversationTime(conversation) }}</time>
          <b v-if="conversation.unread_count > 0">{{ conversation.unread_count }}</b>
        </div>
        <small>{{ conversation.product_title }}</small>
      </article>

      <div v-if="conversations.length === 0" class="empty-state">
        No tienes conversaciones abiertas.
      </div>
    </aside>

    <section v-if="selectedConversation || contactProduct || contactSeller" class="message-panel chat-thread">
      <div v-if="contactProduct || contactSeller" class="new-chat-box">
        <button class="back-chat" type="button" @click="closeConversation">
          <ArrowLeft :size="18" />
          Volver
        </button>
        <p class="eyebrow">Nuevo chat</p>
        <h2>{{ contactProduct?.title || contactSeller?.business_name || contactSeller?.name }}</h2>
        <textarea
          v-mobile-keyboard
          v-model="chatDraft.initialMessage"
          rows="3"
          inputmode="text"
          enterkeyhint="send"
          autocomplete="off"
          :placeholder="contactSeller ? 'Escribe tu mensaje para la vendedora...' : ''"
        ></textarea>
        <button class="primary" type="button" @click="startConversation">
          <Send :size="17" />
          Enviar mensaje
        </button>
      </div>

      <template v-if="selectedConversation">
        <div class="message-heading chat-top">
          <button class="back-chat" type="button" @click="closeConversation">
            <ArrowLeft :size="18" />
            Chats
          </button>
          <img v-if="selectedConversation.product_image_url" :src="selectedConversation.product_image_url" alt="" />
          <div>
            <p class="eyebrow">{{ selectedConversation.product_title }}</p>
            <h2>{{ selectedConversation.other_user_name }}</h2>
            <span v-if="selectedTypingNames.length">
              {{ selectedTypingNames.join(", ") }} está escribiendo...
            </span>
            <span v-else-if="selectedConversationBlocked">Usuaria bloqueada</span>
            <span v-else>Mensajes directos y seguros</span>
          </div>
          <button
            v-if="selectedConversationBlocked"
            class="back-chat"
            type="button"
            @click="unblockSelectedConversationUser"
          >
            <Shield :size="17" />
            Desbloquear
          </button>
          <button
            v-else
            class="back-chat"
            type="button"
            @click="blockSelectedConversationUser"
          >
            <Shield :size="17" />
            Bloquear
          </button>
          <button
            class="back-chat"
            type="button"
            @click="summarizeConversationWithAI"
          >
            <Sparkles :size="17" />
            Resumir
          </button>
        </div>

        <div ref="messageStream" class="message-stream">
          <template v-for="item in messageItems" :key="item.key">
            <div v-if="item.type === 'date'" class="message-day-divider">
              {{ item.label }}
            </div>

            <article
              v-else
              class="message-bubble"
              :class="{
                mine: isMine(item.message),
                deleted: item.message.is_deleted_for_everyone,
                pending: item.message.is_local
              }"
            >
              <button
                class="message-menu-button"
                title="Opciones del mensaje"
                type="button"
                @click="toggleMessageMenu(item.message)"
              >
                <MoreVertical :size="16" />
              </button>
              <div v-if="String(activeMessageMenuId) === String(item.message.id)" class="message-actions-menu">
                <button type="button" @click="handleDeleteMessage(item.message, 'me')">
                  <Trash2 :size="15" />
                  Borrar para mí
                </button>
                <button
                  v-if="isMine(item.message) && !item.message.is_deleted_for_everyone"
                  type="button"
                  @click="handleDeleteMessage(item.message, 'everyone')"
                >
                  <Trash2 :size="15" />
                  Borrar para todos
                </button>
              </div>

              <span>{{ item.message.sender_name }}</span>

              <p v-if="item.message.is_deleted_for_everyone" class="deleted-message">
                {{ item.message.body }}
              </p>
              <template v-else-if="item.message.message_type === 'image'">
                <img class="chat-image" :src="item.message.media_url" :alt="item.message.media_name || item.message.body" />
                <p v-if="item.message.body && item.message.body !== 'Imagen'">{{ item.message.body }}</p>
              </template>
              <template v-else-if="item.message.message_type === 'video'">
                <video class="chat-video" :src="item.message.media_url" controls></video>
                <p v-if="item.message.body && item.message.body !== 'Video'">{{ item.message.body }}</p>
              </template>
              <template v-else-if="item.message.message_type === 'audio'">
                <audio class="chat-audio" :src="item.message.media_url" controls></audio>
                <p v-if="item.message.body && item.message.body !== 'Audio'">{{ item.message.body }}</p>
              </template>
              <template v-else-if="item.message.message_type === 'location'">
                <a class="location-card" :href="mapUrl(item.message)" target="_blank" rel="noreferrer">
                  <MapPin :size="19" />
                  <span>
                    <strong>{{ item.message.location_mode === "realtime" ? "Ubicación en tiempo real" : "Ubicación fija" }}</strong>
                    {{ item.message.location_label || "Abrir en mapa" }}
                  </span>
                </a>
                <p v-if="item.message.body">{{ item.message.body }}</p>
              </template>
              <template v-else-if="item.message.message_type === 'file'">
                <a class="file-card" :href="item.message.media_url" target="_blank" rel="noreferrer">
                  <File :size="18" />
                  {{ item.message.media_name || "Abrir archivo" }}
                </a>
                <p v-if="item.message.body && item.message.body !== 'Archivo'">{{ item.message.body }}</p>
              </template>
              <p v-else>{{ item.message.body }}</p>

              <footer
                v-if="isMine(item.message)"
                class="message-state"
                :class="{ read: item.message.read_at }"
              >
                <CheckCheck v-if="item.message.read_at" :size="16" />
                <Check v-else :size="16" />
                <small>{{ item.message.read_at ? "Visto" : "Enviado" }} - {{ messageTime(item.message) }}</small>
              </footer>
              <footer v-else class="message-state">
                <small>{{ messageTime(item.message) }}</small>
              </footer>
            </article>
          </template>
        </div>

        <section v-if="conversationSummary" class="chat-summary-card">
          <div>
            <p class="eyebrow">Resumen de la conversación</p>
            <h3>Puntos importantes</h3>
          </div>
          <p>{{ conversationSummary.summary }}</p>
          <ul v-if="conversationSummary.pendingQuestions?.length">
            <li v-for="question in conversationSummary.pendingQuestions" :key="question">
              {{ question }}
            </li>
          </ul>
          <strong>{{ conversationSummary.suggestedNextStep }}</strong>
        </section>

        <p v-if="safetyNotice" class="safety-note">{{ safetyNotice }}</p>

        <p v-if="selectedConversationBlocked" class="safety-note">
          Bloqueaste a esta usuaria. Desbloquéala si quieres volver a conversar.
        </p>

        <div v-if="chatMediaFile || chatLocationDraft" class="compose-preview">
          <img v-if="chatMediaPreview" :src="chatMediaPreview" alt="" />
          <span v-else-if="chatMediaFile">{{ chatMediaFile.name }}</span>
          <span v-else>{{ chatLocationDraft.locationLabel }}</span>
          <button v-if="chatMediaFile" type="button" @click="clearChatMedia">
            <X :size="16" />
            Quitar
          </button>
          <button v-else type="button" @click="clearLocationDraft">
            <X :size="16" />
            Quitar
          </button>
        </div>

        <Transition name="tools-slide">
          <div v-if="chatToolsOpen" class="compose-tools-panel">
            <button title="Adjuntar multimedia" type="button" @click="mediaInput?.click(); chatToolsOpen = false">
              <Paperclip :size="18" />
              Multimedia
            </button>
            <button
              v-if="!isRecordingAudio"
              title="Grabar audio"
              type="button"
              @click="startAudioRecording(); chatToolsOpen = false"
            >
              <Mic :size="18" />
              Audio
            </button>
            <button
              v-else
              class="recording"
              title="Detener grabación"
              type="button"
              @click="stopAudioRecording(); chatToolsOpen = false"
            >
              <Square :size="18" />
              Detener
            </button>
            <button title="Compartir ubicación fija" type="button" @click="prepareLocationMessage(false); chatToolsOpen = false">
              <MapPin :size="18" />
              Ubicación fija
            </button>
            <button title="Compartir ubicación en tiempo real" type="button" @click="prepareLocationMessage(true); chatToolsOpen = false">
              <Navigation :size="18" />
              Tiempo real
            </button>
          </div>
        </Transition>

        <form class="message-compose" @submit.prevent="sendMessage">
          <input
            ref="mediaInput"
            class="hidden-input"
            type="file"
            accept="image/*,video/mp4,video/webm,audio/*,application/pdf"
            @change="onChatMediaChange"
          />
          <button
            class="compose-tools-toggle"
            title="Opciones"
            type="button"
            :aria-expanded="chatToolsOpen"
            @click="chatToolsOpen = !chatToolsOpen"
          >
            <Plus :size="20" />
            Opciones
          </button>
          <input
            v-mobile-keyboard
            v-model="chatDraft.message"
            type="text"
            inputmode="text"
            enterkeyhint="send"
            autocomplete="off"
            placeholder="Mensaje"
            :disabled="selectedConversationBlocked"
            @input="emitTyping"
          />
          <button class="primary icon-send" title="Enviar" type="submit" :disabled="selectedConversationBlocked">
            <Send :size="18" />
          </button>
        </form>
      </template>
    </section>

    <div v-if="undoToast" class="undo-snackbar">
      <span>{{ undoToast.message }}</span>
      <button type="button" @click="undoLastAction">
        {{ undoToast.working ? "Restaurando..." : "DESHACER" }}
      </button>
    </div>
  </section>
</template>
