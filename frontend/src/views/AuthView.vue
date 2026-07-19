<script setup>
import { useMarketplace } from "../composables/useMarketplace";

const {
  activeView,
  authButtonText,
  authForm,
  authMode,
  cancelRecovery,
  error,
  loading,
  notice,
  openRecovery,
  recoveryButtonText,
  recoveryForm,
  recoveryMethod,
  recoveryStep,
  submitAuth,
  submitRecovery
} = useMarketplace();
</script>

<template>
  <section class="form-band auth-band">
    <div class="form-copy">
      <p class="eyebrow">
        {{ activeView === "recovery" ? "Recuperar cuenta" : authMode === "register" ? "Crear cuenta" : "Bienvenida" }}
      </p>
      <h1>
        {{ activeView === "recovery" ? "Vuelve a entrar con seguridad." : authMode === "register" ? "Tu perfil emprendedor empieza aquí." : "Vuelve a tu espacio." }}
      </h1>
      <p>
        {{
          activeView === "recovery"
            ? "Te ayudamos a confirmar que la cuenta es tuya antes de cambiar la contraseña."
            : "Al entrar, tus publicaciones, perfil y conversaciones se mantienen ligados a tu cuenta."
        }}
      </p>
    </div>

    <form v-if="activeView === 'recovery'" class="panel-form" @submit.prevent="submitRecovery">
      <button class="back-chat" type="button" @click="cancelRecovery">
        Volver al inicio de sesión
      </button>

      <p v-if="error || notice" class="form-status" :class="{ error: error }">
        {{ error || notice }}
      </p>

      <div v-if="recoveryStep === 'request'" class="recovery-card">
        <strong>Elige cómo quieres recibir el código</strong>
        <div class="segmented compact-segmented">
          <button
            :class="{ active: recoveryMethod === 'email' }"
            type="button"
            @click="recoveryMethod = 'email'"
          >
            Correo
          </button>
          <button
            :class="{ active: recoveryMethod === 'sms' }"
            type="button"
            @click="recoveryMethod = 'sms'"
          >
            SMS
          </button>
        </div>
      </div>

      <label v-if="recoveryMethod === 'email' && recoveryStep !== 'password'">
        Correo
        <input
          v-mobile-keyboard
          v-model="recoveryForm.email"
          required
          type="email"
          inputmode="email"
          enterkeyhint="next"
          autocomplete="email"
          autocapitalize="none"
          spellcheck="false"
        />
      </label>

      <label v-if="recoveryMethod === 'sms' && recoveryStep !== 'password'">
        Teléfono
        <input
          v-mobile-keyboard
          v-model="recoveryForm.phone"
          required
          type="tel"
          inputmode="tel"
          enterkeyhint="next"
          autocomplete="tel"
        />
      </label>

      <label v-if="recoveryStep === 'verify'">
        Código recibido
        <input
          v-mobile-keyboard
          v-model="recoveryForm.code"
          required
          type="text"
          inputmode="numeric"
          enterkeyhint="next"
          autocomplete="one-time-code"
        />
      </label>

      <template v-if="recoveryStep === 'password'">
        <label>
          Nueva contraseña
          <input
            v-mobile-keyboard
            v-model="recoveryForm.password"
            required
            minlength="6"
            type="password"
            enterkeyhint="next"
            autocomplete="new-password"
          />
        </label>
        <label>
          Confirmar contraseña
          <input
            v-mobile-keyboard
            v-model="recoveryForm.confirmPassword"
            required
            minlength="6"
            type="password"
            enterkeyhint="done"
            autocomplete="new-password"
          />
        </label>
      </template>

      <button class="primary wide" type="submit" :disabled="loading">
        {{ recoveryButtonText }}
      </button>
    </form>

    <form v-else class="panel-form" @submit.prevent="submitAuth">
      <div class="segmented">
        <button
          :class="{ active: authMode === 'login' }"
          type="button"
          @click="authMode = 'login'"
        >
          Iniciar sesión
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
        Nombre del emprendimiento (opcional)
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
        Contraseña
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
        Teléfono
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

      <button
        v-if="authMode === 'login'"
        class="link-button auth-recovery-link"
        type="button"
        @click="openRecovery"
      >
        ¿Olvidaste tu contraseña? Recupérala ahora
      </button>
    </form>
  </section>
</template>
