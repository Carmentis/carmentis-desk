<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import {useStorageStore, WalletEntity} from "../../stores/storage.ts";
import {computed, ref} from "vue";
import {useSetupOperatorMutation} from "../../composables/operator.ts";
import {useRoute} from "vue-router";
import {useToast} from "primevue/usetoast";
import {CryptoEncoderFactory, SeedEncoder, SignatureSchemeId, WalletCrypto} from "@cmts-dev/carmentis-sdk/client";

const {wallets} = useStorageStore();
const selectedWallet = ref<WalletEntity | null>(null);
const pseudo = ref('');
const canSubmit = computed(() => selectedWallet.value !== null && pseudo.value !== '');
const toast = useToast();


const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const { mutate: sendSetupOperatorQuery, isPending: isSendingOperatorSetup } = useSetupOperatorMutation(operatorId.value);

async function setupOperator() {
  if (canSubmit.value)  {
    const wallet = selectedWallet.value;
    if (wallet) {
      // extract the public key from the wallet
      const endoder = new SeedEncoder();
      const seed = endoder.decode(wallet.seed);
      const walletCrypto = WalletCrypto.fromSeed(seed);
      const accountCrypto = walletCrypto.getDefaultAccountCrypto();
      const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
      const publicKey = await sigEncoder.encodePublicKey(
          await accountCrypto.getPublicSignatureKey(SignatureSchemeId.SECP256K1)
      );

      return sendSetupOperatorQuery({
        publicKey,
        pseudo: pseudo.value
      })
    }
  } else {
    toast.add({severity:'error', summary:'Invalid Input', detail:'Please select a wallet and enter a pseudo'});
  }
}
</script>

<template>
  <div class="flex justify-center py-12">
    <div class="w-full max-w-md">
      <Card class="setup-card">
        <template #header>
          <div class="text-center pt-6 pb-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
              <i class="pi pi-cog text-3xl text-primary-500"></i>
            </div>
            <h2 class="text-2xl font-bold text-surface-900 mb-2">Operator Setup</h2>
            <p class="text-sm text-surface-600">Configure your operator with a wallet and pseudo</p>
          </div>
        </template>

        <template #content>
          <!-- Setup In Progress State -->
          <div v-if="isSendingOperatorSetup" class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-4xl text-primary-500 mb-4"></i>
            <p class="text-surface-600">Setting up operator...</p>
          </div>

          <!-- Setup Form -->
          <div v-else class="space-y-6">
            <div>
              <label for="walletSelect" class="block text-sm font-semibold text-surface-700 mb-2">
                Select Wallet
              </label>
              <Dropdown
                id="walletSelect"
                v-model="selectedWallet"
                :options="wallets"
                optionLabel="name"
                placeholder="Choose a wallet for setup"
                class="w-full"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center gap-2">
                    <i class="pi pi-wallet text-surface-500"></i>
                    <span>{{ slotProps.value.name }}</span>
                  </div>
                  <span v-else class="text-surface-500">{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <div class="flex items-center gap-2">
                    <i class="pi pi-wallet text-surface-500"></i>
                    <div>
                      <div class="font-semibold">{{ slotProps.option.name }}</div>
                      <div class="text-xs text-surface-500">{{ slotProps.option.nodeEndpoint }}</div>
                    </div>
                  </div>
                </template>
              </Dropdown>
            </div>

            <div>
              <label for="pseudoInput" class="block text-sm font-semibold text-surface-700 mb-2">
                Pseudo
              </label>
              <InputText
                id="pseudoInput"
                v-model="pseudo"
                placeholder="Enter your pseudo"
                class="w-full"
              />
            </div>

            <Button
              label="Setup Operator"
              icon="pi pi-check"
              class="w-full"
              :disabled="!canSubmit || isSendingOperatorSetup"
              @click="setupOperator"
            />

            <div class="text-center">
              <p class="text-xs text-surface-500">
                <i class="pi pi-info-circle mr-1"></i>
                Your public key will be extracted from the selected wallet
              </p>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
:deep(.setup-card) {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

:deep(.setup-card .p-card-header) {
  padding: 0;
}

:deep(.setup-card .p-card-body) {
  padding-top: 0;
}
</style>