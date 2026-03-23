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

// Track wallet expansion
const walletExpanded = ref(true);

function toggleWallet() {
  walletExpanded.value = !walletExpanded.value;
}

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

function navigateToHome() {
  router.push(`/`);
}

function navigateToWallet() {
  router.push(`/wallet/${props.walletId}`);
}

function navigateToOrganization(orgId: number) {
  router.push(`/wallet/${props.walletId}/organization/${orgId}`);
}

function navigateToApplication(orgId: number, appId: number) {
  router.push(`/wallet/${props.walletId}/organization/${orgId}/application/${appId}`);
}

function navigateToNode(orgId: number, nodeId: number) {
  router.push(`/wallet/${props.walletId}/organization/${orgId}/node/${nodeId}`);
}

// Check if current route matches
function isWalletActive() {
  return route.name === 'wallet-detail'
}

function isOrganizationActive(orgId: number) {
  return route.name === 'organization-detail' && Number(route.params.orgId) === orgId;
}

function isNodeActive(orgId: number, nodeId: number) {
  return route.name === 'node-detail' &&
      Number(route.params.orgId) === orgId &&
      Number(route.params.nodeId) === nodeId;
}

function isApplicationActive(orgId: number, appId: number) {
  return route.name === 'application-detail' &&
      Number(route.params.orgId) === orgId &&
      Number(route.params.appId) === appId;
}
</script>

<template>
  <div v-if="wallet" class="h-screen bg-gray-50 border-r border-gray-200 overflow-y-auto flex flex-col fixed w-64">
    <div class="flex-1 py-4 pr-4">
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

      <!-- Home -->
      <div
          @click="navigateToHome"
          class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-2 hover:bg-gray-100 text-gray-700"
      >
        <i class="pi pi-home text-lg"></i>
        <span class="text-sm">Home</span>
      </div>

      <!-- Wallet Item -->
      <div
        class="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1"
        :class="isWalletActive() ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-gray-100 text-gray-700'"
      >
        <div @click="navigateToWallet" class="flex items-center gap-2 flex-1 min-w-0">
          <i class="pi pi-wallet text-base flex-shrink-0"></i>
          <span class="text-sm truncate">{{ wallet.name }}</span>
        </div>
        <button
          v-if="wallet.organizations.length > 0"
          @click.stop="toggleWallet"
          class="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
        >
          <i
            class="pi text-xs"
            :class="walletExpanded ? 'pi-chevron-down' : 'pi-chevron-right'"
          ></i>
        </button>
      </div>

      <!-- Organizations (children of wallet) -->
      <div v-if="walletExpanded" class="ml-3 border-l-2 border-gray-200 pl-2 space-y-1 mb-1">
        <div v-for="org in wallet.organizations" :key="org.id" class="space-y-1">

          <!-- Organization Header -->
          <div
            class="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors"
            :class="isOrganizationActive(org.id) ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-gray-100 text-gray-700'"
          >
            <div @click="navigateToOrganization(org.id)" class="flex items-center gap-2 flex-1 min-w-0">
              <i class="pi pi-building text-xs flex-shrink-0"></i>
              <span class="text-sm truncate">{{ org.name }}</span>
            </div>
            <button
              v-if="org.nodes.length > 0 || org.applications.length > 0"
              @click.stop="toggleOrg(org.id)"
              class="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            >
              <i
                class="pi text-xs"
                :class="isOrgExpanded(org.id) ? 'pi-chevron-down' : 'pi-chevron-right'"
              ></i>
            </button>
          </div>

          <!-- Org Sub-items (Nodes & Applications) -->
          <div v-if="isOrgExpanded(org.id)" class="ml-3 border-l-2 border-gray-200 pl-2 space-y-1">
            <!-- Nodes -->
            <div
              v-for="node in org.nodes"
              :key="node.id"
              @click="navigateToNode(org.id, node.id)"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              :class="isNodeActive(org.id, node.id) ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-gray-100 text-gray-600'"
            >
              <i class="pi pi-sitemap text-xs flex-shrink-0"></i>
              <span class="text-xs truncate">{{ node.name }}</span>
            </div>

            <!-- Applications -->
            <div
              v-for="app in org.applications"
              :key="app.id"
              @click="navigateToApplication(org.id, app.id)"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              :class="isApplicationActive(org.id, app.id) ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-gray-100 text-gray-600'"
            >
              <i class="pi pi-box text-xs flex-shrink-0"></i>
              <span class="text-xs truncate">{{ app.name }}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
