<script setup lang="ts">
import { useRoute } from 'vue-router';
import {computed, ref} from 'vue';
import { useAccountTransactionsHistory, useHasAccountOnChainQuery } from '../../../../../composables/useAccountBreakdown.ts';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import {computedAsync} from "@vueuse/core";
import {Transaction} from "./Transaction.ts";

const route = useRoute();
const walletId = computed(() => Number(route.params.walletId));

// define the limit to use
const limit = ref(5);
const higherThanHeight = ref(0);
const accountHistoryQuery = computed(() => {
    const res = useAccountTransactionsHistory(walletId.value, higherThanHeight, limit);
    return res.accountHistoryQuery
})

const hasAccount = useHasAccountOnChainQuery(walletId.value);

const HISTORY_TYPE_LABELS: Record<number, string> = {
    1: 'Transfer',
    2: 'Stake',
    3: 'Unstake',
};

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
    <!-- No Account State -->
    <Card v-if="!hasAccount">
        <template #content>
            <div class="flex flex-col items-center justify-center p-6 text-center">
                <i class="pi pi-wallet text-4xl text-gray-400 mb-3"></i>
                <h3 class="text-lg font-semibold mb-2">No Account Yet</h3>
                <p class="text-gray-600">This wallet does not have an account on the blockchain yet.</p>
            </div>
        </template>
    </Card>

    <!-- Loading State -->
    <Card v-else-if="accountHistoryQuery.isLoading.value">
        <template #content>
            <div class="flex flex-col items-center justify-center p-6">
                <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
                <p class="mt-4 text-gray-600">Loading transaction history...</p>
            </div>
        </template>
    </Card>

    <!-- Transaction History DataTable -->
    <Card v-else-if="accountHistoryQuery.data.value">
        <template #title>
            <div class="flex justify-between items-center">
                <div class="space-x-2">
                    <i class="pi pi-calendar" />
                    <span>Transaction History</span>
                </div>

                <Button @click="() => accountHistoryQuery.refetch()">Refetch</Button>
            </div>
        </template>
        <template #content>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="flex flex-col items-start gap-2 w-auto">
                    <label for="limit" class="text-sm font-normal">Limit:</label>
                    <InputNumber
                        id="limit"
                        v-model="limit"
                        @update:modelValue="(newLimit) => (limit = newLimit)"
                        :min="1"
                        :max="20"
                        showButtons
                        buttonLayout="horizontal"
                    />
                </div>
                <div class="flex flex-col items-start gap-2 w-auto">
                    <label for="limit" class="text-sm font-normal">From height:</label>
                    <InputNumber
                        id="heigher_than_height"
                        v-model="higherThanHeight"
                        @update:modelValue="(hth) => (higherThanHeight = hth)"
                        :min="0"
                        showButtons
                        buttonLayout="horizontal"
                    />
                </div>
            </div>
            <DataTable :value="transactions" stripedRows>
                <Column field="height" header="Height" sortable></Column>
                <Column field="amount" header="Amount" sortable>
                    <template #body="slotProps">
                        <div class="flex items-center gap-2">
                            <i v-if="slotProps.data.isZero" class="pi pi-equals"></i>
                            <i v-else-if="!slotProps.data.isNegative" class="pi pi-arrow-up text-green-500"></i>
                            <i v-else class="pi pi-arrow-down text-red-500"></i>
                            <span>{{ slotProps.data.amount }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="transferredAt" header="Date" sortable></Column>
                <Column field="type" header="Type" sortable></Column>
                <Column field="linkedAccount" header="Linked Account"></Column>
            </DataTable>
        </template>
    </Card>
</template>
