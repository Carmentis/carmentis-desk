<script setup lang="ts">
import Dropdown from 'primevue/dropdown';
import type { WalletStub } from '../../../stores/storage.ts';
import { ref } from 'vue';

const props = defineProps<{
    wallets: WalletStub[];
    chosenWallet: WalletStub;
}>();
const emit = defineEmits<{
    selectedWalletIndex: [index: number];
}>();
const chosenWallet = props.chosenWallet;
</script>

<template>
    <Dropdown
        id="walletSelect"
        v-model="chosenWallet"
        :options="wallets"
        optionLabel="name"
        placeholder="Choose a wallet for auth"
        class="w-full"
        @change="emit('selectedWalletIndex', wallets.indexOf(chosenWallet))"
    >
        <template #value="slotProps">
            <div v-if="slotProps.value" class="flex items-center gap-2">
                <i class="pi pi-wallet text-surface-500"></i>
                <span>{{ slotProps.value.name }}</span>
            </div>
            <span v-else class="text-surface-500">
                {{ slotProps.placeholder }}
            </span>
        </template>
        <template #option="slotProps">
            <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-surface-500"></i>
                <div>
                    <div class="font-semibold">{{ slotProps.option.name }}</div>
                    <div class="text-xs text-surface-500">
                        {{ slotProps.option.nodeEndpoint }}
                    </div>
                </div>
            </div>
        </template>
    </Dropdown>
</template>
