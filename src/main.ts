import { createApp } from "vue";
import App from "./App.vue";
import {createPinia} from "pinia";
import {useStorageStore} from "./stores/storage.ts";
import router from "./router";
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from "primevue/confirmationservice";
import { VueQueryPlugin } from '@tanstack/vue-query'


import './style.css';


const app = createApp(App);
app.use(createPinia())
app.use(router)
app.use(ToastService);
app.use(ConfirmationService);
app.use(VueQueryPlugin)
app.use(PrimeVue, {
	theme: {
		preset: Aura
	}
});



// we init the storage to load the wallets and the operators from the storage
const storage = useStorageStore();
storage.initStorage();

app.mount("#app");
