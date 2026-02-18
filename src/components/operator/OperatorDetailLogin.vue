<script setup lang="ts">

import {useStorageStore, WalletEntity} from "../../stores/storage.ts";
import {computed, ref, watch} from "vue";
import {useToast} from "primevue/usetoast";
import {useRoute} from "vue-router";
import {useGetChallenge, useLoginMutation} from "../../composables/operator.ts";
import Button from "primevue/button";
import Card from "primevue/card";
import Dropdown from "primevue/dropdown";
import {
  CryptoEncoderFactory,
  EncoderFactory,
  SeedEncoder,
  SignatureSchemeId,
  WalletCrypto
} from "@cmts-dev/carmentis-sdk/client";
import {useOperatorAuthStore} from "./operatorAuthStore.ts";

const {wallets} = useStorageStore();
const selectedWallet = ref<WalletEntity | null>(null);
const toast = useToast();


const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const { data: challenge, isSuccess: isChallengedObtained, refetch: refetchChallenge } = useGetChallenge(operatorId.value);
const {
  mutate: sendLoginRequest,
  error: loginError,
  isPending: isLogingIn,
  isSuccess,
    data: loginResponse
} = useLoginMutation(operatorId.value);


async function login() {
  const wallet = selectedWallet.value;
  if (wallet && challenge.value) {
    // extract the public key from the wallet
    const endoder = new SeedEncoder();
    const seed = endoder.decode(wallet.seed);
    const walletCrypto = WalletCrypto.fromSeed(seed);
    const accountCrypto = walletCrypto.getDefaultAccountCrypto();
    const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    const privateKey = await accountCrypto.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);
    const rawChallenge = EncoderFactory.bytesToHexEncoder().decode(challenge.value.challenge);
    const signature = await privateKey.sign(rawChallenge);
    const publicKey = await sigEncoder.encodePublicKey(
        await privateKey.getPublicKey()
    );

    return sendLoginRequest({
      challenge: challenge.value.challenge,
      signature: EncoderFactory.bytesToHexEncoder().encode(signature),
      mac: challenge.value.mac,
      expiresAt: challenge.value.expiresAt,
      publicKey
    })
  }
}

const authStore = useOperatorAuthStore();
watch(isSuccess, () => {
  const response = loginResponse.value;
  if (response && selectedWallet.value) {
    const {token} = response;
    authStore.addCredential(
        selectedWallet.value.id,
        operatorId.value,
        token,
    )
    toast.add({severity:'success', summary:'Login successful', detail:'You can now access the operator dashboard', life: 3000});
  }
})

watch(loginError, () => {
  if (loginError.value && loginError.value instanceof Error) {
    toast.add({severity:'error', summary: 'Login error', detail: loginError.value.message, life: 3000});
  }
})
</script>

<template>
  <div class="flex justify-center py-12">
    <div class="w-full max-w-md">
      <Card class="login-card p-6">
        <template #header>
          <div class="text-center pt-6 pb-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
              <i class="pi pi-lock text-3xl text-primary-500"></i>
            </div>
            <h2 class="text-2xl font-bold text-surface-900 mb-2">Operator Login</h2>
            <p class="text-sm text-surface-600">Select a wallet to authenticate with the operator</p>
          </div>
        </template>

        <template #content>
          <!-- Loading State -->
          <div v-if="isLogingIn" class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-4xl text-primary-500 mb-4"></i>
            <p class="text-surface-600">Authenticating...</p>
          </div>

          <!-- Login Form -->
          <div v-else-if="isChallengedObtained" class="space-y-6">
            <div>
              <label for="walletSelect" class="block text-sm font-semibold text-surface-700 mb-2">
                Select Wallet
              </label>
              <Dropdown
                id="walletSelect"
                v-model="selectedWallet"
                :options="wallets"
                optionLabel="name"
                placeholder="Choose a wallet to authenticate"
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

            <div class="space-y-3">
              <Button
                label="Login"
                icon="pi pi-sign-in"
                class="w-full"
                :disabled="!selectedWallet || isLogingIn"
                @click="login"
              />
              <Button
                label="Refresh Challenge"
                icon="pi pi-refresh"
                class="w-full"
                severity="secondary"
                outlined
                :disabled="isLogingIn"
                @click="() => refetchChallenge()"
              />
            </div>

            <div class="text-center">
              <p class="text-xs text-surface-500">
                <i class="pi pi-info-circle mr-1"></i>
                Authentication uses cryptographic signature verification
              </p>
            </div>
          </div>

          <!-- Challenge Loading State -->
          <div v-else class="text-center py-8">
            <i class="pi pi-spin pi-spinner text-4xl text-primary-500 mb-4"></i>
            <p class="text-surface-600">Loading authentication challenge...</p>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
:deep(.login-card) {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

:deep(.login-card .p-card-header) {
  padding: 0;
}

:deep(.login-card .p-card-body) {
  padding-top: 0;
}
</style>