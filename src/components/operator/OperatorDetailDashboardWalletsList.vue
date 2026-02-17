<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, ref} from "vue";
import {useGetAllWallets, useCreateWalletMutation, useDeleteWalletMutation} from "../../composables/operator.ts";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import Message from "primevue/message";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import {useToast} from "primevue/usetoast";
import {useConfirm} from "primevue/useconfirm";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const getAllWalletsRequest = useGetAllWallets(operatorId.value);
const createWalletMutation = useCreateWalletMutation(operatorId.value);
const deleteWalletMutation = useDeleteWalletMutation(operatorId.value);
const toast = useToast();
const confirm = useConfirm();

// Dialog state
const showCreateWalletDialog = ref(false);
const newWalletRpcEndpoint = ref('');

function openCreateWalletDialog() {
  newWalletRpcEndpoint.value = '';
  showCreateWalletDialog.value = true;
}

async function createWallet() {
  if (!newWalletRpcEndpoint.value.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please enter an RPC endpoint',
      life: 3000
    });
    return;
  }

  try {
    await createWalletMutation.mutateAsync({
      rpcEndpoint: newWalletRpcEndpoint.value.trim()
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Wallet created successfully',
      life: 3000
    });

    showCreateWalletDialog.value = false;
    await getAllWalletsRequest.refetch();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to create wallet',
      life: 3000
    });
  }
}

function confirmDeleteWallet(wallet: any) {
  confirm.require({
    message: `Are you sure you want to delete wallet "${wallet.rpcEndpoint}"? This action cannot be undone.`,
    header: 'Delete Wallet',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteWalletMutation.mutateAsync(wallet.rpcEndpoint);

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Wallet deleted successfully',
          life: 3000
        });

        await getAllWalletsRequest.refetch();
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.response?.data?.message || 'Failed to delete wallet',
          life: 3000
        });
      }
    }
  });
}

</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="pi pi-wallet text-2xl text-primary-500"></i>
          <span>Wallets</span>
        </div>
        <Button label="Add Wallet" icon="pi pi-plus" size="small" @click="openCreateWalletDialog" />
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

          <Column header="Actions" style="width: 100px">
            <template #body="slotProps">
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                @click="confirmDeleteWallet(slotProps.data)"
                :loading="deleteWalletMutation.isPending.value"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </Card>

  <!-- Create Wallet Dialog -->
  <Dialog v-model:visible="showCreateWalletDialog" modal header="Add Wallet" :style="{ width: '500px' }">
    <div class="space-y-4 py-4">
      <div>
        <label for="walletRpcEndpoint" class="block text-sm font-semibold text-gray-700 mb-2">
          RPC Endpoint
        </label>
        <InputText
          id="walletRpcEndpoint"
          v-model="newWalletRpcEndpoint"
          placeholder="https://rpc.example.com"
          class="w-full"
        />
        <small class="text-surface-500 mt-1 block">Enter the RPC endpoint URL for the wallet</small>
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" text @click="showCreateWalletDialog = false" />
      <Button
        label="Create"
        @click="createWallet"
        :loading="createWalletMutation.isPending.value"
      />
    </template>
  </Dialog>
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
