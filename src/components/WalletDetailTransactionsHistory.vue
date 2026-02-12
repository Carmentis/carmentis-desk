<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed} from "vue";
import {useAccountTransactionsHistory, useHasAccountOnChainQuery} from "../composables/useAccountBreakdown.ts";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import ProgressSpinner from "primevue/progressspinner";
import InputNumber from "primevue/inputnumber";
import Button from "primevue/button";

const route = useRoute();

const walletId = computed(() => Number(route.params.walletId));

const {accountHistoryQuery, limit, setLimit} = useAccountTransactionsHistory(
    walletId.value,
);

const hasAccount = useHasAccountOnChainQuery(walletId.value);

const transactions = computed(() => {
  if (accountHistoryQuery.data.value) {
    return accountHistoryQuery.data.value.getTransactions().map((transaction) => ({
      height: transaction.getHeight(),
      amount: transaction.getAmount(),
      transferredAt: transaction.transferredAt(),
      type: transaction.getTransactionTypeLabel(),
      linkedAccount: transaction.getLinkedAccount().encode(),
    }));
  }
  return [];
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
        <span>Transaction History</span>
        <div class="flex items-center gap-2 w-auto">
          <label for="limit" class="text-sm font-normal">Limit:</label>
          <InputNumber
            id="limit"
            v-model="limit"
            @update:modelValue="setLimit"
            :min="1"
            :max="20"
            showButtons
            buttonLayout="horizontal"
          />
          <Button @click="() => accountHistoryQuery.refetch()">
            Refetch
          </Button>
        </div>
      </div>
    </template>
    <template #content>
      <DataTable :value="transactions" stripedRows>
        <Column field="height" header="Height" sortable></Column>
        <Column field="amount" header="Amount" sortable></Column>
        <Column field="transferredAt" header="Date" sortable></Column>
        <Column field="type" header="Type" sortable></Column>
        <Column field="linkedAccount" header="Linked Account"></Column>
      </DataTable>
    </template>
  </Card>
</template>