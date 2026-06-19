<script setup>
import { ExternalLink } from "lucide-vue-next";
import { useMarketplace } from "../composables/useMarketplace";

const { courses } = useMarketplace();
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
      </article>
    </div>
  </section>
</template>
