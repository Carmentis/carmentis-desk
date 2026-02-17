<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, ref} from "vue";
import {useGetAllUsers, useCreateUserMutation} from "../../composables/operator.ts";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import Message from "primevue/message";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import {useToast} from "primevue/usetoast";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const getAllUsersRequest = useGetAllUsers(operatorId.value);
const createUserMutation = useCreateUserMutation(operatorId.value);
const toast = useToast();

// Dialog state
const showCreateUserDialog = ref(false);
const newUserPseudo = ref('');
const newUserPublicKey = ref('');

// Helper function to get initials from pseudo
function getInitials(pseudo: string): string {
  return pseudo
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Helper function to truncate public key for display
function truncatePublicKey(key: string): string {
  if (key.length <= 100) return key;
  return `${key.slice(0, 100)}...`;
}

function openCreateUserDialog() {
  newUserPseudo.value = '';
  newUserPublicKey.value = '';
  showCreateUserDialog.value = true;
}

async function createUser() {
  if (!newUserPseudo.value.trim() || !newUserPublicKey.value.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all fields',
      life: 3000
    });
    return;
  }

  try {
    await createUserMutation.mutateAsync({
      pseudo: newUserPseudo.value.trim(),
      publicKey: newUserPublicKey.value.trim()
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User created successfully',
      life: 3000
    });

    showCreateUserDialog.value = false;
    await getAllUsersRequest.refetch();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to create user',
      life: 3000
    });
  }
}

</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="pi pi-users text-2xl text-primary-500"></i>
          <span>Users</span>
        </div>
        <Button label="Add User" icon="pi pi-plus" size="small" @click="openCreateUserDialog" />
      </div>
    </template>
    <template #content>
      <!-- Loading State -->
      <div v-if="getAllUsersRequest.isPending.value" class="space-y-3">
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>

      <!-- Error State -->
      <Message v-else-if="getAllUsersRequest.isError.value" severity="error" :closable="false">
        Failed to load users: {{ getAllUsersRequest.error.value?.message }}
      </Message>

      <!-- Empty State -->
      <div v-else-if="!getAllUsersRequest.data.value || getAllUsersRequest.data.value.length === 0"
           class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 mb-4">
          <i class="pi pi-users text-3xl text-surface-400"></i>
        </div>
        <h3 class="text-lg font-medium text-surface-900 mb-2">No users found</h3>
        <p class="text-surface-500">No users are currently registered with this operator.</p>
      </div>

      <!-- Data Table -->
      <div v-else>
        <div class="mb-4 flex items-center justify-between">
          <span class="text-surface-600 text-sm">
            <i class="pi pi-info-circle mr-2"></i>
            {{ getAllUsersRequest.data.value.length }} user{{ getAllUsersRequest.data.value.length !== 1 ? 's' : '' }} found
          </span>
        </div>

        <DataTable
          :value="getAllUsersRequest.data.value"
          stripedRows
          showGridlines
          :paginator="getAllUsersRequest.data.value.length > 10"
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          responsiveLayout="scroll"
          class="text-sm"
        >
          <Column field="pseudo" header="User" sortable style="min-width: 200px">
            <template #body="slotProps">
              <div class="flex items-center gap-3">
                <Avatar
                  :label="getInitials(slotProps.data.pseudo)"
                  shape="circle"
                  class="bg-primary-100 text-primary-700"
                  size="normal"
                />
                <div>
                  <div class="font-semibold text-surface-900">{{ slotProps.data.pseudo }}</div>
                  <div class="text-xs text-surface-500">User</div>
                </div>
              </div>
            </template>
          </Column>

          <Column field="publicKey" header="Public Key" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i class="pi pi-key text-surface-400 text-xs"></i>
                <code class="text-xs bg-surface-50 px-2 py-1 rounded text-surface-700 font-mono">
                  {{ truncatePublicKey(slotProps.data.publicKey) }}
                </code>
              </div>
            </template>
          </Column>

        </DataTable>
      </div>
    </template>
  </Card>

  <!-- Create User Dialog -->
  <Dialog v-model:visible="showCreateUserDialog" modal header="Add User" :style="{ width: '500px' }">
    <div class="space-y-4 py-4">
      <div>
        <label for="userPseudo" class="block text-sm font-semibold text-gray-700 mb-2">
          Pseudo
        </label>
        <InputText
          id="userPseudo"
          v-model="newUserPseudo"
          placeholder="Enter user pseudo"
          class="w-full"
        />
      </div>
      <div>
        <label for="userPublicKey" class="block text-sm font-semibold text-gray-700 mb-2">
          Public Key
        </label>
        <Textarea
          id="userPublicKey"
          v-model="newUserPublicKey"
          placeholder="Enter public key"
          rows="4"
          class="w-full"
        />
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" text @click="showCreateUserDialog = false" />
      <Button
        label="Create"
        @click="createUser"
        :loading="createUserMutation.isPending.value"
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

:deep(.p-avatar) {
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
