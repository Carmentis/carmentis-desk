<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStorageStore } from '../stores/storage.ts';
import Breadcrumb from 'primevue/breadcrumb';

const route = useRoute();
const router = useRouter();
const store = useStorageStore();

const walletId = computed(() => Number(route.params.walletId) || null);
const orgId = computed(() => Number(route.params.orgId) || null);
const appId = computed(() => Number(route.params.appId) || null);
const nodeId = computed(() => Number(route.params.nodeId) || null);
const operatorId = computed(() => Number(route.params.operatorId) || null);

const wallet = computed(() => store.organizations.find((w) => w.id === walletId.value));
const organization = computed(() => wallet.value?.organizations.find((o) => o.id === orgId.value));
const application = computed(() => organization.value?.applications.find((a) => a.id === appId.value));
const node = computed(() => organization.value?.nodes.find((n) => n.id === nodeId.value));
const operator = computed(() => store.operators.find((o) => o.id === operatorId.value));

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
</script>

<template>
    <div v-if="show" class="bg-surface-0  px-6 ">
        <Breadcrumb :home="breadcrumbHome" :model="items" class="border-none p-0 bg-transparent text-sm" />
    </div>
</template>
