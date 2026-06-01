<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Breadcrumb from 'primevue/breadcrumb';
import { useAsyncState } from '@vueuse/core';
import { useAccountBreakdownQuery } from '../../composables/useAccountBreakdown.ts';
import * as walletRepo from '../../db/repositories/walletRepository';
import * as orgRepo from '../../db/repositories/organizationRepository';
import * as appRepo from '../../db/repositories/applicationRepository';
import * as nodeRepo from '../../db/repositories/nodeRepository';
import * as operatorRepo from '../../db/repositories/operatorRepository';

const route = useRoute();
const router = useRouter();

const walletId = computed(() => Number(route.params.walletId) || null);
const orgId = computed(() => Number(route.params.orgId) || null);
const appId = computed(() => Number(route.params.appId) || null);
const nodeId = computed(() => Number(route.params.nodeId) || null);
const operatorId = computed(() => Number(route.params.operatorId) || null);

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
const { state: operator, execute: fetchOperator } = useAsyncState(
    () => operatorId.value ? operatorRepo.getOperatorById(operatorId.value) : Promise.resolve(null),
    null,
    { immediate: true },
);

watch(walletId, () => fetchWallet());
watch(orgId, () => fetchOrg());
watch(appId, () => fetchApp());
watch(nodeId, () => fetchNode());
watch(operatorId, () => fetchOperator());

const breadcrumbHome = { icon: 'pi pi-home', command: () => router.push('/') };

const items = computed(() => {
    const segments = [];

    // Static pages
    if (route.name === 'settings') {
        segments.push({ label: 'Settings', icon: 'pi pi-cog' });
        return segments;
    }
    if (route.name === 'proof-checker') {
        segments.push({ label: 'Proof Checker', icon: 'pi pi-verified' });
        return segments;
    }
    if (route.name === 'wallet-request-docs') {
        segments.push({ label: 'API Docs', icon: 'pi pi-book' });
        return segments;
    }
    if (route.name === 'create-organization') {
        segments.push({ label: 'New Wallet', icon: 'pi pi-plus' });
        return segments;
    }

    // Operator pages
    if (operatorId.value && operator.value) {
        segments.push({ label: operator.value.name, icon: 'pi pi-server' });
        return segments;
    }

    // Wallet hierarchy
    if (wallet.value) {
        segments.push({
            label: wallet.value.name,
            icon: 'pi pi-wallet',
            command: () => router.push(`/wallet/${walletId.value}`),
        });
    }
    if (organization.value) {
        segments.push({
            label: organization.value.name,
            icon: 'pi pi-building',
            command: () => router.push(`/wallet/${walletId.value}/organization/${orgId.value}`),
        });
    }
    if (application.value) {
        segments.push({ label: application.value.name, icon: 'pi pi-box' });
    } else if (node.value) {
        segments.push({ label: node.value.name, icon: 'pi pi-sitemap' });
    } else if (route.name === 'wallet-credentials') {
        segments.push({ label: 'Credentials', icon: 'pi pi-id-card' });
    } else if (route.name === 'app-ledger-explorer') {
        segments.push({ label: 'App Ledger', icon: 'pi pi-list' });
    }

    return segments;
});

const show = computed(() => route.name !== 'home' && items.value.length > 0);

const breakdownQuery = useAccountBreakdownQuery(computed(() => walletId.value ?? 0));
</script>

<template>
    <div v-if="show" class="bg-surface-0 px-4 flex items-center justify-between">
        <Breadcrumb :home="breadcrumbHome" :model="items" class="border-none p-0 bg-transparent text-sm" />
        <div v-if="walletId && breakdownQuery.data.value" class="flex items-center gap-1 text-sm text-gray-600">
            <i class="pi pi-wallet text-sm"></i>
            <span class="font-medium">{{ breakdownQuery.data.value.getSpendable() }}</span>
        </div>
    </div>
</template>
