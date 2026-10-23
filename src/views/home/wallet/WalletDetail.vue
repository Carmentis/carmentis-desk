<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import type {MenuItem} from 'primevue/menuitem';
import {useTimeoutFn} from '@vueuse/core';
import {useToast} from 'primevue/usetoast';
import {useAppStore} from "../../../stores/appStore.ts";
import {useWalletStore} from "../../../stores/walletStore.ts";
import WalletDetailSync from "./WalletDetailSync.vue";
import WalletDetailBalanceCard from "./WalletDetailBalanceCard.vue";
import WalletDetailAccountCard from "./WalletDetailAccountCard.vue";
import WalletDetailKeysCard from "./WalletDetailKeysCard.vue";
import WalletDetailOrganizationsCard from "./WalletDetailOrganizationsCard.vue";
import WalletDetailConnectivity from "./WalletDetailConnectivity.vue";
import WalletDetailCredentials from "./credentials/WalletDetailCredentials.vue";
import WalletDetailActivity from "./activity/WalletDetailActivity.vue";
import PageHeader from "../../../components/ui/PageHeader.vue";
import NetworkBadge from "../../../components/ui/NetworkBadge.vue";
import SectionTabs from "../../../components/ui/SectionTabs.vue";
import EmptyState from "../../../components/ui/EmptyState.vue";
import SkeletonBlock from "../../../components/ui/SkeletonBlock.vue";
import ConfirmActionDialog from "../../../components/ui/ConfirmActionDialog.vue";
import type {TabItem} from "../../../components/ui/types.ts";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const {deleteWalletById, shouldDisplayOrganizations} = useAppStore();

const walletId = computed(() => Number(route.params.walletId));
const {wallet} = useWalletStore(walletId.value);

// The wallet arrives asynchronously and a missing wallet looks the same as a loading one:
// show a skeleton for a moment before concluding that it does not exist.
const hasWaited = ref(false);
useTimeoutFn(() => hasWaited.value = true, 1000);

// ---- delete (destructive: in the overflow menu, behind a confirmation naming the wallet) ----
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

const menuItems: MenuItem[] = [
    { label: 'Delete wallet', icon: 'pi pi-trash', class: 'text-danger', command: () => showDeleteDialog.value = true },
];

async function deleteWallet() {
    isDeleting.value = true;
    try {
        await deleteWalletById(walletId.value);
        toast.add({
            severity: 'success',
            summary: 'Wallet deleted',
            detail: 'Wallet deleted successfully',
            life: 3000,
        });
        await router.push('/');
    } finally {
        isDeleting.value = false;
    }
}

// ---- tabs: a single level ----
const tab = ref('overview');
const tabs = computed<TabItem[]>(() => [
    { value: 'overview', label: 'Overview', icon: 'pi-wallet' },
    { value: 'organizations', label: 'Organizations', icon: 'pi-building', hidden: !shouldDisplayOrganizations.value },
    { value: 'credentials', label: 'Credentials', icon: 'pi-id-card' },
    { value: 'activity', label: 'Activity', icon: 'pi-history' },
    { value: 'connectivity', label: 'Connectivity', icon: 'pi-server' },
]);
</script>

<template>
    <div v-if="wallet" class="space-y-6">
        <PageHeader :title="wallet.name" :menu-items="menuItems">
            <template #meta>
                <NetworkBadge :network-name="wallet.network.networkName" />
            </template>
        </PageHeader>

        <WalletDetailSync/>

        <SectionTabs
            v-model="tab"
            :tabs="tabs"
            ariaLabel="Wallet sections"
            :persist-key="`walletDetailTab:${walletId}`"
        >
            <template #default="{ active }">
                <div v-if="active === 'overview'" class="space-y-4">
                    <div class="grid gap-4 lg:grid-cols-2 lg:items-start">
                        <WalletDetailBalanceCard/>
                        <WalletDetailAccountCard/>
                    </div>
                    <WalletDetailKeysCard/>
                </div>
                <WalletDetailOrganizationsCard v-else-if="active === 'organizations'"/>
                <WalletDetailCredentials v-else-if="active === 'credentials'"/>
                <WalletDetailActivity v-else-if="active === 'activity'"/>
                <WalletDetailConnectivity v-else-if="active === 'connectivity'"/>
            </template>
        </SectionTabs>

        <ConfirmActionDialog
            v-model:visible="showDeleteDialog"
            title="Delete wallet"
            :item-name="wallet.name"
            message="This will also delete all its organizations, nodes and applications from this device. This action cannot be undone."
            :loading="isDeleting"
            @confirm="deleteWallet"
        />
    </div>

    <SkeletonBlock v-else-if="!hasWaited" :lines="4" />

    <!-- Not Found State -->
    <div v-else class="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
            icon="pi-exclamation-triangle"
            title="Wallet not found"
            description="The wallet you are looking for does not exist."
        >
            <Button label="Back to wallets" icon="pi pi-home" @click="router.push('/')" />
        </EmptyState>
    </div>
</template>
