import { createApp } from "vue";
import App from "./App.vue";
import {createPinia} from "pinia";
import {useStorageStore} from "./stores/storage.ts";
import router from "./router";
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import './style.css';


const app = createApp(App);
app.use(createPinia())
app.use(router)
app.use(ToastService);
app.use(PrimeVue, {
	theme: {
		preset: Aura
	}
});



// application setup
const storage = useStorageStore();
await storage.initStorage();

app.mount("#app");
