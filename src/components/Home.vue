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
  import Menubar from "primevue/menubar";
  import type { MenuItem } from "primevue/menuitem";


  const store = useStorageStore();
  await store.initStorage();

  const {organizations, operators} = storeToRefs(store);
  const confirm = useConfirm();
  const toast = useToast();

  // Operator creation dialog state
  const showOperatorDialog = ref(false);
  const newOperatorName = ref('');
  const newOperatorEndpoint = ref('');

  // Search filter
  const searchQuery = ref('');

  // Filtered organizations and operators based on search query
  const filteredOrganizations = computed(() => {
    if (!searchQuery.value.trim()) {
      return organizations.value;
    }
    const query = searchQuery.value.toLowerCase();
    return organizations.value.filter(org =>
      org.name.toLowerCase().includes(query)
    );
  });

  const filteredOperators = computed(() => {
    if (!searchQuery.value.trim()) {
      return operators.value;
    }
    const query = searchQuery.value.toLowerCase();
    return operators.value.filter(op =>
      op.name.toLowerCase().includes(query)
    );
  });

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

  // Menu items for the navbar
  const menuItems = computed<MenuItem[]>(() => [
    {
      label: 'Wallets',
      icon: 'pi pi-wallet',
      items: [
        {
          label: 'Create Wallet',
          icon: 'pi pi-plus',
          command: () => router.push('/wallet/new')
        },
        {
          separator: true,
          visible: organizations.value.length > 0
        },
        {
          label: 'Clear All Wallets',
          icon: 'pi pi-trash',
          command: () => confirmClearAllOrganizations(),
          visible: organizations.value.length > 0
        }
      ]
    },
    {
      label: 'Operators',
      icon: 'pi pi-server',
      items: [
        {
          label: 'Add Operator',
          icon: 'pi pi-plus',
          command: () => openOperatorDialog()
        },
        {
          separator: true,
          visible: operators.value.length > 0
        },
        {
          label: 'Clear All Operators',
          icon: 'pi pi-trash',
          command: () => confirmClearAllOperators(),
          visible: operators.value.length > 0
        }
      ]
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      items: [
        {
          label: searchUpdateButtonMessage.value,
          icon: 'pi pi-refresh',
          command: () => checkForUpdate()
        }
      ]
    }
  ]);

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
    <!-- Menubar Navigation -->
    <Menubar :model="menuItems">
      <template #start>
        <div class="flex items-center gap-2">
          <i class="pi pi-home text-2xl text-primary"></i>
          <div>
            <h2 class="text-xl font-bold text-gray-900">Home</h2>
          </div>
        </div>
      </template>
      <template #end>
        <div class="flex items-center gap-2">
          <span class="p-input-icon-left">
            <InputText v-model="searchQuery" placeholder="Search..." class="w-64" size="small" />
          </span>
        </div>
      </template>
    </Menubar>

    <!-- Subtitle -->
    <div class="px-2">
      <p class="text-sm text-gray-500">Manage your wallets and operators</p>
    </div>

    <!-- Empty State -->
    <div v-if="organizations.length === 0 && operators.length === 0" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <i class="pi pi-wallet text-3xl text-gray-400"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No information to display</h3>
      <p class="text-gray-500 mb-6"></p>
    </div>


    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Wallets Grid -->
      <Card v-for="org in filteredOrganizations" :key="org.id"
            class="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer bg-surface-0"
            @click="visitWallet(org.id)">
        <template #content>
          <div class="p-2 space-y-4">
            <!-- Header -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br bg-gray-100 from-surface-100 to-surface-50 flex items-center justify-center group-hover:from-primary-50 group-hover:to-primary-100 transition-colors">
                  <i class="pi pi-wallet text-2xl text-surface-600"></i>
                </div>
                <div>
                  <h3 class="text-base font-semibold text-surface-900 truncate">{{ org.name }}</h3>
                  <span class="text-xs text-surface-400 font-mono">ID: {{ org.id }}</span>
                </div>
              </div>
              <span class="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-md">WALLET</span>
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

      <!-- Operators Grid -->
      <Card v-for="operator in filteredOperators" :key="operator.id"
            class="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer bg-surface-0"
            @click="visitOperator(operator.id)">
        <template #content>
          <div class="p-2 space-y-4">
            <!-- Header -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br bg-gray-100 from-surface-100 to-surface-50 flex items-center justify-center group-hover:from-primary-50 group-hover:to-primary-100 transition-colors">
                  <i class="pi pi-server text-2xl text-surface-600"></i>
                </div>
                <div>
                  <h3 class="text-base font-semibold text-surface-900 truncate">{{ operator.name }}</h3>
                  <span class="text-xs text-surface-400 font-mono">ID: {{ operator.id }}</span>
                </div>
              </div>
              <span class="px-2 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-md">OPERATOR</span>
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