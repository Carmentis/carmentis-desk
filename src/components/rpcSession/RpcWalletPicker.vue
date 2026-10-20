<script setup lang="ts" generic="W extends { id: number; name: string; network?: { networkName: string } }">
import Select from 'primevue/select';
import NetworkBadge from '../ui/NetworkBadge.vue';

const props = withDefaults(defineProps<{
    wallets: W[];
    label?: string;
    inputId?: string;
}>(), {
    label: 'Wallet',
    inputId: 'rpc-wallet',
});

const model = defineModel<W | undefined>();
</script>

<template>
    <div>
        <label :for="props.inputId" class="mb-1 block text-sm font-medium text-fg">{{ props.label }}</label>
        <Select
            v-model="model"
            :input-id="props.inputId"
            :options="props.wallets"
            optionLabel="name"
            placeholder="Choose a wallet"
            fluid
        >
            <template #value="{ value, placeholder }">
                <span v-if="value" class="flex items-center gap-2">
                    <i class="pi pi-wallet text-fg-muted" aria-hidden="true" />
                    <span class="truncate">{{ value.name }}</span>
                </span>
                <span v-else class="text-fg-muted">{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
                <span class="flex min-w-0 items-center gap-2">
                    <i class="pi pi-wallet text-fg-muted" aria-hidden="true" />
                    <span class="truncate font-medium">{{ option.name }}</span>
                    <NetworkBadge v-if="option.network" :network-name="option.network.networkName" />
                </span>
            </template>
        </Select>
    </div>
</template>
