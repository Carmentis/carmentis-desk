<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Breadcrumb from 'primevue/breadcrumb';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import {useStorageStore, NodeEntity} from '../stores/storage';
import {computedAsync} from "@vueuse/core";
import {
  CarmentisError,
  CryptoEncoderFactory,
  Hash,
  LockType,
  ProviderFactory,
  SeedEncoder,
  SignatureSchemeId,
  Utils,
  WalletCrypto
} from "@cmts-dev/carmentis-sdk/client";
import {useToast} from 'primevue/usetoast';
import { useQuery } from '@tanstack/vue-query'



const toast = useToast();
const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const wallet = computed(() =>
  storageStore.organizations.find(w => w.id === walletId.value)
);

const organization = computed(() =>
  wallet.value?.organizations.find(org => org.id === orgId.value)
);



const goBack = () => {
  router.push(`/wallet/${walletId.value}`);
};

// Breadcrumb
const breadcrumbHome = ref({
  icon: 'pi pi-home',
  command: () => router.push('/')
});

const breadcrumbItems = computed(() => {
  if (!wallet.value || !organization.value) return [];
  return [
    {
      label: wallet.value.name,
      command: () => router.push(`/wallet/${walletId.value}`)
    },
    {
      label: organization.value.name
    }
  ];
});

// wallet key pair (needed for account state)
const walletKeyPair = computedAsync(async () => {
  if (!wallet.value) return undefined;
  const seedEncoder = new SeedEncoder();
  const walletSeed = WalletCrypto.fromSeed(seedEncoder.decode(wallet.value.seed));
  const accountCrypto = walletSeed.getDefaultAccountCrypto();
  const sk = await accountCrypto.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);
  const pk = await sk.getPublicKey();
  const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
  return {sk: await sigEncoder.encodePrivateKey(sk), pk: await sigEncoder.encodePublicKey(pk)}
})
const pk = computed(() => walletKeyPair.value?.pk)

// wallet account id and state
const walletAccountId = computedAsync(async () => {
  if (wallet.value === undefined) return undefined;
  if (!pk.value) return undefined;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
  try {
    const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    return await provider.getAccountIdByPublicKey(await sigEncoder.decodePublicKey(pk.value));
  } catch (e) {
    if (CarmentisError.isCarmentisError(e)) {
      return Utils.getNullHash();
    }
    console.error(e)
    return undefined;
  }
});

const walletAccountState = computedAsync(async () => {
  if (wallet.value === undefined) return undefined;
  if (!pk.value) return undefined;
  if (walletAccountId.value === undefined) return undefined;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
  const accountId = await walletAccountId.value;
  const accountState = await provider.getAccountState(accountId);
  return accountState;
})

// Nodes management
const organizationNodes = computed(() => organization.value?.nodes || []);

const showManualImportForm = ref(false);
const manualNodeName = ref('');
const manualNodeVbId = ref('');
const manualNodeRpcEndpoint = ref('');

async function submitManualNodeImport() {
  if (!manualNodeName.value || !manualNodeRpcEndpoint.value) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Name and RPC endpoint are required', life: 3000 });
    return;
  }

  const newNode: Omit<NodeEntity, 'id'> = {
    name: manualNodeName.value,
    rpcEndpoint: manualNodeRpcEndpoint.value,
  };

  if (manualNodeVbId.value) {
    newNode.vbId = manualNodeVbId.value;
  }

  await storageStore.importExistingNodes(walletId.value, orgId.value, [newNode]);

  // Reset form
  manualNodeName.value = '';
  manualNodeVbId.value = '';
  manualNodeRpcEndpoint.value = '';
  showManualImportForm.value = false;

  toast.add({ severity: 'success', summary: 'Node added', detail: 'Node added successfully', life: 3000 });
}

async function deleteNode(nodeId: number) {
  await storageStore.deleteNodeById(walletId.value, orgId.value, nodeId);
  toast.add({ severity: 'success', summary: 'Node deleted', detail: 'Node deleted successfully', life: 3000 });
}

function visitNode(nodeId: number) {
  router.push(`/wallet/${walletId.value}/organization/${orgId.value}/node/${nodeId}`);
}

// organization nodes to claim
const showImportDialog = ref(false);
const nodesToImport = ref<string[]>([]);

