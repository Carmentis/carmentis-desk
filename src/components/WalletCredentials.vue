<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStorageStore } from '../stores/storage';
import MenuBar from 'primevue/menubar';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import type { MenuItem } from 'primevue/menuitem';

const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
const toast = useToast();

const walletId = computed(() => Number(route.params.walletId));
const wallet = computed(() =>
  storageStore.organizations.find(w => w.id === walletId.value)
);

// Add credential dialog
const showAddDialog = ref(false);
const credentialName = ref('');
const credentialData = ref('');

function openAddDialog() {
  credentialName.value = '';
  credentialData.value = '';
  showAddDialog.value = true;
}

async function submitAddDialog() {
  if (!credentialName.value) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Credential name is required', life: 3000 });
    return;
  }
  if (!credentialData.value) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Credential data is required', life: 3000 });
    return;
  }
  try {
    JSON.parse(credentialData.value);
  } catch {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Credential data must be valid JSON', life: 3000 });
    return;
  }
  await storageStore.addCredential(walletId.value, {
    name: credentialName.value,
    data: credentialData.value,
  });
  toast.add({ severity: 'success', summary: 'Credential added', detail: `Credential "${credentialName.value}" added successfully`, life: 3000 });
  showAddDialog.value = false;
}

const menuItems = computed<MenuItem[]>(() => [
  {
    label: 'Add Credential',
    icon: 'pi pi-plus',
    command: openAddDialog,
  },
]);

const credentials = computed(() => wallet.value?.credentials ?? []);
</script>

<template>
  <div>
    <div v-if="wallet">
      <div class="space-y-4">
        <MenuBar :model="menuItems" />

        <div class="px-1">
          <div v-if="credentials.length === 0" class="text-center py-12">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <i class="pi pi-id-card text-2xl text-gray-400"></i>
            </div>
            <p class="text-gray-500 text-sm mb-4">No credentials yet</p>
            <Button @click="openAddDialog" label="Add Credential" icon="pi pi-plus" size="small" />
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="credential in credentials"
              :key="credential.id"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-id-card text-gray-500"></i>
                <span class="font-medium text-gray-900">{{ credential.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Credential Dialog -->
      <Dialog v-model:visible="showAddDialog" header="Add Credential" modal class="w-full max-w-lg">
        <div class="space-y-4">
          <div>
            <label for="credential-name" class="block text-sm font-medium text-gray-700 mb-2">
              Name <span class="text-red-500">*</span>
            </label>
            <InputText id="credential-name" v-model="credentialName" placeholder="Enter credential name" class="w-full" />
          </div>
          <div>
            <label for="credential-data" class="block text-sm font-medium text-gray-700 mb-2">
              JSON Data <span class="text-red-500">*</span>
            </label>
            <Textarea id="credential-data" v-model="credentialData" placeholder='{"key": "value"}' class="w-full" rows="8" />
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Cancel" @click="showAddDialog = false" severity="secondary" outlined />
            <Button label="Add" @click="submitAddDialog" icon="pi pi-check" />
          </div>
        </template>
      </Dialog>
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center py-12 px-4">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Wallet Not Found</h1>
      <p class="text-gray-500 mb-6">The wallet you're looking for doesn't exist.</p>
      <Button @click="router.push('/')" label="Back to Home" icon="pi pi-home" />
    </div>
  </div>
</template>
