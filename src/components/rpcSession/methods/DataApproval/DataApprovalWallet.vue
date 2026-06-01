<script setup lang="ts">
import Card from 'primevue/card';
import { useStorageStore } from '../../../../stores/storage.ts';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import DropdownWalletSelection from '../../../wallet/DropdownWalletSelection.vue';

const store = useStorageStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);
</script>

<template>
    <Card class="bg-blue-700">
        <template #content>
            <h1>Select the wallet to use</h1>
            <DropdownWalletSelection :wallets="wallets" :chosen-wallet="chosenWallet" />
        </template>
    </Card>
</template>
