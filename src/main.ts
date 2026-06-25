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

// Open DB (runs migrations), initialize session state, THEN install router
// (router must be installed after session.initialize() because Vue Router 4
// triggers the initial navigation — and therefore beforeEach guards — at
// app.use(router) time, before app.mount()).
getDb()
    .then(async () => {
        const storage = useStorageStore();
        const session = useSessionStore();
        await Promise.all([storage.initStorage(), session.initialize()]);
    })
    .catch((err) => console.error('Failed to initialize database:', err))
    .finally(() => {
        app.use(router);
        app.mount('#app');
    });
