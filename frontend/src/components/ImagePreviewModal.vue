<script setup>
import { computed, ref, watch } from "vue";

const emit = defineEmits(["close"]);

const props = defineProps({
  image: {
    type: Object,
    default: null
  }
});

const currentIndex = ref(0);

const items = computed(() => {
  if (Array.isArray(props.image?.items) && props.image.items.length) {
    return props.image.items;
  }

  return props.image?.url ? [{ url: props.image.url, mediaType: "image" }] : [];
});

const currentItem = computed(() => items.value[currentIndex.value] || null);
const hasMany = computed(() => items.value.length > 1);
const isVideo = (item) =>
  item?.mediaType === "video" ||
  item?.media_type === "video" ||
  item?.mimeType?.startsWith("video/") ||
  /\.(mp4|webm|mov)$/i.test(item?.url || "");

watch(
  () => props.image,
  (image) => {
    currentIndex.value = Number(image?.index || 0);
  },
  { immediate: true }
);

const move = (direction) => {
  if (!hasMany.value) return;
  currentIndex.value =
    (currentIndex.value + direction + items.value.length) % items.value.length;
};
</script>

<template>
  <Teleport to="body">
    <div v-if="props.image" class="image-modal" role="presentation" @click.self="emit('close')">
      <section class="image-dialog" role="dialog" aria-modal="true" aria-label="Galeria del producto">
        <button type="button" class="modal-close" @click="emit('close')">Cerrar</button>
        <div class="gallery-stage">
          <button v-if="hasMany" type="button" class="gallery-arrow left" @click="move(-1)">
            Anterior
          </button>
          <video
            v-if="currentItem && isVideo(currentItem)"
            :src="currentItem.url"
            controls
            playsinline
          ></video>
          <img v-else-if="currentItem" :src="currentItem.url" :alt="props.image.title" />
          <button v-if="hasMany" type="button" class="gallery-arrow right" @click="move(1)">
            Siguiente
          </button>
        </div>
        <div v-if="hasMany" class="gallery-dots">
          <button
            v-for="(item, index) in items"
            :key="item.id || item.url"
            :class="{ active: index === currentIndex }"
            type="button"
            @click="currentIndex = index"
          >
            {{ index + 1 }}
          </button>
        </div>
        <footer>
          <div>
            <strong>{{ props.image.title }}</strong>
            <span>{{ props.image.seller }}</span>
          </div>
          <b>{{ props.image.price }}</b>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
