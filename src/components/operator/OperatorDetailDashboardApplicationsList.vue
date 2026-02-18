<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, ref, watch} from "vue";
import {useGetAllApplications, useCreateApplicationMutation, useDeleteApplicationMutation, useGetAllWallets} from "../../composables/operator.ts";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import Message from "primevue/message";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import {useToast} from "primevue/usetoast";
import {useConfirm} from "primevue/useconfirm";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const getAllApplicationsRequest = useGetAllApplications(operatorId.value);
const getAllWalletsRequest = useGetAllWallets(operatorId.value);
const createApplicationMutation = useCreateApplicationMutation(operatorId.value);
const deleteApplicationMutation = useDeleteApplicationMutation(operatorId.value);
const toast = useToast();
const confirm = useConfirm();

watch(getAllApplicationsRequest.data, () => {
  console.log(getAllApplicationsRequest.data.value)
})

// Dialog state
const showCreateApplicationDialog = ref(false);
const newApplicationName = ref('');
const newApplicationVbId = ref('');
const selectedWallet = ref<any>(null);

function openCreateApplicationDialog() {
  newApplicationVbId.value = '';
  newApplicationName.value = ''
  selectedWallet.value = null;
  showCreateApplicationDialog.value = true;
}

async function createApplication() {
  if (!newApplicationVbId.value.trim() || !newApplicationName.value.trim() || !selectedWallet.value) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all fields',
      life: 3000
    });
    return;
  }

  try {
    console.log("Selected wallet for creating application:", selectedWallet.value)
    await createApplicationMutation.mutateAsync({
      vbId: newApplicationVbId.value.trim(),
      walletId: selectedWallet.value.walletId,
      name: newApplicationName.value
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Application created successfully',
      life: 3000
    });

    showCreateApplicationDialog.value = false;
    await getAllApplicationsRequest.refetch();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to create application',
      life: 3000
    });
  }
}

function confirmDeleteApplication(application: any) {
  confirm.require({
    message: `Are you sure you want to delete application "${application.vbId}"? This action cannot be undone.`,
    header: 'Delete Application',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteApplicationMutation.mutateAsync(application.vbId);

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Application deleted successfully',
          life: 3000
        });

        await getAllApplicationsRequest.refetch();
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.response?.data?.message || 'Failed to delete application',
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
          <i class="pi pi-box text-2xl text-primary-500"></i>
          <span>Applications</span>
        </div>
        <Button label="Add Application" icon="pi pi-plus" size="small" @click="openCreateApplicationDialog" />
      </div>
    </template>
    <template #content>
      <!-- Loading State -->
      <div v-if="getAllApplicationsRequest.isPending.value" class="space-y-3">
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>

      <!-- Error State -->
      <Message v-else-if="getAllApplicationsRequest.isError.value" severity="error" :closable="false">
        Failed to load applications: {{ getAllApplicationsRequest.error.value?.message }}
      </Message>

      <!-- Empty State -->
      <div v-else-if="!getAllApplicationsRequest.data.value || getAllApplicationsRequest.data.value.length === 0"
           class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 mb-4">
          <i class="pi pi-box text-3xl text-surface-400"></i>
        </div>
        <h3 class="text-lg font-medium text-surface-900 mb-2">No applications found</h3>
        <p class="text-surface-500">No applications are currently registered with this operator.</p>
      </div>

      <!-- Data Table -->
      <div v-else>
        <div class="mb-4 flex items-center justify-between">
          <span class="text-surface-600 text-sm">
            <i class="pi pi-info-circle mr-2"></i>
            {{ getAllApplicationsRequest.data.value.length }} application{{ getAllApplicationsRequest.data.value.length !== 1 ? 's' : '' }} found
          </span>
        </div>

        <DataTable
          :value="getAllApplicationsRequest.data.value"
          stripedRows
          showGridlines
          :paginator="getAllApplicationsRequest.data.value.length > 10"
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          responsiveLayout="scroll"
          class="text-sm"
        >
          <Column field="name" header="Application Name" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-id-card text-surface-400 text-xs"></i>
                <code class="text-xs bg-surface-50 px-2 py-1 rounded text-surface-700 font-mono">
                  {{ slotProps.data.name }}
                </code>
              </div>
            </template>
          </Column>

          <Column field="vbId" header="VB ID" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-id-card text-surface-400 text-xs"></i>
                <code class="text-xs bg-surface-50 px-2 py-1 rounded text-surface-700 font-mono">
                  {{ slotProps.data.vbId }}
                </code>
              </div>
            </template>
          </Column>

          <Column field="walletName" header="Wallet Name" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-surface-400"></i>
                <span class="font-mono text-xs">{{ slotProps.data.wallet.name }}</span>
              </div>
            </template>
          </Column>

          <Column field="walletRpcEndpoint" header="Wallet RPC Endpoint" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-surface-400"></i>
                <span class="font-mono text-xs">{{ slotProps.data.wallet.rpcEndpoint }}</span>
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
                @click="confirmDeleteApplication(slotProps.data)"
                :loading="deleteApplicationMutation.isPending.value"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </Card>

  <!-- Create Application Dialog -->
  <Dialog v-model:visible="showCreateApplicationDialog" modal header="Add Application" :style="{ width: '500px' }">
    <div class="space-y-4 py-4">
      <div>
        <label for="applicationName" class="block text-sm font-semibold text-gray-700 mb-2">
          Application Name
        </label>
        <InputText
            id="applicationVbId"
            v-model="newApplicationName"
            placeholder="Enter Application Name"
            class="w-full"
        />
        <small class="text-surface-500 mt-1 block">Readable name for the application (can be different of the one on-chain)</small>
      </div>
      <div>
        <label for="applicationVbId" class="block text-sm font-semibold text-gray-700 mb-2">
          VB ID
        </label>
        <InputText
          id="applicationVbId"
          v-model="newApplicationVbId"
          placeholder="Enter VB ID"
          class="w-full"
        />
        <small class="text-surface-500 mt-1 block">The unique identifier for the application</small>
      </div>
      <div>
        <label for="applicationWallet" class="block text-sm font-semibold text-gray-700 mb-2">
          Associated Wallet
        </label>
        <Dropdown
          id="applicationWallet"
          v-model="selectedWallet"
          :options="getAllWalletsRequest.data.value || []"
          optionLabel="name"
          placeholder="Select a wallet"
          class="w-full"
          :loading="getAllWalletsRequest.isPending.value"
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
                <div class="font-semibold">{{ slotProps.option.name }}</div>
                <div class="text-xs text-surface-500 font-mono">{{ slotProps.option.rpcEndpoint }}</div>
              </div>
            </div>
          </template>
        </Dropdown>
        <small class="text-surface-500 mt-1 block">Select from wallets registered with the operator</small>
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" text @click="showCreateApplicationDialog = false" />
      <Button
        label="Create"
        @click="createApplication"
        :loading="createApplicationMutation.isPending.value"
      />
    </template>
  </Dialog>
</template>
