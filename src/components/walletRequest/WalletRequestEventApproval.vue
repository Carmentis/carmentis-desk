<script setup lang="ts">
import {
  CryptoEncoderFactory,
  SeedEncoder,
  WalletCrypto,
  WalletRequestDataApproval
} from "@cmts-dev/carmentis-sdk/client";
import { ref } from "vue";
import Card from "primevue/card";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import {useStorageStore} from "../../stores/storage.ts";
import {storeToRefs} from "pinia";

// load all wallets
const store = useStorageStore();
const {wallets} = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);

// define the prop for the vue
const props = defineProps<{
  walletRequest: WalletRequestDataApproval
}>();


// we use two emits here: approve and reject.
const emit = defineEmits<{
  approve: []
  reject: []
}>();

const isProcessing = ref(false);

async function approve() {

}

function reject() {
  emit('reject');
}
</script>

<template>
  <div class="flex items-center justify-center h-full p-4">
    Event approval
  </div>
</template>