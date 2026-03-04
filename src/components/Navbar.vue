<script setup lang="ts">
import Button from 'primevue/button';
import {computed} from "vue";
import {useRoute} from "vue-router";
import {useStorageStore} from "../stores/storage.ts";
import {useAccountBreakdownQuery} from "../composables/useAccountBreakdown.ts";
import {CMTSToken} from "@cmts-dev/carmentis-sdk/client";
import Message from 'primevue/message';

const route = useRoute();
const storageStore = useStorageStore();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const appId = computed(() => Number(route.params.appId));
const nodeId = computed(() => Number(route.params.nodeId));

const wallet = computed(() =>
    storageStore.organizations.find(w => w.id === walletId.value)
);
const walletName = computed(() => wallet.value !== undefined ? wallet.value.name : "");

const organization = computed(() =>
    wallet.value?.organizations.find(org => org.id === orgId.value)
);
const organizationName = computed(() =>
    organization.value !== undefined ? organization.value.name : ""
);

const application = computed(() =>
    organization.value?.applications.find(app => app.id === appId.value)
);
const applicationName = computed(() => application.value !== undefined ? application.value.name : "");

const node = computed(() =>
    organization.value?.nodes.find(n => n.id === nodeId.value)
);
const nodeName = computed(() => node.value !== undefined ? node.value.name : "");

// Current page context - only show the current item
const currentPageContext = computed(() => {
  // Priority: Node > Application > Organization > Wallet
  if (node.value) {
    return {
      label: nodeName.value,
      icon: 'pi pi-sitemap',
      type: 'Node'
    };
  }

  if (application.value) {
    return {
      label: applicationName.value,
      icon: 'pi pi-box',
      type: 'Application'
    };
  }

  if (organization.value) {
    return {
      label: organizationName.value,
      icon: 'pi pi-building',
      type: 'Organization'
    };
  }

  if (wallet.value) {
    return {
      label: walletName.value,
      icon: 'pi pi-wallet',
      type: 'Wallet'
    };
  }

  return null;
});

// Account balance for wallet pages
const accountBalanceQuery = useAccountBreakdownQuery(walletId.value);
const accountBalance = computed(() => {
  let message = "";
  if (accountBalanceQuery.isFetching.value) message = 'Loading...'
  else if (accountBalanceQuery.data.value) {
    message = accountBalanceQuery.data.value.getSpendable().toString();
  } else {
    message = CMTSToken.zero().toString();
  }
  return message;
});

const showBalance = computed(() => {
  // Only show balance on wallet-related pages
  return route.name === 'wallet-detail' ||
         route.name === 'organization-detail' ||
         route.name === 'application-detail' ||
         route.name === 'node-detail';
});
</script>

<template>
  <div class="bg-white border rounded-md border-gray-200 px-4 py-3">
    <div class="flex items-center justify-between">
      <!-- Left: Current page context -->
      <div v-if="currentPageContext" class="flex items-center gap-3">
        <i :class="currentPageContext.icon" class="text-2xl text-gray-700"></i>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">{{ currentPageContext.type }}</div>
          <div class="text-lg font-semibold text-gray-900">{{ currentPageContext.label }}</div>
        </div>
      </div>

      <!-- Right: Balance display -->
      <div class="flex gap-3 items-center">
        <template v-if="showBalance">
          <Button
            @click="() => accountBalanceQuery.refetch()"
            icon="pi pi-refresh"
            text
            size="small"
            v-tooltip.bottom="'Refresh balance'"
          />
          <Message severity="info" :closable="false">
            <span class="text-sm font-medium">{{ accountBalance }}</span>
          </Message>
        </template>
      </div>
    </div>
  </div>
</template>
