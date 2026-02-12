<script setup lang="ts">
  import {useStorageStore} from "../stores/storage.ts";
  import {storeToRefs} from "pinia";
  import Button from "primevue/button";
  import Card from "primevue/card";
  import router from "../router";
  import {useConfirm} from "primevue/useconfirm";



  const store = useStorageStore();
  await store.initStorage();

  const {organizations} = storeToRefs(store);
  const confirm = useConfirm();

  function visitWallet(orgId: number) {
    router.push(`/wallet/${orgId}`);
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

  </div>
</template>