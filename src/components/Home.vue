<script setup lang="ts">
  import {useStorageStore} from "../stores/storage.ts";
  import {storeToRefs} from "pinia";
  import Button from "primevue/button";
  import Card from "primevue/card";
  import router from "../router";
  import {useConfirm} from "primevue/useconfirm";
  import Dialog from "primevue/dialog";
  import InputText from "primevue/inputtext";
  import {computed, ref} from "vue";
  import {useToast} from "primevue/usetoast";
  import { check } from '@tauri-apps/plugin-updater';
  import { relaunch } from '@tauri-apps/plugin-process';


  const store = useStorageStore();
  await store.initStorage();

  const {organizations, operators} = storeToRefs(store);
  const confirm = useConfirm();
  const toast = useToast();

  // Operator creation dialog state
  const showOperatorDialog = ref(false);
  const newOperatorName = ref('');
  const newOperatorEndpoint = ref('');

  function visitWallet(orgId: number) {
    router.push(`/wallet/${orgId}`);
  }

  function visitOperator(operatorId: number) {
    router.push(`/operator/${operatorId}`);
  }

  function confirmClearAllOrganizations() {
    confirm.require({
      message: 'Are you sure you want to clear all wallets? This action cannot be undone.',
      header: 'Clear All Wallets',
      icon: 'pi pi-exclamation-triangle',
      rejectClass: 'p-button-secondary p-button-outlined',
      rejectLabel: 'Cancel',
      acceptLabel: 'Clear All',
      acceptClass: 'p-button-danger',
      accept: () => {
        store.clearOrganizations();
      }
    });
  }

  function openOperatorDialog() {
    newOperatorName.value = '';
    newOperatorEndpoint.value = '';
    showOperatorDialog.value = true;
  }

  async function createOperator() {
    if (!newOperatorName.value.trim() || !newOperatorEndpoint.value.trim()) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all fields',
        life: 3000
      });
      return;
    }

    try {
      await store.addOperator({
        name: newOperatorName.value.trim(),
        httpEndpoint: newOperatorEndpoint.value.trim()
      });

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Operator created successfully',
        life: 3000
      });

      showOperatorDialog.value = false;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create operator',
        life: 3000
      });
    }
  }

  function confirmClearAllOperators() {
    confirm.require({
      message: 'Are you sure you want to clear all operators? This action cannot be undone.',
      header: 'Clear All Operators',
      icon: 'pi pi-exclamation-triangle',
      rejectClass: 'p-button-secondary p-button-outlined',
      rejectLabel: 'Cancel',
      acceptLabel: 'Clear All',
      acceptClass: 'p-button-danger',
      accept: () => {
        store.clearOperators();
      }
    });
  }

  const isSearchingForUpdate = ref(false);
  const isDownloadingUpdate = ref(false);
  const downloadingProgress = ref(0);
  const searchUpdateButtonMessage = computed(() => {
    if (isSearchingForUpdate.value) {
      return 'Searching for update...';
    } else if (isDownloadingUpdate.value) {
      return `Downloading update (${downloadingProgress.value}%)`;
    } else {
      return 'Check for update';
    }
  });
  async function checkForUpdate() {
    isSearchingForUpdate.value = true;
    try {
      const update = await check();
      if (update) {
        confirm.require({
          message: `An update is available for version ${update.version}. Would you like to update now?`,
          header: 'Update Available',
          icon: 'pi pi-exclamation-triangle',
          rejectClass: 'p-button-secondary p-button-outlined',
          rejectLabel: 'Cancel',
          acceptLabel: 'Update',
          acceptClass: 'p-button-success',
          accept: async () => {
            let downloaded = 0;
            let contentLength = 0;
            isDownloadingUpdate.value = true;
            // alternatively we could also call update.download() and update.install() separately
            await update.downloadAndInstall((event) => {
              switch (event.event) {
                case 'Started':
                  contentLength = event.data.contentLength ?? 0;
                  break;
                case 'Progress':
                  downloaded += event.data.chunkLength;
                  const progression = Math.round((downloaded / contentLength) * 100);
                  downloadingProgress.value = progression;
                  break;
                case 'Finished':
                  break;
              }
            });

            isDownloadingUpdate.value = false;
            downloadingProgress.value = 0;
            await relaunch();
          }
        })
      }
    } finally {
      isSearchingForUpdate.value = false;
    }
  }
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Wallets</h2>
        <p class="mt-1 text-sm text-gray-500">Manage your wallets</p>
      </div>
      <div class="flex gap-2">
        <Button v-if="organizations.length > 0" label="Clear All Wallets" icon="pi pi-trash" severity="danger" outlined @click="confirmClearAllOrganizations" />
        <router-link to="/wallet/new">
          <Button label="Create Wallet" icon="pi pi-plus"  />
        </router-link>
        <Button :label="searchUpdateButtonMessage" @click="checkForUpdate"/>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="organizations.length === 0" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <i class="pi pi-wallet text-3xl text-gray-400"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No wallets yet</h3>
      <p class="text-gray-500 mb-6">Get started by creating your first wallet</p>
      <router-link to="/wallet/new">
        <Button label="Create Your First Wallet" icon="pi pi-plus" />
      </router-link>
    </div>

    <!-- Wallets Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card v-for="org in organizations" :key="org.id"
            class="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer bg-surface-0"
            @click="visitWallet(org.id)">
        <template #content>
          <div class="p-6 space-y-4">
            <!-- Header -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-surface-100 to-surface-50 flex items-center justify-center group-hover:from-primary-50 group-hover:to-primary-100 transition-colors">
                  <i class="pi pi-wallet text-2xl text-surface-600"></i>
                </div>
                <div>
                  <h3 class="text-base font-semibold text-surface-900 truncate">{{ org.name }}</h3>
                  <span class="text-xs text-surface-400 font-mono">ID: {{ org.id }}</span>
                </div>
              </div>
            </div>

            <!-- Details -->
            <div class="space-y-2.5 text-sm border-t border-surface-100 pt-4">
              <div class="flex items-center gap-2.5 text-surface-600">
                <i class="pi pi-server text-surface-400 text-xs"></i>
                <span class="truncate text-xs">{{ org.nodeEndpoint }}</span>
              </div>
              <div class="flex items-center gap-2.5 text-surface-600">
                <i class="pi pi-building text-surface-400 text-xs"></i>
                <span class="text-xs">{{ org.organizations?.length || 0 }} organizations</span>
              </div>
            </div>

            <!-- Action -->
            <div class="pt-2">
              <div class="flex items-center justify-between text-surface-500 hover:text-primary-600 transition-colors text-sm font-medium">
                <span>View details</span>
                <i class="pi pi-arrow-right text-xs"></i>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Operators Section -->
    <div class="mt-12">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-3xl font-bold text-gray-900">Operators</h2>
          <p class="mt-1 text-sm text-gray-500">Manage your operators</p>
        </div>
        <div class="flex gap-2">
          <Button v-if="operators.length > 0" label="Clear All Operators" icon="pi pi-trash" severity="danger" outlined @click="confirmClearAllOperators" />
          <Button label="Add Operator" icon="pi pi-plus" @click="openOperatorDialog" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="operators.length === 0" class="text-center py-12 bg-surface-50 rounded-lg">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <i class="pi pi-server text-3xl text-gray-400"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No operators yet</h3>
        <p class="text-gray-500 mb-6">Get started by adding your first operator</p>
        <Button label="Add Your First Operator" icon="pi pi-plus" @click="openOperatorDialog" />
      </div>

      <!-- Operators Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card v-for="operator in operators" :key="operator.id"
              class="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer bg-surface-0"
              @click="visitOperator(operator.id)">
          <template #content>
            <div class="p-6 space-y-4">
              <!-- Header -->
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-surface-100 to-surface-50 flex items-center justify-center group-hover:from-primary-50 group-hover:to-primary-100 transition-colors">
                    <i class="pi pi-server text-2xl text-surface-600"></i>
                  </div>
                  <div>
                    <h3 class="text-base font-semibold text-surface-900 truncate">{{ operator.name }}</h3>
                    <span class="text-xs text-surface-400 font-mono">ID: {{ operator.id }}</span>
                  </div>
                </div>
              </div>

              <!-- Details -->
              <div class="space-y-2.5 text-sm border-t border-surface-100 pt-4">
                <div class="flex items-center gap-2.5 text-surface-600">
                  <i class="pi pi-globe text-surface-400 text-xs"></i>
                  <span class="truncate text-xs">{{ operator.httpEndpoint }}</span>
                </div>
              </div>

              <!-- Action -->
              <div class="pt-2">
                <div class="flex items-center justify-between text-surface-500 hover:text-primary-600 transition-colors text-sm font-medium">
                  <span>View details</span>
                  <i class="pi pi-arrow-right text-xs"></i>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Operator Creation Dialog -->
    <Dialog v-model:visible="showOperatorDialog" modal header="Add Operator" :style="{ width: '450px' }">
      <div class="space-y-4 py-4">
        <div>
          <label for="operatorName" class="block text-sm font-semibold text-gray-700 mb-2">
            Operator Name
          </label>
          <InputText
            id="operatorName"
            v-model="newOperatorName"
            placeholder="Enter operator name"
            class="w-full"
            @keyup.enter="createOperator"
          />
        </div>
        <div>
          <label for="operatorEndpoint" class="block text-sm font-semibold text-gray-700 mb-2">
            HTTP Endpoint
          </label>
          <InputText
            id="operatorEndpoint"
            v-model="newOperatorEndpoint"
            placeholder="https://example.com/api"
            class="w-full"
            @keyup.enter="createOperator"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showOperatorDialog = false" />
        <Button label="Create" @click="createOperator" />
      </template>
    </Dialog>

  </div>
</template>