import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import { useStorageStore } from './stores/storage.ts';
import { useSessionStore } from './stores/sessionStore.ts';
import router from './router';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import {QueryClient, VueQueryPlugin} from '@tanstack/vue-query';
import { getDb } from './db/database.ts';
import {Logger} from '@cmts-dev/carmentis-sdk-core';
import { configureSync, getConsoleSink } from "@logtape/logtape";

Logger.enableLogsSync();


import './style.css';

// create a query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30,   // 30 minutes
            refetchIntervalInBackground: true,
            refetchInterval: 2000,
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 1,
        },
    },
})


const app = createApp(App);
app.use(createPinia());
app.use(ToastService);
app.use(ConfirmationService);
app.use(VueQueryPlugin, {
    queryClient,
})
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.invalid-dark-mode',
        },
    },
});

// add router
app.use(router);

// disable unresolved directive (non-breaking warning)
app.config.warnHandler = (msg, instance, trace) => {
    if (msg.includes("Failed to resolve directive")) {
        return
    }

    console.warn(msg, trace)
}

app.mount('#app');


