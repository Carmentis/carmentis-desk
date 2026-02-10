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
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card v-for="org in organizations" :key="org.id" class="hover:shadow-lg transition-shadow cursor-pointer" @click="visitWallet(org.id)">
        <template #header>
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
            <div class="flex items-center justify-between text-white">
              <i class="pi pi-wallet text-3xl"></i>
              <span class="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">ID: {{ org.id }}</span>
            </div>
          </div>
        </template>
        <template #title>
          <div class="text-lg font-semibold text-gray-900 truncate">{{ org.name }}</div>
        </template>
        <template #content>
          <div class="space-y-2 text-sm text-gray-600">
            <div class="flex items-center gap-2">
              <i class="pi pi-server text-gray-400"></i>
              <span class="truncate">{{ org.nodeEndpoint }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-building text-gray-400"></i>
              <span>{{ org.organizations?.length || 0 }} organization(s)</span>
            </div>
          </div>
        </template>
        <template #footer>
          <Button label="View Details" icon="pi pi-arrow-right" class="w-full" text @click.stop="visitWallet(org.id)" />
        </template>
      </Card>
    </div>

  </div>
</template>