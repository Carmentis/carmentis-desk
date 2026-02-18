<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, ref} from "vue";
import {
  useGetAllApiKeys,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useToggleApiKeyMutation,
  useGetAllApplications
} from "../../composables/operator.ts";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import Message from "primevue/message";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Calendar from "primevue/calendar";
import InputSwitch from "primevue/inputswitch";
import Password from "primevue/password";
import {useToast} from "primevue/usetoast";
import {useConfirm} from "primevue/useconfirm";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const getAllApiKeysRequest = useGetAllApiKeys(operatorId.value);
const getAllApplicationsRequest = useGetAllApplications(operatorId.value);
const createApiKeyMutation = useCreateApiKeyMutation(operatorId.value);
const deleteApiKeyMutation = useDeleteApiKeyMutation(operatorId.value);
const toggleApiKeyMutation = useToggleApiKeyMutation(operatorId.value);
const toast = useToast();
const confirm = useConfirm();

// Dialog state
const showCreateApiKeyDialog = ref(false);
const newApiKeyName = ref('');
const selectedApplication = ref<any>(null);
const activeUntilDate = ref<Date | null>(null);

function openCreateApiKeyDialog() {
  newApiKeyName.value = '';
  selectedApplication.value = null;
  activeUntilDate.value = null;
  showCreateApiKeyDialog.value = true;
}

async function createApiKey() {
  if (!newApiKeyName.value.trim() || !selectedApplication.value) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields',
      life: 3000
    });
    return;
  }

  try {
    await createApiKeyMutation.mutateAsync({
      name: newApiKeyName.value.trim(),
      applicationVbId: selectedApplication.value.vbId,
      activeUntil: activeUntilDate.value ? activeUntilDate.value.toISOString() : null
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'API key created successfully',
      life: 3000
    });

    showCreateApiKeyDialog.value = false;
    await getAllApiKeysRequest.refetch();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to create API key',
      life: 3000
    });
  }
}

async function toggleApiKey(apiKey: any) {
  try {
    await toggleApiKeyMutation.mutateAsync({
      id: apiKey.id,
      isActive: !apiKey.isActive
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `API key ${apiKey.isActive ? 'deactivated' : 'activated'} successfully`,
      life: 3000
    });

    await getAllApiKeysRequest.refetch();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to toggle API key',
      life: 3000
    });
  }
}

function confirmDeleteApiKey(apiKey: any) {
  confirm.require({
    message: `Are you sure you want to delete API key "${apiKey.name}"? This action cannot be undone.`,
    header: 'Delete API Key',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteApiKeyMutation.mutateAsync(apiKey.id);

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'API key deleted successfully',
          life: 3000
        });

        await getAllApiKeysRequest.refetch();
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.response?.data?.message || 'Failed to delete API key',
          life: 3000
        });
      }
    }
  });
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'No expiration';
  return new Date(dateString).toLocaleDateString();
}

