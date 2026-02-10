<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useStorageStore } from '../stores/storage';

const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

const wallet = computed(() =>
  storageStore.organizations.find(w => w.id === walletId.value)
);

const organization = computed(() =>
  wallet.value?.organizations.find(org => org.id === orgId.value)
);

const node = computed(() =>
  organization.value?.nodes.find(n => n.id === nodeId.value)
);

const goBack = () => {
  router.push(`/wallet/${walletId.value}/organization/${orgId.value}`);
};
</script>

<template>
  <div class="space-y-6">
    <div v-if="node && wallet && organization">
      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ node.name }}</h1>
          <p class="text-sm text-gray-500 mt-1">Node ID: {{ node.id }} • Organization: #{{ organization.id }} • Wallet: {{ wallet.name }}</p>
        </div>
        <div class="flex gap-2">
          <Button @click="goBack" label="Back to Organization" icon="pi pi-arrow-left" outlined />
        </div>
      </div>

      <!-- Node Information Card -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-sitemap text-xl"></i>
            <span>Node Information</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Node Name</label>
              <div class="text-gray-900">{{ node.name }}</div>
            </div>

            <div v-if="node.vbId">
              <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Blockchain ID</label>
              <code class="bg-gray-100 px-3 py-2 rounded text-sm block overflow-x-auto">{{ node.vbId }}</code>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RPC Endpoint</label>
              <div class="flex items-center gap-2 text-gray-600">
                <i class="pi pi-globe"></i>
                <span class="text-sm">{{ node.rpcEndpoint }}</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Node Not Found</h1>
      <p class="text-gray-500 mb-6">The node you're looking for doesn't exist.</p>
      <Button @click="router.push('/')" label="Back to Home" icon="pi pi-home" />
    </div>
  </div>
</template>
