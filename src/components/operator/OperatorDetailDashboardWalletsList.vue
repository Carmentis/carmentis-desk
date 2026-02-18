<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, ref} from "vue";
import {useGetAllWallets, useCreateWalletMutation, useDeleteWalletMutation} from "../../composables/operator.ts";
import {useStorageStore, WalletEntity} from "../../stores/storage.ts";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import Message from "primevue/message";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Password from "primevue/password";
import {useToast} from "primevue/usetoast";
import {useConfirm} from "primevue/useconfirm";
import {storeToRefs} from "pinia";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const getAllWalletsRequest = useGetAllWallets(operatorId.value);
const createWalletMutation = useCreateWalletMutation(operatorId.value);
const deleteWalletMutation = useDeleteWalletMutation(operatorId.value);
const toast = useToast();
const confirm = useConfirm();
const storageStore = useStorageStore();
const {organizations} = storeToRefs(storageStore);

// Dialog state
const showCreateWalletDialog = ref(false);
const showUploadWalletDialog = ref(false);
const newWalletRpcEndpoint = ref('');
const newWalletName = ref('');
const newWalletSeed = ref('');
const selectedWalletToUpload = ref<WalletEntity | null>(null);

function openCreateWalletDialog() {
  newWalletRpcEndpoint.value = '';
  newWalletName.value = '';
  newWalletSeed.value = '';
  showCreateWalletDialog.value = true;
}

function openUploadWalletDialog() {
  selectedWalletToUpload.value = null;
  showUploadWalletDialog.value = true;
}

async function createWallet() {
  if (!newWalletRpcEndpoint.value.trim() || !newWalletName.value.trim() || !newWalletSeed.value.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all fields',
      life: 3000
    });
    return;
  }

  try {
    await createWalletMutation.mutateAsync({
      rpcEndpoint: newWalletRpcEndpoint.value.trim(),
      name: newWalletName.value.trim(),
      seed: newWalletSeed.value.trim()
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

async function uploadWallet() {
  if (!selectedWalletToUpload.value) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please select a wallet',
      life: 3000
    });
    return;
  }

  try {
    await createWalletMutation.mutateAsync({
      rpcEndpoint: selectedWalletToUpload.value.nodeEndpoint,
      name: selectedWalletToUpload.value.name,
      seed: selectedWalletToUpload.value.seed
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Wallet uploaded successfully',
      life: 3000
    });

    showUploadWalletDialog.value = false;
    await getAllWalletsRequest.refetch();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to upload wallet',
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
        <div class="flex gap-2">
          <Button label="Upload Wallet" icon="pi pi-upload" size="small" severity="secondary" outlined @click="openUploadWalletDialog" />
          <Button label="Add Wallet" icon="pi pi-plus" size="small" @click="openCreateWalletDialog" />
        </div>
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

          <Column field="walletId" header="Wallet ID" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-server text-surface-400"></i>
                <span class="font-mono text-xs">{{ slotProps.data.walletId }}</span>
              </div>
            </template>
          </Column>

          <Column field="name" header="Name" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-server text-surface-400"></i>
                <span class="font-mono text-xs">{{ slotProps.data.name }}</span>
              </div>
            </template>
          </Column>

          <Column field="rpcEndpoint" header="RPC Endpoint" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-server text-surface-400"></i>
                <span class="font-mono text-xs">{{ slotProps.data.rpcEndpoint }}</span>
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
        <label for="walletName" class="block text-sm font-semibold text-gray-700 mb-2">
          Wallet Name
        </label>
        <InputText
          id="walletName"
          v-model="newWalletName"
          placeholder="Enter wallet name"
          class="w-full"
        />
      </div>
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
      </div>
      <div>
        <label for="walletSeed" class="block text-sm font-semibold text-gray-700 mb-2">
          Seed
        </label>
        <Password
          id="walletSeed"
          v-model="newWalletSeed"
          placeholder="Enter wallet seed"
          class="w-full"
          :feedback="false"
          toggleMask
        />
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

  <!-- Upload Wallet Dialog -->
  <Dialog v-model:visible="showUploadWalletDialog" modal header="Upload Wallet" :style="{ width: '550px' }">
    <div class="space-y-4 py-4">
      <Message severity="warn" :closable="false">
        <div class="space-y-2">
          <p class="font-semibold">⚠️ Security Warning</p>
          <p class="text-sm">
            When you click "Upload", the selected wallet's <strong>seed phrase and endpoint</strong>
            will be sent to the operator server. Only proceed if you trust this operator.
          </p>
        </div>
      </Message>

      <div>
        <label for="selectWallet" class="block text-sm font-semibold text-gray-700 mb-2">
          Select Wallet
        </label>
        <Dropdown
          id="selectWallet"
          v-model="selectedWalletToUpload"
          :options="organizations"
          optionLabel="name"
          placeholder="Select a wallet to upload"
          class="w-full"
        >
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex items-center gap-2">
              <i class="pi pi-wallet text-surface-500"></i>
              <span>{{ slotProps.value.name }}</span>
            </div>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
          <template #option="slotProps">
            <div class="flex items-center gap-2">
              <i class="pi pi-wallet text-surface-500"></i>
              <div>
                <div class="">{{ slotProps.option.name }}</div>
                <div class="text-xs text-surface-500">{{ slotProps.option.nodeEndpoint }}</div>
              </div>
            </div>
          </template>
        </Dropdown>
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" text @click="showUploadWalletDialog = false" />
      <Button
        label="Upload"
        severity="warning"
        @click="uploadWallet"
        :loading="createWalletMutation.isPending.value"
        :disabled="!selectedWalletToUpload"
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
