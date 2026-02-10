<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useStorageStore} from '../stores/storage';
import Card from 'primevue/card';

const props = defineProps<{
  walletId: number;
}>();

const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();

const wallet = computed(() =>
  storageStore.organizations.find(w => w.id === props.walletId)
);

const chainEndpoint = computed(() => wallet.value?.nodeEndpoint || 'Not connected');

// Track which organizations are expanded
const expandedOrgs = ref<Set<number>>(new Set());

function toggleOrg(orgId: number) {
  if (expandedOrgs.value.has(orgId)) {
    expandedOrgs.value.delete(orgId);
  } else {
    expandedOrgs.value.add(orgId);
  }
}

function isOrgExpanded(orgId: number) {
  return expandedOrgs.value.has(orgId);
}

function navigateToWallet() {
  router.push(`/wallet/${props.walletId}`);
}

function navigateToOrganization(orgId: number) {
  router.push(`/wallet/${props.walletId}/organization/${orgId}`);
}

function navigateToNode(orgId: number, nodeId: number) {
  router.push(`/wallet/${props.walletId}/organization/${orgId}/node/${nodeId}`);
}

// Check if current route matches
function isWalletActive() {
  return route.name === 'wallet-detail' && Number(route.params.id) === props.walletId;
}

function isOrganizationActive(orgId: number) {
  return route.name === 'organization-detail' && Number(route.params.orgId) === orgId;
}

function isNodeActive(nodeId: number) {
  return route.name === 'node-detail' && Number(route.params.nodeId) === nodeId;
}
</script>

<template>
  <div v-if="wallet" class="h-full bg-gray-50 border-r border-gray-200 overflow-y-auto flex flex-col">
    <div class="flex-1 p-4">
      <!-- Chain Connection Card at Top -->
      <div class="mb-4">
        <Card class="shadow-sm">
          <template #content>
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0">
                <i class="pi pi-link text-blue-600 text-lg"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Connected Chain
                </div>
                <div class="text-xs text-gray-700 break-all">
                  {{ chainEndpoint }}
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Wallet Item -->
      <div
        @click="navigateToWallet"
        class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-2"
        :class="isWalletActive() ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-gray-100 text-gray-700'"
      >
        <i class="pi pi-wallet text-lg"></i>
        <span class="text-sm">{{ wallet.name }}</span>
      </div>

      <!-- Organizations -->
      <div class="space-y-1">
        <div v-for="org in wallet.organizations" :key="org.id" class="space-y-1">
          <!-- Organization Header -->
          <div
            class="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors"
            :class="isOrganizationActive(org.id) ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-gray-100 text-gray-700'"
          >
            <div @click="navigateToOrganization(org.id)" class="flex items-center gap-2 flex-1 min-w-0">
              <i class="pi pi-building text-sm flex-shrink-0"></i>
              <span class="text-sm truncate">{{ org.name }}</span>
            </div>
            <button
              @click.stop="toggleOrg(org.id)"
              class="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <i
                class="pi text-xs transition-transform"
                :class="isOrgExpanded(org.id) ? 'pi-chevron-down' : 'pi-chevron-right'"
              ></i>
            </button>
          </div>

          <!-- Organization Sub-items (Nodes & Applications) -->
          <div v-if="isOrgExpanded(org.id)" class="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
            <!-- Nodes Section -->
            <div v-if="org.nodes.length > 0" class="space-y-1">
              <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nodes
              </div>
              <div
                v-for="node in org.nodes"
                :key="node.id"
                @click="navigateToNode(org.id, node.id)"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                :class="isNodeActive(node.id) ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-gray-100 text-gray-600'"
              >
                <i class="pi pi-sitemap text-xs"></i>
                <span class="text-sm truncate">{{ node.name }}</span>
              </div>
            </div>

            <!-- Applications Section -->
            <div v-if="org.applications.length > 0" class="space-y-1 mt-2">
              <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Applications
              </div>
              <div
                v-for="app in org.applications"
                :key="app.id"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 text-gray-600"
              >
                <i class="pi pi-box text-xs"></i>
                <span class="text-sm truncate">{{ app.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
