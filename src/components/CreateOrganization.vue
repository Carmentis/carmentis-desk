<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import { useStorageStore } from '../stores/storage';
import { SeedEncoder, WalletCrypto } from "@cmts-dev/carmentis-sdk/client";
import { mnemonicToSeedSync } from '@scure/bip39';

const router = useRouter();
const storageStore = useStorageStore();

const organizationName = ref('');
const seed = ref('');
const passphrase = ref('');
const nodeEndpoint = ref('https://ares.testnet.carmentis.io');

// Method selection: 'seed' or 'passphrase'
const creationMethod = ref<'seed' | 'passphrase'>('seed');
const methodOptions = ref([
  { label: 'Seed Phrase', value: 'seed' },
  { label: 'Passphrase', value: 'passphrase' }
]);

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

// Derive seed from passphrase using @scure/bip39
const deriveSeedFromPassphrase = (passphrase: string): string => {
  // Use the passphrase as a mnemonic-like input to derive a seed
  // mnemonicToSeedSync takes a mnemonic and optional passphrase
  // We'll use the passphrase directly as the mnemonic input
  const derivedSeed = mnemonicToSeedSync(passphrase, '');
  const seedEncoder = new SeedEncoder();
  return seedEncoder.encode(derivedSeed);
}

const isFormValid = computed(() => {
  if (!organizationName.value) return false;
  if (creationMethod.value === 'seed') {
    return !!seed.value;
  } else {
    return !!passphrase.value;
  }
});

const createOrganization = async () => {
  if (!organizationName.value) return;

  let finalSeed = '';

  if (creationMethod.value === 'seed') {
    if (!seed.value) return;
    finalSeed = seed.value;
  } else {
    if (!passphrase.value) return;
    // Derive seed from passphrase
    finalSeed = deriveSeedFromPassphrase(passphrase.value);
  }

  await storageStore.addOrganization({
    name: organizationName.value,
    seed: finalSeed,
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

          <!-- Creation Method Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Creation Method <span class="text-red-500">*</span>
            </label>
            <SelectButton v-model="creationMethod" :options="methodOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>

          <!-- Seed Phrase Input (shown when method is 'seed') -->
          <div v-if="creationMethod === 'seed'">
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

          <!-- Passphrase Input (shown when method is 'passphrase') -->
          <div v-if="creationMethod === 'passphrase'">
            <label for="passphrase" class="block text-sm font-medium text-gray-700 mb-2">
              Passphrase <span class="text-red-500">*</span>
            </label>
            <InputText
              id="passphrase"
              v-model="passphrase"
              placeholder="Enter a strong passphrase"
              toggleMask
              class="w-full"
            />
            <small class="text-gray-500 mt-1 block">
              <i class="pi pi-info-circle"></i> A seed will be derived from your passphrase. Use a strong, memorable passphrase.
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
            :disabled="!isFormValid"
          />
        </div>
      </template>
    </Card>
  </div>
</template>