</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="pi pi-key text-2xl text-primary-500"></i>
          <span>API Keys</span>
        </div>
        <Button label="Add API Key" icon="pi pi-plus" size="small" @click="openCreateApiKeyDialog" />
      </div>
    </template>
    <template #content>
      <!-- Loading State -->
      <div v-if="getAllApiKeysRequest.isPending.value" class="space-y-3">
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>

      <!-- Error State -->
      <Message v-else-if="getAllApiKeysRequest.isError.value" severity="error" :closable="false">
        Failed to load API keys: {{ getAllApiKeysRequest.error.value?.message }}
      </Message>

      <!-- Empty State -->
      <div v-else-if="!getAllApiKeysRequest.data.value || getAllApiKeysRequest.data.value.length === 0"
           class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 mb-4">
          <i class="pi pi-key text-3xl text-surface-400"></i>
        </div>
        <h3 class="text-lg font-medium text-surface-900 mb-2">No API keys found</h3>
        <p class="text-surface-500">No API keys are currently registered with this operator.</p>
      </div>

      <!-- Data Table -->
      <div v-else>
        <div class="mb-4 flex items-center justify-between">
          <span class="text-surface-600 text-sm">
            <i class="pi pi-info-circle mr-2"></i>
            {{ getAllApiKeysRequest.data.value.length }} API key{{ getAllApiKeysRequest.data.value.length !== 1 ? 's' : '' }} found
          </span>
        </div>

        <DataTable
          :value="getAllApiKeysRequest.data.value"
          stripedRows
          showGridlines
          :paginator="getAllApiKeysRequest.data.value.length > 10"
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          responsiveLayout="scroll"
          class="text-sm"
        >
          <Column field="ID" header="ID" sortable style="min-width: 150px">
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-tag text-surface-400 text-xs"></i>
                <span class="font-semibold">{{ slotProps.data.id }}</span>
              </div>
            </template>
          </Column>

          <Column field="name" header="Name" sortable style="min-width: 150px">
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-tag text-surface-400 text-xs"></i>
                <span class="font-semibold">{{ slotProps.data.name }}</span>
              </div>
            </template>
          </Column>

          <Column field="apiKey" header="API Key" style="min-width: 200px">
            <template #body="slotProps">
              <Password
                :modelValue="slotProps.data.apiKey"
                :feedback="false"
                toggleMask
                disabled
                class="w-full"
                inputClass="text-xs font-mono"
              />
            </template>
          </Column>

          <Column field="applicationVbId" header="Application Name" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-box text-surface-400 text-xs"></i>
                <code class="text-xs bg-surface-50 px-2 py-1 rounded text-surface-700 font-mono">
                  {{ slotProps.data.application.name }}
                </code>
              </div>
            </template>
          </Column>

          <Column field="createdAt" header="Created" sortable style="width: 120px">
            <template #body="slotProps">
              <span class="text-xs">{{ formatDate(slotProps.data.createdAt) }}</span>
            </template>
          </Column>

          <Column field="activeUntil" header="Valid Until" sortable style="width: 130px">
            <template #body="slotProps">
              <span class="text-xs" :class="slotProps.data.activeUntil ? 'text-surface-700' : 'text-surface-500'">
                {{ formatDate(slotProps.data.activeUntil) }}
              </span>
            </template>
          </Column>

          <Column field="isActive" header="Status" style="width: 100px">
            <template #body="slotProps">
              {{slotProps.data.isActive ? 'Active' : 'Inactive' }}
            </template>
          </Column>

          <Column header="Actions" style="width: 100px">
            <template #body="slotProps">
              <InputSwitch
                  :modelValue="slotProps.data.isActive"
                  @update:modelValue="toggleApiKey(slotProps.data)"
              />

              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                @click="confirmDeleteApiKey(slotProps.data)"
                :loading="deleteApiKeyMutation.isPending.value"
              />

            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </Card>

  <!-- Create API Key Dialog -->
  <Dialog v-model:visible="showCreateApiKeyDialog" modal header="Add API Key" :style="{ width: '500px' }">
    <div class="space-y-4 py-4">
      <div>
        <label for="apiKeyName" class="block text-sm font-semibold text-gray-700 mb-2">
          Name <span class="text-red-500">*</span>
        </label>
        <InputText
          id="apiKeyName"
          v-model="newApiKeyName"
          placeholder="Enter API key name"
          class="w-full"
        />
      </div>
      <div>
        <label for="apiKeyApplication" class="block text-sm font-semibold text-gray-700 mb-2">
          Application <span class="text-red-500">*</span>
        </label>
        <Dropdown
          id="apiKeyApplication"
          v-model="selectedApplication"
          :options="getAllApplicationsRequest.data.value || []"
          optionLabel="vbId"
          placeholder="Select an application"
          class="w-full"
          :loading="getAllApplicationsRequest.isPending.value"
        >
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex items-center gap-2">
              <i class="pi pi-box text-surface-500"></i>
              <span>{{ slotProps.value.vbId }}</span>
            </div>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
          <template #option="slotProps">
            <div class="flex items-center gap-2">
              <i class="pi pi-box text-surface-500"></i>
              <div>
                <div class="font-semibold">{{ slotProps.option.vbId }}</div>
                <div class="text-xs text-surface-500 font-mono">{{ slotProps.option.walletRpcEndpoint }}</div>
              </div>
            </div>
          </template>
        </Dropdown>
        <small class="text-surface-500 mt-1 block">Select from applications registered with the operator</small>
      </div>
      <div>
        <label for="apiKeyValidUntil" class="block text-sm font-semibold text-gray-700 mb-2">
          Valid Until (Optional)
        </label>
        <Calendar
          id="apiKeyValidUntil"
          v-model="activeUntilDate"
          placeholder="Select expiration date"
          class="w-full"
          dateFormat="yy-mm-dd"
          :minDate="new Date()"
          showIcon
        />
        <small class="text-surface-500 mt-1 block">Leave empty for no expiration</small>
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" text @click="showCreateApiKeyDialog = false" />
      <Button
        label="Create"
        @click="createApiKey"
        :loading="createApiKeyMutation.isPending.value"
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

:deep(.p-password input) {
  width: 100%;
}

:deep(.p-password.p-disabled) {
  opacity: 1;
}

:deep(.p-password.p-disabled input) {
  background-color: var(--surface-50);
}
</style>
