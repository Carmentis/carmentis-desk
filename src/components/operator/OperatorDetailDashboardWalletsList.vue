<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed} from "vue";
import {useGetAllWallets} from "../../composables/operator.ts";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import Message from "primevue/message";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const getAllWalletsRequest = useGetAllWallets(operatorId.value);

</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center gap-3">
        <i class="pi pi-wallet text-2xl text-primary-500"></i>
        <span>Wallets</span>
      </div>
    </template>
    <template #content>
      <!-- Loading State -->
      <div v-if="getAllWalletsRequest.isPending.value" class="space-y-3">
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>

      <!-- Error State -->
      <Message v-else-if="getAllWalletsRequest.isError.value" severity="error" :closable="false">
        Failed to load wallets: {{ getAllWalletsRequest.error.value?.message }}
      </Message>

      <!-- Empty State -->
      <div v-else-if="!getAllWalletsRequest.data.value || getAllWalletsRequest.data.value.length === 0"
           class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 mb-4">
          <i class="pi pi-wallet text-3xl text-surface-400"></i>
        </div>
        <h3 class="text-lg font-medium text-surface-900 mb-2">No wallets found</h3>
        <p class="text-surface-500">No wallets are currently registered with this operator.</p>
      </div>

      <!-- Data Table -->
      <div v-else>
        <div class="mb-4 flex items-center justify-between">
          <span class="text-surface-600 text-sm">
            <i class="pi pi-info-circle mr-2"></i>
            {{ getAllWalletsRequest.data.value.length }} wallet{{ getAllWalletsRequest.data.value.length !== 1 ? 's' : '' }} found
          </span>
        </div>

        <DataTable
          :value="getAllWalletsRequest.data.value"
          stripedRows
          showGridlines
          :paginator="getAllWalletsRequest.data.value.length > 10"
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          responsiveLayout="scroll"
          class="text-sm"
        >
          <Column field="rpcEndpoint" header="RPC Endpoint" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-server text-surface-400"></i>
                <span class="font-mono text-xs">{{ slotProps.data.rpcEndpoint }}</span>
              </div>
            </template>
          </Column>

          <Column header="Status" style="width: 120px">
            <template #body>
              <div class="flex items-center gap-2">
                <i class="pi pi-check-circle text-green-500"></i>
                <span class="text-xs text-surface-600">Active</span>
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </Card>
</template>

<style scoped>
:deep(.p-datatable) {
  font-size: 0.875rem;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-50);
  color: var(--surface-700);
  font-weight: 600;
  padding: 0.75rem 1rem;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.75rem 1rem;
}
</style>
