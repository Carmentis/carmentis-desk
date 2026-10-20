<script setup lang="ts">
import Button from 'primevue/button';
import { useVModel } from '@vueuse/core';
import ResponsiveDialog from '../ui/ResponsiveDialog.vue';
import NetworkBadge from '../ui/NetworkBadge.vue';
import { useAppStore } from '../../stores/appStore.ts';
import { useActiveWallet } from '../../composables/useActiveWallet.ts';
import { useNavigation } from '../../composables/useNavigation.ts';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();
const open = useVModel(props, 'visible', emit);

const { wallets } = useAppStore();
const { activeWalletId } = useActiveWallet();
const navigation = useNavigation();

function choose(walletId: number) {
    open.value = false;
    navigation.goToWallet(walletId);
}

function create() {
    open.value = false;
    navigation.goToNewWallet();
}
</script>

<template>
    <ResponsiveDialog v-model:visible="open" header="Switch wallet">
        <ul class="-mx-2 space-y-1">
            <li v-for="wallet in wallets" :key="wallet.id">
                <button
                    type="button"
                    class="flex min-h-14 w-full items-center gap-3 rounded-control px-3 text-left transition-colors hover:bg-surface-muted"
                    :class="wallet.id === activeWalletId ? 'bg-accent-soft' : ''"
                    :aria-current="wallet.id === activeWalletId ? 'true' : undefined"
                    @click="choose(wallet.id)"
                >
                    <i class="pi pi-wallet text-lg text-fg-muted" aria-hidden="true" />
                    <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium text-fg">{{ wallet.name }}</span>
                        <NetworkBadge :network-name="wallet.network.networkName" />
                    </span>
                    <i v-if="wallet.id === activeWalletId" class="pi pi-check text-accent" aria-hidden="true" />
                    <span v-if="wallet.id === activeWalletId" class="sr-only">Current wallet</span>
                </button>
            </li>
        </ul>

        <template #footer>
            <Button label="New wallet" icon="pi pi-plus" severity="secondary" outlined @click="create" />
        </template>
    </ResponsiveDialog>
</template>
