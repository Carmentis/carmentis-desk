<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useAppLedgerExplorer } from '../../../../composables/useAppLedgerExplorer.ts';
import AppLedgerHeaderCard from './AppLedgerHeaderCard.vue';
import AppLedgerList from './AppLedgerList.vue';
import AppLedgerDetailCard from './AppLedgerDetailCard.vue';

const route = useRoute();
const router = useRouter();

const walletId = computed(() => Number(route.params.walletId));
const appParticipationId = computed(() => route.params.appId as string);

const {
    wallet,
    participation,
    accountCrypto,
    appDescription,
    isLoadingDescription,
    selectedIdx,
    selectedVb,
    isLoadingVb,
    vbError,
    activeTab,
    firstAndLastMicroblockAnchoringDate,
    selectLedger,
    reversedLedgers,
    selectedRow,
    selectedLedger,
    confirmDeleteLedger,
} = useAppLedgerExplorer(walletId, appParticipationId);
</script>

<template>
    <div class="space-y-6">
        <!-- App header -->
        <AppLedgerHeaderCard
            :app-description="appDescription"
            :is-loading-description="isLoadingDescription"
            :ledger-count="participation?.appLedgers.length ?? 0"
            :app-participation-id="appParticipationId"
        />

        <!-- No data -->
        <div v-if="!participation" class="text-center py-12">
            <i class="pi pi-exclamation-triangle text-3xl text-amber-500 mb-3"></i>
            <p class="text-surface-600">No participation data found for this application.</p>
            <Button label="Back" icon="pi pi-arrow-left" class="mt-4" @click="router.push(`/wallet/${walletId}`)" />
        </div>

        <!-- Main layout: list + detail -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <!-- Ledger list (left) -->
            <AppLedgerList :reversed-ledgers="reversedLedgers" :selected-row="selectedRow" @select="selectLedger" />

            <!-- Detail panel (right, 2 cols) -->
            <div class="lg:col-span-2 flex flex-col gap-2">
                <div class="px-1 mb-1">
                    <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">App Ledger Details</p>
                    <p class="text-xs text-surface-400 mt-0.5">
                        Inspect the full details and transaction history of the selected ledger.
                    </p>
                </div>
                <!-- Nothing selected -->
                <div
                    v-if="selectedIdx === null || !selectedLedger"
                    class="flex flex-col items-center justify-center py-16 text-surface-400"
                >
                    <i class="pi pi-hand-pointer text-4xl mb-3"></i>
                    <p class="text-sm">Select a ledger on the left to explore its records</p>
                </div>

                <!-- Selected ledger detail -->
                <AppLedgerDetailCard
                    v-else
                    v-model:active-tab="activeTab"
                    :ledger="selectedLedger"
                    :selected-vb="selectedVb"
                    :is-loading-vb="isLoadingVb"
                    :vb-error="vbError"
                    :account-crypto="accountCrypto"
                    :wallet-name="wallet?.name ?? ''"
                    :first-and-last-microblock-anchoring-date="firstAndLastMicroblockAnchoringDate"
                    @delete="confirmDeleteLedger"
                />
            </div>
        </div>
    </div>
</template>
