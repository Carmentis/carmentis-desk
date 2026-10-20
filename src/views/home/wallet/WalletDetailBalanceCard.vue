<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import UiCard from '../../../components/ui/UiCard.vue';
import AmountDisplay from '../../../components/ui/AmountDisplay.vue';
import EmptyState from '../../../components/ui/EmptyState.vue';
import ErrorState from '../../../components/ui/ErrorState.vue';
import ErrorDetails from '../../../components/ui/ErrorDetails.vue';
import SkeletonBlock from '../../../components/ui/SkeletonBlock.vue';
import WalletDetailTransactionsHistoryDialog
    from './components/transactionsHistory/WalletDetailTransactionsHistoryDialog.vue';
import WalletDetailTokenTransferDialog from './WalletDetailTokenTransferDialog.vue';
import WalletDetailBreakdownDetailsDialog from './WalletDetailBreakdownDetailsDialog.vue';
import WalletDetailReceiveDialog from './WalletDetailReceiveDialog.vue';
import { useAccountStatus } from '../../../composables/useAccountStatus.ts';

const { status, error, retry, breakdownQuery } = useAccountStatus();

const showBreakdownDetailsDialog = ref(false);
const showTokenTransferDialog = ref(false);
const showReceiveDialog = ref(false);
const showAccountTransactionsHistory = ref(false);

const breakdown = computed(() => breakdownQuery.data.value);
const updatedAt = computed(() =>
    breakdownQuery.dataUpdatedAt.value ? new Date(breakdownQuery.dataUpdatedAt.value).toLocaleTimeString() : '',
);
</script>

<template>
    <UiCard title="Balance">
        <template v-if="updatedAt && status === 'ready'" #header-actions>
            <span class="text-xs text-fg-muted">Updated {{ updatedAt }}</span>
        </template>

        <SkeletonBlock v-if="status === 'loading'" label="Loading your balance…" :lines="3" />

        <!-- A real failure (unreachable node or indexer): friendly message, raw text on demand -->
        <ErrorState
            v-else-if="status === 'error'"
            title="Balance unavailable"
            message="We could not load your balance. Check your connection and the network settings of this wallet."
            :details="error?.message"
            retryable
            @retry="retry"
        />

        <div v-else-if="status === 'ready' && breakdown" class="space-y-5">
            <!-- Spendable is what the user cares about; the rest is secondary -->
            <div>
                <p class="text-sm text-fg-muted">Spendable</p>
                <AmountDisplay :value="breakdown.getSpendable()" size="hero" />
            </div>

            <dl class="grid gap-2 sm:grid-cols-3">
                <div
                    v-for="item in [
                        { label: 'Staked', value: breakdown.getStaked() },
                        { label: 'Vested', value: breakdown.getVested() },
                        { label: 'Escrowed', value: breakdown.getEscrowed() },
                    ]"
                    :key="item.label"
                    class="flex items-baseline justify-between gap-3 rounded-control bg-surface-muted px-3 py-2 sm:block"
                >
                    <dt class="text-xs text-fg-muted">{{ item.label }}</dt>
                    <dd><AmountDisplay :value="item.value" size="sm" /></dd>
                </div>
            </dl>

            <div class="grid grid-cols-3 gap-2">
                <Button label="Send" icon="pi pi-send" icon-pos="top" @click="showTokenTransferDialog = true" />
                <Button
                    label="Receive"
                    icon="pi pi-download"
                    icon-pos="top"
                    severity="secondary"
                    outlined
                    @click="showReceiveDialog = true"
                />
                <Button
                    label="History"
                    icon="pi pi-clock"
                    icon-pos="top"
                    severity="secondary"
                    outlined
                    @click="showAccountTransactionsHistory = true"
                />
            </div>

            <Button
                label="Staked, vested and escrowed details"
                icon="pi pi-list"
                text
                severity="secondary"
                size="small"
                class="w-full sm:w-auto"
                @click="showBreakdownDetailsDialog = true"
            />
        </div>

        <!-- No account yet: how to get tokens. The node's "unknown account" answer is only a detail. -->
        <EmptyState
            v-else
            icon="pi-wallet"
            title="No account on the blockchain yet"
            description="Your account is created the first time this wallet receives tokens."
        >
            <div class="flex flex-col items-center gap-1">
                <Button label="Receive tokens" icon="pi pi-download" @click="showReceiveDialog = true" />
                <ErrorDetails v-if="error" :details="error.message" />
            </div>
        </EmptyState>
    </UiCard>

    <!-- dialogs -->
    <WalletDetailTokenTransferDialog v-model:isOpen="showTokenTransferDialog" />
    <WalletDetailReceiveDialog v-model:isOpen="showReceiveDialog" />
    <WalletDetailTransactionsHistoryDialog v-model:is-open="showAccountTransactionsHistory" />
    <WalletDetailBreakdownDetailsDialog v-model:isOpen="showBreakdownDetailsDialog" />
</template>
