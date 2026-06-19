<script setup>
import { useMarketplace } from "../composables/useMarketplace";

const {
  authButtonText,
  authForm,
  authMode,
  error,
  loading,
  notice,
  submitAuth
} = useMarketplace();
</script>

<template>
  <section class="form-band auth-band">
    <div class="form-copy">
      <p class="eyebrow">{{ authMode === "register" ? "Crear cuenta" : "Bienvenida" }}</p>
      <h1>{{ authMode === "register" ? "Tu perfil emprendedor empieza aqui." : "Vuelve a tu espacio." }}</h1>
      <p>
        Al entrar, tus publicaciones, perfil y conversaciones se mantienen ligados
        a tu cuenta.
      </p>
    </div>

    <form class="panel-form" @submit.prevent="submitAuth">
      <div class="segmented">
        <button
          :class="{ active: authMode === 'login' }"
          type="button"
          @click="authMode = 'login'"
        >
          Iniciar sesion
        </button>
        <button
          :class="{ active: authMode === 'register' }"
          type="button"
          @click="authMode = 'register'"
        >
          Registro
        </button>
      </div>

      <p v-if="error || notice" class="form-status" :class="{ error: error }">
        {{ error || notice }}
      </p>

      <label v-if="authMode === 'register'">
        Nombre
        <input
          v-mobile-keyboard
          v-model="authForm.name"
          required
          type="text"
          inputmode="text"
          enterkeyhint="next"
          autocomplete="name"
        />
      </label>
      <label v-if="authMode === 'register'">
        Nombre del emprendimiento
        <input
          v-mobile-keyboard
          v-model="authForm.businessName"
          type="text"
          inputmode="text"
          enterkeyhint="next"
          autocomplete="organization"
        />
      </label>
      <label>
        Correo
        <input
          v-mobile-keyboard
          v-model="authForm.email"
          required
          type="email"
          inputmode="email"
          enterkeyhint="next"
          autocomplete="email"
          autocapitalize="none"
          spellcheck="false"
        />
      </label>
      <label>
        Contrasena
        <input
          v-mobile-keyboard
          v-model="authForm.password"
          required
          minlength="6"
          type="password"
          enterkeyhint="done"
          :autocomplete="authMode === 'register' ? 'new-password' : 'current-password'"
        />
      </label>
      <label v-if="authMode === 'register'">
        Telefono
        <input
          v-mobile-keyboard
          v-model="authForm.phone"
          type="tel"
          inputmode="tel"
          enterkeyhint="next"
          autocomplete="tel"
        />
      </label>
      <label v-if="authMode === 'register'">
        Ciudad
        <input
          v-mobile-keyboard
          v-model="authForm.city"
          type="text"
          inputmode="text"
          enterkeyhint="done"
          autocomplete="address-level2"
        />
      </label>
      <button class="primary wide" type="submit" :disabled="loading">
        {{ authButtonText }}
      </button>
    </form>
  </section>
</template>
