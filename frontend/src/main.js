import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { mobileKeyboard } from "./directives/mobileKeyboard";
import "./styles/app.css";

createApp(App)
  .directive("mobile-keyboard", mobileKeyboard)
  .use(router)
  .mount("#app");
