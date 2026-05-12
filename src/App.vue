<script setup lang="ts">
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { getCurrentWindow } from '@tauri-apps/api/window';
import OpenIdDeepLinkHandler from './components/openid/OpenIdDeepLinkHandler.vue';
import OpenIdCredentialOfferDeepLinkHandler from './components/openid/OpenIdCredentialOfferDeepLinkHandler.vue';
import AppNavbar from './components/AppNavbar.vue';
import AppBreadcrumb from './components/AppBreadcrumb.vue';
import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';

function forwardConsole(
    fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
    logger: (message: string) => Promise<void>
) {
  const original = console[fnName];
  console[fnName] = (message) => {
    original(message);
    logger(message);
  };
}

forwardConsole('log', trace);
forwardConsole('debug', debug);
forwardConsole('info', info);
forwardConsole('warn', warn);
forwardConsole('error', error);

const appWindow = getCurrentWindow();
const router = useRouter();
const openidQuery = ref<string>('');
const openidCredentialOfferQuery = ref<string>('');

// On définit la logique de redirection
async function handleDeepLink(urls: string[]) {
    console.log('Handling deep link:', urls);
    for (const url of urls) {
        console.log(`Handling deep link: ${url}`);
        // handling carmentis-specific URL
        if (url.startsWith('cmts://connect/carmentis-relay')) {
            await appWindow.unminimize(); // Au cas où elle est réduite
            await appWindow.show(); // S'assurer qu'elle est visible
            await appWindow.setFocus(); // Donner le focus clavier/souris

            // On extrait le chemin après le protocole
            const path = url.replace('cmts://connect/carmentis-relay', '');
            await router.push(`/connect/walletRequest${path}`);
        }

        // handling openid-specific URL
        if (url.startsWith('openid://')) {
            console.log('Handling OpenID URL:', url);
            openidQuery.value = url;
        }

        // handling openid-credential-offer-specific URL
        if (url.startsWith('openid-credential-offer://')) {
            console.log('Handling OpenID Credential Offer URL:', url);
            openidCredentialOfferQuery.value = url;
        }
    }
}

// On initialise les écouteurs dans onMounted
onMounted(async () => {
    try {
        // 1. Vérifier si l'app a été lancée via un lien (Deep Link au démarrage)
        const startUrls = await getCurrent();
        if (startUrls && startUrls.length > 0) {
            await handleDeepLink(startUrls);
        }

        // 2. Écouter les liens ouverts pendant que l'app tourne déjà
        await onOpenUrl(async (urls) => {
            console.log('Deep link reçu (running):', urls);
            await handleDeepLink(urls);
        });
    } catch (error) {
        console.error("Erreur lors de l'initialisation du Deep Link:", error);
    }
});
</script>

<template>
    <div class="min-h-screen bg-gray-50">
        <ConfirmDialog />
        <Toast position="top-center" />

        <AppNavbar />
        <AppBreadcrumb />

        <!-- Main Content -->
        <main class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <OpenIdDeepLinkHandler :uri="openidQuery" />
            <OpenIdCredentialOfferDeepLinkHandler :uri="openidCredentialOfferQuery" />
            <Suspense>
                <router-view />
                <template #fallback>
                    <div class="w-full h-full flex items-center justify-center">
                        <ProgressSpinner />
                    </div>
                </template>
            </Suspense>
        </main>
    </div>
</template>
