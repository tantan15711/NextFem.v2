<script setup>
import { nextTick, ref, watch } from "vue";
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

const {
  chatDraft,
  contactProduct,
  conversations,
  applyQuickReply,
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
  loadConversations,
  messages,
  onChatMediaChange,
  prepareLocationMessage,
  quickReplies,
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

const mapUrl = (message) =>
  `https://www.google.com/maps?q=${message.location_lat},${message.location_lng}`;

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
    !window.confirm("Borrar este mensaje para todos? Esta accion afectara a la otra usuaria.")
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
  () => messages.value.length,
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
    :class="{ 'conversation-open': selectedConversation || contactProduct }"
  >
    <aside v-if="!selectedConversation && !contactProduct" class="conversation-list chat-inbox">
      <div class="section-heading compact inbox-heading">
        <div>
          <p class="eyebrow">Mensajes</p>
          <h2>Chats</h2>
        </div>
        <button type="button" @click="loadConversations">Actualizar</button>
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
          <p>{{ conversation.last_message || "Sin mensajes todavia." }}</p>
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

    <section v-if="selectedConversation || contactProduct" class="message-panel chat-thread">
      <div v-if="contactProduct" class="new-chat-box">
        <button class="back-chat" type="button" @click="closeConversation">
          <ArrowLeft :size="18" />
          Volver
        </button>
        <p class="eyebrow">Nuevo chat</p>
        <h2>{{ contactProduct.title }}</h2>
        <textarea
          v-mobile-keyboard
          v-model="chatDraft.initialMessage"
          rows="3"
          inputmode="text"
          enterkeyhint="send"
          autocomplete="off"
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
              {{ selectedTypingNames.join(", ") }} esta escribiendo...
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
          <article
            v-for="message in messages"
            :key="message.id"
            class="message-bubble"
            :class="{
              mine: isMine(message),
              deleted: message.is_deleted_for_everyone
            }"
          >
            <button
              class="message-menu-button"
              title="Opciones del mensaje"
              type="button"
              @click="toggleMessageMenu(message)"
            >
              <MoreVertical :size="16" />
            </button>
            <div v-if="String(activeMessageMenuId) === String(message.id)" class="message-actions-menu">
              <button type="button" @click="handleDeleteMessage(message, 'me')">
                <Trash2 :size="15" />
                Borrar para mi
              </button>
              <button
                v-if="isMine(message) && !message.is_deleted_for_everyone"
                type="button"
                @click="handleDeleteMessage(message, 'everyone')"
              >
                <Trash2 :size="15" />
                Borrar para todos
              </button>
            </div>

            <span>{{ message.sender_name }}</span>

            <p v-if="message.is_deleted_for_everyone" class="deleted-message">
              {{ message.body }}
            </p>
            <template v-else-if="message.message_type === 'image'">
              <img class="chat-image" :src="message.media_url" :alt="message.media_name || message.body" />
              <p v-if="message.body && message.body !== 'Imagen'">{{ message.body }}</p>
            </template>
            <template v-else-if="message.message_type === 'video'">
              <video class="chat-video" :src="message.media_url" controls></video>
              <p v-if="message.body && message.body !== 'Video'">{{ message.body }}</p>
            </template>
            <template v-else-if="message.message_type === 'audio'">
              <audio class="chat-audio" :src="message.media_url" controls></audio>
              <p v-if="message.body && message.body !== 'Audio'">{{ message.body }}</p>
            </template>
            <template v-else-if="message.message_type === 'location'">
              <a class="location-card" :href="mapUrl(message)" target="_blank" rel="noreferrer">
                <MapPin :size="19" />
                <span>
                  <strong>{{ message.location_live ? "Ubicacion en tiempo real" : "Ubicacion fija" }}</strong>
                  {{ message.location_label || "Abrir en mapa" }}
                </span>
              </a>
              <p v-if="message.body">{{ message.body }}</p>
            </template>
            <template v-else-if="message.message_type === 'file'">
              <a class="file-card" :href="message.media_url" target="_blank" rel="noreferrer">
                <File :size="18" />
                {{ message.media_name || "Abrir archivo" }}
              </a>
              <p v-if="message.body && message.body !== 'Archivo'">{{ message.body }}</p>
            </template>
            <p v-else>{{ message.body }}</p>

            <footer
              v-if="isMine(message)"
              class="message-state"
              :class="{ read: message.read_at }"
            >
              <CheckCheck v-if="message.read_at" :size="16" />
              <Check v-else :size="16" />
              <small>{{ message.read_at ? "Visto" : "Enviado" }} - {{ messageTime(message) }}</small>
            </footer>
            <footer v-else class="message-state">
              <small>{{ messageTime(message) }}</small>
            </footer>
          </article>
        </div>

        <div v-if="quickReplies.length" class="quick-replies">
          <button
            v-for="reply in quickReplies"
            :key="reply"
            type="button"
            @click="applyQuickReply(reply)"
          >
            {{ reply }}
          </button>
        </div>

        <section v-if="conversationSummary" class="chat-summary-card">
          <div>
            <p class="eyebrow">Impulso IA</p>
            <h3>Resumen de la conversacion</h3>
            <small>{{ conversationSummary.aiMode === "openai" ? "IA conectada" : "IA local" }}</small>
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
          Bloqueaste a esta usuaria. Desbloqueala si quieres volver a conversar.
        </p>

        <form class="message-compose" @submit.prevent="sendMessage">
          <input
            ref="mediaInput"
            class="hidden-input"
            type="file"
            accept="image/*,video/mp4,video/webm,audio/*,application/pdf"
            @change="onChatMediaChange"
          />
          <button title="Adjuntar multimedia" type="button" @click="mediaInput?.click()">
            <Paperclip :size="18" />
            Multimedia
          </button>
          <button
            v-if="!isRecordingAudio"
            title="Grabar audio"
            type="button"
            @click="startAudioRecording"
          >
            <Mic :size="18" />
            Audio
          </button>
          <button
            v-else
            class="recording"
            title="Detener grabacion"
            type="button"
            @click="stopAudioRecording"
          >
            <Square :size="18" />
            Detener
          </button>
          <button title="Compartir ubicacion fija" type="button" @click="prepareLocationMessage(false)">
            <MapPin :size="18" />
            Fija
          </button>
          <button title="Compartir ubicacion en tiempo real" type="button" @click="prepareLocationMessage(true)">
            <Navigation :size="18" />
            Tiempo real
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
