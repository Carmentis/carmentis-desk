<script setup lang="ts">
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';

import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { getCurrentWindow } from '@tauri-apps/api/window'; // Import important

const appWindow = getCurrentWindow();
const router = useRouter();

// On définit la logique de redirection
async function handleDeepLink(urls: string[]) {
  for (const url of urls) {
    console.log(`Handling deep link: ${url}`);
    if (url.startsWith('cmts://connect/carmentis-relay')) {
      await appWindow.unminimize(); // Au cas où elle est réduite
      await appWindow.show();       // S'assurer qu'elle est visible
      await appWindow.setFocus();   // Donner le focus clavier/souris

      // On extrait le chemin après le protocole
      const path = url.replace('cmts://connect/carmentis-relay', '');
      await router.push(`/connect/walletRequest${path}`);
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
    <ConfirmDialog/>
    <Toast position="top-center"/>

    <!-- Main Content -->
    <main class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense>
        <router-view />
        <template #fallback>
          Loading...
        </template>
      </Suspense>
    </main>
  </div>
</template>
