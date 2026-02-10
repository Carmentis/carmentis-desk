<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useStorageStore } from '../stores/storage';
import { SeedEncoder, WalletCrypto } from "@cmts-dev/carmentis-sdk/client";

const router = useRouter();
const storageStore = useStorageStore();

const organizationName = ref('');
const seed = ref('');
const nodeEndpoint = ref('https://ares.testnet.carmentis.io');

const isGeneratingSeed = ref(false);
const generateSeed = () => {
  isGeneratingSeed.value = true;
  try {
    const generatedWallet = WalletCrypto.generateWallet();
    const seedEncoder = new SeedEncoder();
    seed.value = seedEncoder.encode(generatedWallet.getSeedAsBytes());
  } finally {
    isGeneratingSeed.value = false;
  }
}

const createOrganization = async () => {
  if (!organizationName.value) return;
  if (!seed.value) return;
  await storageStore.addOrganization({
    name: organizationName.value,
    seed: seed.value,
    nodeEndpoint: nodeEndpoint.value,
    organizations: [],
  });
  await router.push('/');
};

const goBack = () => {
  router.push('/');
};
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Create a Wallet</h1>
      <p class="mt-2 text-sm text-gray-600">Set up a new wallet for your organization</p>
    </div>

    <!-- Form Card -->
    <Card>
      <template #content>
        <div class="space-y-6">
          <!-- Wallet Name -->
          <div>
            <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
              Wallet Name <span class="text-red-500">*</span>
            </label>
            <InputText
              id="org-name"
              v-model="organizationName"
              placeholder="Enter wallet name"
              class="w-full"
            />
          </div>

          <!-- Seed -->
          <div>
            <label for="seed" class="block text-sm font-medium text-gray-700 mb-2">
              Seed Phrase <span class="text-red-500">*</span>
            </label>
            <div class="space-y-2">
              <InputText
                id="seed"
                v-model="seed"
                placeholder="Enter or generate a seed phrase"
                :disabled="isGeneratingSeed"
                class="w-full"
              />
              <Button
                @click="generateSeed"
                label="Generate Seed"
                icon="pi pi-refresh"
                :loading="isGeneratingSeed"
                outlined
              />
            </div>
            <small class="text-gray-500 mt-1 block">
              <i class="pi pi-info-circle"></i> Keep your seed phrase secure and never share it
            </small>
          </div>

          <!-- Node Endpoint -->
          <div>
            <label for="node-endpoint" class="block text-sm font-medium text-gray-700 mb-2">
              Node Endpoint
            </label>
            <InputText
              id="node-endpoint"
              v-model="nodeEndpoint"
              placeholder="https://ares.testnet.carmentis.io"
              class="w-full"
            />
            <small class="text-gray-500 mt-1 block">
              Default: ares.testnet.carmentis.io
            </small>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button
            @click="goBack"
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            outlined
          />
          <Button
            @click="createOrganization"
            label="Create Wallet"
            icon="pi pi-check"
            :disabled="!organizationName || !seed"
          />
        </div>
      </template>
    </Card>
  </div>
</template>
