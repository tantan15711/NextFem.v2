import { createRouter, createWebHistory } from "vue-router";
import { storage } from "../services/api";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue")
  },
  {
    path: "/entrar",
    name: "auth",
    component: () => import("../views/AuthView.vue")
  },
  {
    path: "/publicar",
    name: "publish",
    component: () => import("../views/PublishView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: "/perfil",
    name: "profile",
    component: () => import("../views/ProfileView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: "/chat",
    name: "chat",
    component: () => import("../views/ChatView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: "/aprender",
    name: "courses",
    component: () => import("../views/CoursesView.vue")
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !storage.getToken()) {
    return { name: "auth" };
  }

  if (to.name === "auth" && storage.getToken()) {
    return { name: "home" };
  }

  return true;
});

export default router;
