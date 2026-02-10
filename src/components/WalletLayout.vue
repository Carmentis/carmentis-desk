<script setup lang="ts">
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import WalletSidebar from './WalletSidebar.vue';

const route = useRoute();

const walletId = computed(() => {
  // Extract walletId from different route params
  if (route.params.walletId) {
    return Number(route.params.walletId);
  }
  if (route.params.id) {
    return Number(route.params.id);
  }
  return null;
});
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div v-if="walletId" class="w-64 flex-shrink-0">
      <WalletSidebar :wallet-id="walletId" />
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-auto">
      <div class="container mx-auto p-6">
        <router-view />
      </div>
    </div>
  </div>
</template>
