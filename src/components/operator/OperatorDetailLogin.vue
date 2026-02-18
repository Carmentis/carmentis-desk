<script setup lang="ts">

import {useStorageStore, WalletEntity} from "../../stores/storage.ts";
import {computed, ref, watch} from "vue";
import {useToast} from "primevue/usetoast";
import {useRoute} from "vue-router";
import {useGetChallenge, useLoginMutation} from "../../composables/operator.ts";
import Button from "primevue/button";
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
  <div v-if="isLogingIn">
    Login in...
  </div>
  <div v-else-if="isChallengedObtained">
    <Dropdown v-model="selectedWallet" :options="wallets" optionLabel="name" placeholder="Select a wallet" />
    <Button label="Login" :disabled="isLogingIn" @click="login" />
    <Button label="Refresh Challenge" :disabled="isLogingIn" @click="() => refetchChallenge()" />
  </div>

</template>