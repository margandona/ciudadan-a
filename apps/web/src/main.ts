import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { useSessionStore } from "./stores/session";
import { useSyncStore } from "./stores/sync";
import { registerOfflineHandlers } from "./services/offlineSafe";
import "./styles/main.css";

void registerOfflineHandlers();

const app = createApp(App);
app.use(createPinia());

const session = useSessionStore();
session.init().catch(() => {
  // error de red en emulador: la app sigue, las rutas públicas funcionan.
});
useSyncStore().init();

app.use(router);
app.mount("#app");
