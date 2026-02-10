<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useStorageStore } from '../stores/storage';
import { computedAsync } from "@vueuse/core";
import {
  CryptoEncoderFactory,
  Hash,
  ProviderFactory,
  SeedEncoder,
  SignatureSchemeId,
  WalletCrypto
} from "@cmts-dev/carmentis-sdk/client";

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

// Node publication status
const nodeAccountId = computedAsync(async () => {
  if (!node.value?.vbId) return undefined;
  if (!wallet.value) return undefined;

  return Hash.from(node.value.vbId);
});

const isNodePublished = computed(() => {
  return nodeAccountId.value !== undefined;
});

// Check if node is claimed and by whom
const nodeOwnerAccountId = computedAsync(async () => {
  if (!nodeAccountId.value) return undefined;
  if (!wallet.value) return undefined;

  try {
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    const nodeVb = await provider.loadValidatorNodeVirtualBlockchain(Hash.from(node.value.vbId));
    const orgId = await nodeVb.getOrganizationId();
    return orgId;
  } catch (e) {
    console.error('Error loading node owner:', e);
    return undefined;
  }
});

const nodeOwnerName = computedAsync(async () => {
  if (!nodeOwnerAccountId.value) return undefined;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
  const orgVb = await provider.loadOrganizationVirtualBlockchain(nodeOwnerAccountId.value);
  const orgDesc = await orgVb.getDescription();
  return orgDesc.name;
})

const isNodeClaimed = computed(() => {
  return nodeOwnerAccountId.value !== undefined;
});

// Check if the wallet owns this node
const walletOrgId = computedAsync(async () => {
  if (!organization.value?.vbId) return undefined;
  return Hash.from(organization.value.vbId);
});

const isOwnedByWallet = computedAsync(async () => {
  if (!nodeOwnerAccountId.value || !walletOrgId.value) return false;
  const ownerHash = await nodeOwnerAccountId.value;
  const walletHash = await walletOrgId.value;
  return ownerHash.encode() === walletHash.encode();
});
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

      <!-- Node Information and Status Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <!-- Node Publication Status Card -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-xl"></i>
              <span>Publication Status</span>
            </div>
          </template>
          <template #content>
            <div v-if="!node.vbId" class="text-center py-8">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <i class="pi pi-question-circle text-2xl text-gray-400"></i>
              </div>
              <p class="text-sm text-gray-500">Node has no Virtual Blockchain ID</p>
            </div>
            <div v-else class="space-y-4">
              <!-- Publication Status -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Publication Status</label>
                <div class="flex items-center gap-2">
                  <div
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="isNodePublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                  >
                    <i class="pi" :class="isNodePublished ? 'pi-check-circle' : 'pi-times-circle'"></i>
                    {{ isNodePublished ? 'Published' : 'Not Published' }}
                  </div>
                </div>
              </div>

              <!-- Claimed Status -->
              <div v-if="isNodePublished">
                <label class="block text-sm font-medium text-gray-700 mb-2">Claim Status</label>
                <div class="flex items-center gap-2">
                  <div
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="isNodeClaimed ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                  >
                    <i class="pi" :class="isNodeClaimed ? 'pi-lock' : 'pi-unlock'"></i>
                    {{ isNodeClaimed ?
                      ( nodeOwnerName ? `Claimed by ${nodeOwnerName}` : 'Claimed' )
                      :
                      'Not Claimed' }}
                  </div>
                </div>
              </div>

              <!-- Owner Information -->
              <div v-if="isNodeClaimed && nodeOwnerAccountId">
                <label class="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                <div class="space-y-2">
                  <code class="bg-gray-100 px-3 py-2 rounded text-xs block overflow-x-auto">
                    {{ nodeOwnerAccountId.encode() }}
                  </code>
                  <div v-if="isOwnedByWallet" class="flex items-center gap-2 text-sm text-green-700">
                    <i class="pi pi-check-circle"></i>
                    <span>Owned by this wallet</span>
                  </div>
                  <div v-else class="flex items-center gap-2 text-sm text-orange-700">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span>Owned by another account</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
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
