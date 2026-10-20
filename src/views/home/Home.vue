<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import { useAppStore } from '../../stores/appStore.ts';
import { useNavigation } from '../../composables/useNavigation.ts';
import PageHeader from '../../components/ui/PageHeader.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import NetworkBadge from '../../components/ui/NetworkBadge.vue';

const { wallets } = useAppStore();
const navigation = useNavigation();

// Shown under the wallet name as secondary, technical information.
const hostOf = (url: string | undefined) => url?.replace(/^https?:\/\//, '') ?? '';
</script>

<template>
    <div class="space-y-6">
        <PageHeader title="Wallets" subtitle="Choose a wallet to manage your tokens.">
            <template #actions>
                <Button label="New wallet" icon="pi pi-plus" @click="navigation.goToNewWallet()" />
            </template>
        </PageHeader>

        <div
            v-if="wallets.length === 0"
            class="rounded-card border border-line bg-surface shadow-card"
        >
            <EmptyState
                icon="pi-wallet"
                title="No wallet yet"
                description="Create a wallet to hold tokens and sign on the Carmentis blockchain."
            >
                <Button label="Create a wallet" icon="pi pi-plus" @click="navigation.goToNewWallet()" />
            </EmptyState>
        </div>

        <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <li v-for="wallet in wallets" :key="wallet.id" class="min-w-0">
                <RouterLink
                    :to="`/wallet/${wallet.id}`"
                    class="group flex min-h-11 items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-accent"
                >
                    <span class="flex size-12 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                        <i class="pi pi-wallet text-xl" aria-hidden="true" />
                    </span>
                    <span class="min-w-0 flex-1 space-y-1">
                        <span class="block truncate text-base font-semibold text-fg">{{ wallet.name }}</span>
                        <NetworkBadge :network-name="wallet.network.networkName" />
                        <span class="block truncate font-mono text-xs text-fg-muted">{{ hostOf(wallet.network.node) }}</span>
                    </span>
                    <i
                        class="pi pi-angle-right text-fg-muted transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                    />
                </RouterLink>
            </li>
        </ul>
    </div>
</template>
