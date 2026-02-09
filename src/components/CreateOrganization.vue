<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useStorageStore } from '../stores/storage';
import {SeedEncoder, WalletCrypto} from "@cmts-dev/carmentis-sdk/client";

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
    nodes: [],
  });
  await router.push('/');
};

const goBack = () => {
  router.push('/');
};
</script>

<template>
  <div style="padding: 2rem;">
    <h1>Create your organization</h1>

    <div style="margin-bottom: 1.5rem;">
      <label for="org-name" style="display: block; margin-bottom: 0.5rem;">Organization Name</label>
      <InputText id="org-name" v-model="organizationName" style="width: 100%; max-width: 400px;" />
    </div>

    <div style="margin-bottom: 1.5rem;">
      <label for="seed" style="display: block; margin-bottom: 0.5rem;">Seed</label>
      <InputText id="seed" v-model="seed" style="width: 100%; max-width: 400px; margin-bottom: 0.5rem;" :disabled="isGeneratingSeed" />
      <Button @click="generateSeed" label="Generate Seed" />
    </div>

    <div style="margin-bottom: 1.5rem;">
      <label for="node-endpoint" style="display: block; margin-bottom: 0.5rem;">Node Endpoint</label>
      <InputText id="node-endpoint" v-model="nodeEndpoint" style="width: 100%; max-width: 400px;" />
    </div>

    <div style="display: flex; gap: 1rem;">
      <Button @click="createOrganization" label="Create Organization" />
      <Button @click="goBack" label="Back to Home" severity="secondary" />
    </div>
  </div>
</template>
