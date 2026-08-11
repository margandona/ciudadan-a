import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { useSessionStore } from "./stores/session";
import "./styles/main.css";

const app = createApp(App);
app.use(createPinia());

const session = useSessionStore();
session.init().catch(() => {
  // error de red en emulador: la app sigue, las rutas públicas funcionan.
});

app.use(router);
app.mount("#app");
