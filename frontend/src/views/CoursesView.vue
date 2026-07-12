<script setup>
import { ExternalLink } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const { completedCourseUrls, courses, isLoggedIn, markCourseCompleted } = useMarketplace();
</script>

<template>
  <section class="courses-layout">
    <div class="form-copy course-copy">
      <p class="eyebrow">Aprendizaje gratuito</p>
      <h1>Recursos para fortalecer tu emprendimiento.</h1>
      <p>
        Una seleccion de cursos y videos externos para aprender ventas,
        modelo de negocio, marketing y herramientas digitales.
      </p>
    </div>

    <div class="course-grid">
      <article v-for="course in courses" :key="course.url" class="course-card">
        <span>{{ course.provider }}</span>
        <h2>{{ course.title }}</h2>
        <a :href="course.url" target="_blank" rel="noreferrer">
          Ver recurso
          <ExternalLink :size="17" />
        </a>
        <button
          v-if="isLoggedIn"
          class="course-complete-button"
          type="button"
          :disabled="completedCourseUrls.includes(course.url)"
          @click="markCourseCompleted(course)"
        >
          {{ completedCourseUrls.includes(course.url) ? "Completado" : "Marcar como completado" }}
        </button>
      </article>
    </div>
  </section>
</template>
