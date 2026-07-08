<script setup lang="ts">
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { getCurrentWindow } from '@tauri-apps/api/window';
import OpenIdDeepLinkHandler from './components/openid/OpenIdDeepLinkHandler.vue';
import OpenIdCredentialOfferDeepLinkHandler from './components/openid/OpenIdCredentialOfferDeepLinkHandler.vue';

const appWindow = getCurrentWindow();
const router = useRouter();
const openidQuery = ref<string>('');
const openidCredentialOfferQuery = ref<string>('');

async function handleDeepLink(urls: string[]) {
    console.log('Handling deep link:', urls);
    for (const url of urls) {
        console.log(`Handling deep link: ${url}`);
        if (url.startsWith('cmts://connect/carmentis-relay')) {
            await appWindow.unminimize();
            await appWindow.show();
            await appWindow.setFocus();
            const path = url.replace('cmts://connect/carmentis-relay', '');
            await router.push(`/connect/rpc${path}`);
        }
        if (url.startsWith('openid://')) {
            console.log('Handling OpenID URL:', url);
            openidQuery.value = url;
        }
        if (url.startsWith('openid-credential-offer://')) {
            console.log('Handling OpenID Credential Offer URL:', url);
            openidCredentialOfferQuery.value = url;
        }
    }
}

onMounted(async () => {
    try {
        const startUrls = await getCurrent();
        if (startUrls && startUrls.length > 0) {
            await handleDeepLink(startUrls);
        }
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

        <OpenIdDeepLinkHandler :uri="openidQuery" />
        <OpenIdCredentialOfferDeepLinkHandler :uri="openidCredentialOfferQuery" />

        <Suspense>
            <router-view :key="$route.fullPath" />
            <template #fallback>
                <div class="w-full h-full flex items-center justify-center">
                    <ProgressSpinner />
                </div>
            </template>
        </Suspense>
    </div>
</template>
