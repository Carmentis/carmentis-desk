<script setup lang="ts">
import {computed, ref} from 'vue';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import {Transaction} from "./Transaction.ts";
import {useCurrentWallet} from "../../../../../composables/useCurrentWallet.ts";
import ResponsiveDialog from "../../../../../components/ui/ResponsiveDialog.vue";
import CopyableValue from "../../../../../components/ui/CopyableValue.vue";
import EmptyState from "../../../../../components/ui/EmptyState.vue";
import ErrorState from "../../../../../components/ui/ErrorState.vue";
import SkeletonBlock from "../../../../../components/ui/SkeletonBlock.vue";

const {useAccountTransactionsHistory, useHasAccountOnChainQuery, useAccountIdQuery} = useCurrentWallet();
const accountIdQuery = useAccountIdQuery();
const isOpen = defineModel<boolean>('isOpen', { default: false });

// define the limit to use
const limit = ref(5);
const higherThanHeight = ref(0);
const accountHistoryQuery = computed(() => {
    const res = useAccountTransactionsHistory(higherThanHeight, limit);
    return res.accountHistoryQuery
})
const hasAccount = useHasAccountOnChainQuery();
const transactions = computed(() => {
    const data = accountHistoryQuery.value.data.value;
    if (!data) return [];
    return data.items.map((dto) => {
        const transaction = new Transaction(dto);
        const amount = transaction.getAmount();
        return {
            height: transaction.getHeight(),
            amount: transaction.getAmount().toString(),
            transferredAt: transaction.transferredAt().toLocaleString(),
            type: transaction.getTransactionTypeLabel(),
            linkedAccount: dto.linkedAccountId.endsWith('000000000000000000000000000000002')
                ? 'Fees Account'
                : dto.linkedAccountId,
            isNegative: amount.isNegative(),
            isZero: amount.isZero(),
        }
    });
});
</script>

<template>
    <ResponsiveDialog v-model:visible="isOpen" header="Transaction history" size="lg">
        <SkeletonBlock v-if="accountIdQuery.isLoading.value" label="Loading your account…" :lines="3" height-class="h-12" />

        <EmptyState
            v-else-if="!hasAccount"
            icon="pi-wallet"
            title="No account yet"
            description="This wallet does not have an account on the blockchain yet."
        />

        <SkeletonBlock v-else-if="accountHistoryQuery.isLoading.value" label="Loading transactions…" :lines="5" height-class="h-12" />

        <ErrorState
            v-else-if="accountHistoryQuery.error.value"
            title="History unavailable"
            message="We could not load your transactions. Check your connection and try again."
            :details="accountHistoryQuery.error.value.message"
            retryable
            @retry="accountHistoryQuery.refetch()"
        />

        <div v-else-if="accountHistoryQuery.data.value" class="space-y-4">
            <!-- Paging options -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                    <label for="limit" class="mb-1 block text-sm font-medium text-fg">Show</label>
                    <InputNumber input-id="limit" v-model="limit" :min="1" :max="20" suffix=" transactions" fluid />
                </div>
                <div>
                    <label for="higher_than_height" class="mb-1 block text-sm font-medium text-fg">From block</label>
                    <InputNumber input-id="higher_than_height" v-model="higherThanHeight" :min="0" fluid />
                </div>
                <Button
                    icon="pi pi-refresh"
                    label="Refresh"
                    severity="secondary"
                    outlined
                    class="col-span-2 sm:col-span-1"
                    :loading="accountHistoryQuery.isFetching.value"
                    @click="() => accountHistoryQuery.refetch()"
                />
            </div>

            <EmptyState
                v-if="transactions.length === 0"
                icon="pi-clock"
                title="No transactions"
                description="Nothing was found for these options."
            />

            <ul v-else class="divide-y divide-line">
                <li v-for="(tx, index) in transactions" :key="`${tx.height}-${index}`" class="flex gap-3 py-3">
                    <span
                        class="flex size-10 shrink-0 items-center justify-center rounded-full"
                        :class="tx.isZero
                            ? 'bg-surface-muted text-fg-muted'
                            : tx.isNegative ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'"
                    >
                        <i
                            class="pi"
                            :class="tx.isZero ? 'pi-equals' : tx.isNegative ? 'pi-arrow-up-right' : 'pi-arrow-down-left'"
                            aria-hidden="true"
                        />
                    </span>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-baseline justify-between gap-3">
                            <span class="truncate font-medium text-fg">{{ tx.type }}</span>
                            <span
                                class="shrink-0 font-semibold tabular-nums"
                                :class="tx.isZero ? 'text-fg' : tx.isNegative ? 'text-danger' : 'text-success'"
                            >
                                <span class="sr-only">{{ tx.isZero ? '' : tx.isNegative ? 'Sent ' : 'Received ' }}</span>{{ !tx.isZero && !tx.isNegative ? '+' : '' }}{{ tx.amount }}
                            </span>
                        </div>
                        <p class="text-xs text-fg-muted">{{ tx.transferredAt }} · Block {{ tx.height }}</p>
                        <p v-if="tx.linkedAccount === 'Fees Account'" class="text-xs text-fg-muted">Network fees</p>
                        <CopyableValue v-else :value="tx.linkedAccount" label="linked account" :head="10" :tail="8" />
                    </div>
                </li>
            </ul>
        </div>
    </ResponsiveDialog>
</template>
