<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["cancel", "confirm"]);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" role="presentation">
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title">
        <p class="eyebrow">Cerrar sesion</p>
        <h2 id="logout-title">¿Seguro que quieres salir?</h2>
        <p>
          Puedes volver a entrar con tu correo y contraseña. Tu perfil,
          publicaciones y conversaciones se conservan.
        </p>
        <div class="confirm-actions">
          <button type="button" @click="emit('cancel')">No</button>
          <button class="primary" type="button" @click="emit('confirm')">Si, salir</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
