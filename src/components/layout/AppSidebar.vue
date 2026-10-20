<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import Menu from 'primevue/menu';
import { useNavbarData } from '../../composables/useNavbarData.ts';
import { useActiveWallet } from '../../composables/useActiveWallet.ts';
import { useAppMenuActions } from '../../composables/useAppMenuActions.ts';
import { useAppStore } from '../../stores/appStore.ts';
import pkg from '../../../package.json';

const route = useRoute();
const { navTree } = useNavbarData();
const { shouldDisplayOrganizations } = useAppStore();
const { routeWalletId } = useActiveWallet();
const { menuItems } = useAppMenuActions();
const menu = ref<InstanceType<typeof Menu>>();

const BASE = 'flex min-h-11 min-w-0 items-center gap-3 rounded-control px-3 text-sm transition-colors';
const linkClass = (active: boolean) => [
    BASE,
    active ? 'bg-accent-soft font-medium text-accent' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
];

const isOrganizationActive = (orgId: number) => Number(route.params.orgId) === orgId;
</script>

<template>
    <!-- Desktop sidebar (lg and up). Below lg the app bar and bottom navigation are used instead. -->
    <aside class="fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-line bg-surface">
        <RouterLink to="/" class="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
            <img src="/carmentis-logo.png" alt="" class="h-8 w-auto" />
            <span class="truncate text-lg font-semibold text-fg">Carmentis Desk</span>
        </RouterLink>

        <nav aria-label="Main" class="flex-1 space-y-6 overflow-y-auto p-3">
            <div>
                <h2 class="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">Wallets</h2>
                <ul class="space-y-1">
                    <li v-for="wallet in navTree" :key="wallet.id">
                        <RouterLink
                            :to="`/wallet/${wallet.id}`"
                            :class="linkClass(routeWalletId === wallet.id && route.name === 'wallet-detail')"
                            :aria-current="routeWalletId === wallet.id && route.name === 'wallet-detail' ? 'page' : undefined"
                        >
                            <i class="pi pi-wallet" aria-hidden="true" />
                            <span class="truncate" :class="routeWalletId === wallet.id ? 'font-medium text-fg' : ''">{{ wallet.name }}</span>
                        </RouterLink>

                        <!-- The opened wallet expands to its sections -->
                        <ul v-if="routeWalletId === wallet.id" class="ml-4 mt-1 space-y-1 border-l border-line pl-2">
                            <li>
                                <RouterLink
                                    :to="`/wallet/${wallet.id}/credentials`"
                                    :class="linkClass(route.name === 'wallet-credentials')"
                                    :aria-current="route.name === 'wallet-credentials' ? 'page' : undefined"
                                >
                                    <i class="pi pi-id-card" aria-hidden="true" />
                                    Credentials
                                </RouterLink>
                            </li>
                            <template v-if="shouldDisplayOrganizations">
                                <li v-for="org in wallet.organizations" :key="org.id">
                                    <RouterLink
                                        :to="`/wallet/${wallet.id}/organization/${org.id}`"
                                        :class="linkClass(isOrganizationActive(org.id))"
                                        :aria-current="isOrganizationActive(org.id) ? 'page' : undefined"
                                    >
                                        <i class="pi pi-building" aria-hidden="true" />
                                        <span class="truncate">{{ org.name }}</span>
                                    </RouterLink>
                                </li>
                            </template>
                        </ul>
                    </li>
                    <li v-if="navTree.length === 0" class="px-3 py-2 text-sm text-fg-muted">No wallets yet</li>
                    <li>
                        <RouterLink to="/wallet/new" :class="linkClass(route.name === 'create-organization')">
                            <i class="pi pi-plus" aria-hidden="true" />
                            New wallet
                        </RouterLink>
                    </li>
                </ul>
            </div>
        </nav>

        <div class="shrink-0 space-y-1 border-t border-line p-3">
            <RouterLink
                to="/settings"
                :class="linkClass(route.name === 'settings')"
                :aria-current="route.name === 'settings' ? 'page' : undefined"
            >
                <i class="pi pi-cog" aria-hidden="true" />
                Settings
            </RouterLink>
            <button
                type="button"
                :class="[...linkClass(false), 'w-full']"
                aria-haspopup="true"
                @click="menu?.toggle($event)"
            >
                <i class="pi pi-ellipsis-h" aria-hidden="true" />
                More
            </button>
            <Menu ref="menu" :model="menuItems" popup />
            <p class="px-3 pt-1 text-xs text-fg-muted">v{{ pkg.version }}</p>
        </div>
    </aside>
</template>