async function fetchNodesOnChain() {
  const accountState = walletAccountState.value;
  if (!accountState) {
    toast.add({ severity: 'info', summary: 'No nodes', detail: 'No node to import', life: 3000 });
    return;
  }

  const locks = accountState.locks;
  const stakingLocks = locks.filter(lock => lock.type === LockType.NodeStaking);
  const nodesIds = stakingLocks.map(sl => Hash.from(sl.parameters.validatorNodeAccountId as Uint8Array));
  const newNodesIds = [];
  for (const nodeId of nodesIds) {
    const isAlreadyDeclared = await storageStore.isNodeDeclared(walletId.value, orgId.value, nodeId.encode());
    if (isAlreadyDeclared) {
    } else {
      newNodesIds.push(nodeId.encode());
    }
  }
  if (newNodesIds.length === 0) {
    toast.add({ severity: 'info', summary: 'No nodes', detail: 'No node to import', life: 3000 });
    return;
  }

  nodesToImport.value = newNodesIds;
  showImportDialog.value = true;
}

async function importNewNodes() {
  if (!wallet.value) return;

  // load new nodes
  const newNodes: Omit<NodeEntity, 'id'>[] = [];
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
  for (const newNodeId of nodesToImport.value) {
    const vb = await provider.loadValidatorNodeVirtualBlockchain(Hash.from(newNodeId));
    const rpcEndpoint = await vb.getRpcEndpointDeclaration();
    const nodeStatus = await provider.getNodeStatus(rpcEndpoint);
    const moniker = nodeStatus.result.node_info.moniker;
    newNodes.push({
      vbId: newNodeId,
      rpcEndpoint: rpcEndpoint,
      name: moniker
    });
  }

  // import nodes
  await storageStore.importExistingNodes(walletId.value, orgId.value, newNodes);
  showImportDialog.value = false;
  toast.add({ severity: 'success', summary: 'Nodes imported', detail: `${newNodes.length} node(s) imported successfully`, life: 3000 });
}

// Organization Details Form
const orgName = ref('');
const orgCountryCode = ref('');
const orgCity = ref('');
const orgWebsite = ref('');

// Initialize form values when organization loads
function initializeForm() {
  if (organization.value) {
    orgName.value = organization.value.name;
    orgCountryCode.value = organization.value.countryCode || '';
    orgCity.value = organization.value.city || '';
    orgWebsite.value = organization.value.website || '';
  }
}

// Watch for organization changes to initialize form
watch(organization, () => {
  if (organization.value) {
    initializeForm();
  }
}, { immediate: true });

