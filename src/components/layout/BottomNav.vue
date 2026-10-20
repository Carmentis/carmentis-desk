<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useActiveWallet } from '../../composables/useActiveWallet.ts';

const route = useRoute();
const { activeWalletId } = useActiveWallet();

const WALLET_ROUTES = [
    'home', 'create-organization', 'wallet-detail', 'organization-detail',
    'node-detail', 'application-detail', 'app-ledger-explorer',
];

// Credentials live inside a wallet: the entry points to the active wallet and is hidden without one.
const items = computed(() => [
    { key: 'wallets', label: 'Wallets', icon: 'pi-wallet', to: '/', active: WALLET_ROUTES.includes(String(route.name)) },
    ...(activeWalletId.value === null ? [] : [{
        key: 'credentials',
        label: 'Credentials',
        icon: 'pi-id-card',
        to: `/wallet/${activeWalletId.value}/credentials`,
        active: route.name === 'wallet-credentials',
    }]),
    { key: 'settings', label: 'Settings', icon: 'pi-cog', to: '/settings', active: route.name === 'settings' },
]);
</script>

<template>
    <nav
        aria-label="Main"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-safe backdrop-blur"
    >
        <ul class="flex h-14">
            <li v-for="item in items" :key="item.key" class="flex-1">
                <RouterLink
                    :to="item.to"
                    class="flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors"
                    :class="item.active ? 'text-accent' : 'text-fg-muted hover:text-fg'"
                    :aria-current="item.active ? 'page' : undefined"
                >
                    <i class="pi text-lg" :class="item.icon" aria-hidden="true" />
                    {{ item.label }}
                </RouterLink>
            </li>
        </ul>
    </nav>
</template>
