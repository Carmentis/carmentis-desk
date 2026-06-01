<script setup lang="ts">
import Button from 'primevue/button';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAccountBreakdownQuery } from '../../composables/useAccountBreakdown.ts';
import { CMTSToken } from '@cmts-dev/carmentis-sdk-core';
import Message from 'primevue/message';
import { useAsyncState } from '@vueuse/core';
import * as walletRepo from '../../db/repositories/walletRepository';
import * as orgRepo from '../../db/repositories/organizationRepository';
import * as appRepo from '../../db/repositories/applicationRepository';
import * as nodeRepo from '../../db/repositories/nodeRepository';

const route = useRoute();

const walletId = computed(() => Number(route.params.walletId) || null);
const orgId = computed(() => Number(route.params.orgId) || null);
const appId = computed(() => Number(route.params.appId) || null);
const nodeId = computed(() => Number(route.params.nodeId) || null);

const { state: wallet, execute: fetchWallet } = useAsyncState(
    () => walletId.value ? walletRepo.getWalletById(walletId.value) : Promise.resolve(null),
    null,
    { immediate: true },
);
const { state: organization, execute: fetchOrg } = useAsyncState(
    () => orgId.value ? orgRepo.getOrganizationById(orgId.value) : Promise.resolve(null),
    null,
    { immediate: true },
);
const { state: application, execute: fetchApp } = useAsyncState(
    () => appId.value ? appRepo.getApplicationById(appId.value) : Promise.resolve(null),
    null,
    { immediate: true },
);
const { state: node, execute: fetchNode } = useAsyncState(
    () => nodeId.value ? nodeRepo.getNodeById(nodeId.value) : Promise.resolve(null),
    null,
    { immediate: true },
);

watch(walletId, () => fetchWallet());
watch(orgId, () => fetchOrg());
watch(appId, () => fetchApp());
watch(nodeId, () => fetchNode());

const walletName = computed(() => wallet.value?.name ?? '');
const organizationName = computed(() => organization.value?.name ?? '');
const applicationName = computed(() => application.value?.name ?? '');
const nodeName = computed(() => node.value?.name ?? '');

// Current page context - only show the current item
const currentPageContext = computed(() => {
    // Priority: Node > Application > Organization > Wallet
    if (node.value) {
        return {
            label: nodeName.value,
            icon: 'pi pi-sitemap',
            type: 'Node',
        };
    }

    if (application.value) {
        return {
            label: applicationName.value,
            icon: 'pi pi-box',
            type: 'Application',
        };
    }

    if (organization.value) {
        return {
            label: organizationName.value,
            icon: 'pi pi-building',
            type: 'Organization',
        };
    }

    if (wallet.value) {
        return {
            label: walletName.value,
            icon: 'pi pi-wallet',
            type: 'Wallet',
        };
    }

    return null;
});

// Account balance for wallet pages
const walletIdForQuery = computed(() => walletId.value ?? 0);
const accountBalanceQuery = useAccountBreakdownQuery(walletIdForQuery);
const accountBalance = computed(() => {
    let message = '';
    if (accountBalanceQuery.isFetching.value) message = 'Loading...';
    else if (accountBalanceQuery.data.value) {
        message = accountBalanceQuery.data.value.getSpendable().toString();
    } else {
        message = CMTSToken.zero().toString();
    }
    return message;
});

const showBalance = computed(() => {
    // Only show balance on wallet-related pages
    return (
        route.name === 'wallet-detail' ||
        route.name === 'organization-detail' ||
        route.name === 'application-detail' ||
        route.name === 'node-detail'
    );
});
</script>

<template>
    <div class="bg-white border rounded-md border-gray-200 px-4 py-3">
        <div class="flex items-center justify-between">
            <!-- Left: Current page context -->
            <div v-if="currentPageContext" class="flex items-center gap-3">
                <i :class="currentPageContext.icon" class="text-2xl text-gray-700"></i>
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide">
                        {{ currentPageContext.type }}
                    </div>
                    <div class="text-lg font-semibold text-gray-900">
                        {{ currentPageContext.label }}
                    </div>
                </div>
            </div>

            <!-- Right: Balance display -->
            <div class="flex gap-3 items-center">
                <template v-if="showBalance">
                    <Button
                        @click="() => accountBalanceQuery.refetch()"
                        icon="pi pi-refresh"
                        text
                        size="small"
                        v-tooltip.bottom="'Refresh balance'"
                    />
                    <Message severity="info" :closable="false">
                        <span class="text-sm font-medium">
                            {{ accountBalance }}
                        </span>
                    </Message>
                </template>
            </div>
        </div>
    </div>
</template>