async function updateOrganizationDetails() {
  if (!orgName.value.trim()) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Organization name is required', life: 3000 });
    return;
  }

  await storageStore.updateOrganizationDetails(walletId.value, orgId.value, {
    name: orgName.value.trim(),
    countryCode: orgCountryCode.value.trim() || undefined,
    city: orgCity.value.trim() || undefined,
    website: orgWebsite.value.trim() || undefined,
  });

  toast.add({ severity: 'success', summary: 'Organization updated', detail: 'Organization details updated successfully', life: 3000 });
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="wallet && organization">
      <!-- Breadcrumb -->
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="mb-4" />

      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ organization.name }}</h1>
        </div>
        <div class="flex gap-2">
          <Button @click="goBack" label="Back to Wallet" icon="pi pi-arrow-left" text />
        </div>
      </div>

      <!-- Organization Cards Side-by-Side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        <!-- Organization Info Card -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-xl"></i>
              <span>Organization Info</span>
            </div>
          </template>
          <template #content>
            <div v-if="organization.vbId">
              <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Blockchain ID</label>
              <code class="bg-gray-100 px-3 py-2 rounded text-sm block">{{ organization.vbId }}</code>
            </div>
            <div v-else class="text-center py-4">
              <i class="pi pi-exclamation-circle text-3xl text-amber-500 mb-2"></i>
              <p class="text-gray-600 text-sm">Publish first your organization on-chain to show information.</p>
            </div>
          </template>
        </Card>

        <!-- Organization Details Form Card -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-pencil text-xl"></i>
              <span>Organization Details</span>
            </div>
          </template>
          <template #content>
            <form @submit.prevent="updateOrganizationDetails" class="space-y-4">
              <div>
                <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
                  Name <span class="text-red-500">*</span>
                </label>
                <InputText id="org-name" v-model="orgName" placeholder="Organization name" class="w-full" required />
              </div>
              <div>
                <label for="org-country-code" class="block text-sm font-medium text-gray-700 mb-2">
                  Country Code
                </label>
                <InputText id="org-country-code" v-model="orgCountryCode" placeholder="e.g., US, FR, DE" class="w-full" />
              </div>
              <div>
                <label for="org-city" class="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <InputText id="org-city" v-model="orgCity" placeholder="City name" class="w-full" />
              </div>
              <div>
                <label for="org-website" class="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <InputText id="org-website" v-model="orgWebsite" placeholder="https://..." class="w-full" />
              </div>
              <div class="flex justify-end">
                <Button type="submit" label="Update Details" icon="pi pi-check" />
              </div>
            </form>
          </template>
        </Card>
      </div>

      <!-- Nodes & Applications Tabs -->
      <Card>
        <template #content>
          <Tabs value="0">
            <TabList>
              <Tab value="0">Nodes</Tab>
              <Tab value="1">Applications</Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="0">
                <div class="space-y-4">
                  <!-- Nodes Header Actions -->
                  <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Nodes ({{ organizationNodes.length }})</h3>
                    <div class="flex gap-2">
                      <Button @click="fetchNodesOnChain" label="Fetch On-Chain" icon="pi pi-cloud-download" size="small" outlined />
                      <Button @click="showManualImportForm = true" label="Add Node" icon="pi pi-plus" size="small" />
                    </div>
                  </div>

                  <!-- Nodes Content -->
                  <div v-if="organizationNodes.length === 0" class="text-center py-8">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <i class="pi pi-sitemap text-2xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-sm">No nodes configured yet</p>
                  </div>
                  <div v-else class="space-y-3">
                    <div
                      v-for="node of organizationNodes"
                      :key="node.id"
                      class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      @click="visitNode(node.id)"
                    >
                      <div class="flex items-start justify-between">
                        <div class="space-y-2 flex-1">
                          <div class="font-medium text-gray-900">{{ node.name }}</div>
                          <div class="text-xs text-gray-500 space-y-1">
                            <div v-if="node.vbId" class="flex items-center gap-2">
                              <i class="pi pi-tag"></i>
                              <code class="bg-gray-100 px-2 py-0.5 rounded">{{ node.vbId }}</code>
                            </div>
                            <div class="flex items-center gap-2">
                              <i class="pi pi-globe"></i>
                              <span>{{ node.rpcEndpoint }}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          @click.stop="deleteNode(node.id)"
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          rounded
                          size="small"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>

              <TabPanel value="1">
                <div class="space-y-4">
                  <!-- Applications Header -->
                  <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Applications ({{ organization.applications.length }})</h3>
                  </div>

                  <!-- Applications Content -->
                  <div v-if="organization.applications.length === 0" class="text-center py-8">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <i class="pi pi-box text-2xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-sm">No applications configured yet</p>
                  </div>
                  <div v-else class="space-y-3">
                    <div
                      v-for="app in organization.applications"
                      :key="app.id"
                      class="border border-gray-200 rounded-lg p-4"
                    >
                      <div class="font-medium text-gray-900">{{ app.name }}</div>
                      <div v-if="app.vbId" class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <i class="pi pi-tag"></i>
                        <code class="bg-gray-100 px-2 py-0.5 rounded">{{ app.vbId }}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </template>
      </Card>

      <!-- Add Node Dialog -->
      <Dialog v-model:visible="showManualImportForm" header="Add Node" modal class="w-full max-w-2xl">
        <div class="space-y-4">
          <div>
            <label for="manual-node-name" class="block text-sm font-medium text-gray-700 mb-2">
              Name <span class="text-red-500">*</span>
            </label>
            <InputText id="manual-node-name" v-model="manualNodeName" placeholder="Node name" class="w-full" />
          </div>
          <div>
            <label for="manual-node-vbid" class="block text-sm font-medium text-gray-700 mb-2">
              Virtual Blockchain ID <span class="text-gray-400">(optional)</span>
            </label>
            <InputText id="manual-node-vbid" v-model="manualNodeVbId" placeholder="VB ID" class="w-full" />
          </div>
          <div>
            <label for="manual-node-rpc" class="block text-sm font-medium text-gray-700 mb-2">
              RPC Endpoint <span class="text-red-500">*</span>
            </label>
            <InputText id="manual-node-rpc" v-model="manualNodeRpcEndpoint" placeholder="https://..." class="w-full" />
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Cancel" @click="showManualImportForm = false" severity="secondary" outlined />
            <Button label="Add Node" @click="submitManualNodeImport" icon="pi pi-check" />
          </div>
        </template>
      </Dialog>

      <!-- Import Nodes Dialog -->
      <Dialog v-model:visible="showImportDialog" header="Import Nodes from Chain" modal class="w-full max-w-2xl">
        <p class="text-gray-600 mb-4">The following nodes were detected and can be imported:</p>
        <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <div v-for="node in nodesToImport" :key="node" class="py-2 border-b border-gray-200 last:border-0">
            <code class="text-sm">{{ node }}</code>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Cancel" @click="showImportDialog = false" severity="secondary" outlined />
            <Button label="Import All" @click="importNewNodes" icon="pi pi-check" />
          </div>
        </template>
      </Dialog>
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Organization Not Found</h1>
      <p class="text-gray-500 mb-6">The organization you're looking for doesn't exist.</p>
      <Button @click="goBack" label="Back to Wallet" icon="pi pi-arrow-left" />
    </div>
  </div>
</template>
