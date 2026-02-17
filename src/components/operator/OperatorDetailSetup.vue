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
  <Card>
    <template #content>
      The operator is not setup, please indicate with which wallet you want to connect.

      <div class="flex flex-col gap-2 mt-4">
        <Dropdown v-model="selectedWallet" :options="wallets" optionLabel="name" placeholder="Select a wallet" />
        <InputText v-model="pseudo" placeholder="Pseudo"/>
        <Button label="Setup Operator" :disabled="!canSubmit || isSendingOperatorSetup" @click="setupOperator" />
      </div>

    </template>
  </Card>
</template>