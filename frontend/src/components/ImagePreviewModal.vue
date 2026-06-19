<script setup>
defineProps({
  image: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["close"]);
</script>

<template>
  <Teleport to="body">
    <div v-if="image" class="image-modal" role="presentation" @click.self="emit('close')">
      <section class="image-dialog" role="dialog" aria-modal="true" aria-label="Imagen del producto">
        <button type="button" class="modal-close" @click="emit('close')">Cerrar</button>
        <img :src="image.url" :alt="image.title" />
        <footer>
          <div>
            <strong>{{ image.title }}</strong>
            <span>{{ image.seller }}</span>
          </div>
          <b>{{ image.price }}</b>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
