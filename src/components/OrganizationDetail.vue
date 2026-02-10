<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import {NodeEntity, useStorageStore} from '../stores/storage';
import {computedAsync} from "@vueuse/core";
import {
  BalanceAvailability,
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
import Password from 'primevue/password';
import InputText from 'primevue/inputtext';
import {useToast} from 'primevue/usetoast';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();


const goBack = () => {
  router.push('/');
};

const deleteOrganization = async () => {
  await storageStore.removeOrganizationById(organizationId.value);
  await router.push('/');
};



const organizationId = computed(() => Number(route.params.id));
const organization = computed(() =>
  storageStore.organizations.find(org => org.id === organizationId.value)
);


// organization key pair
const organizationKeyPair = computedAsync(async () => {
  if (!organization.value) return undefined;
  const seedEncoder = new SeedEncoder();
  const walletSeed = WalletCrypto.fromSeed(seedEncoder.decode(organization.value.seed));
  const accountCrypto = walletSeed.getDefaultAccountCrypto();
  const sk = await accountCrypto.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);
  const pk = await sk.getPublicKey();
  const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
  return {sk: await sigEncoder.encodePrivateKey(sk), pk: await sigEncoder.encodePublicKey(pk)}
})
const sk = computed(() => organizationKeyPair.value?.sk)
const pk = computed(() => organizationKeyPair.value?.pk)


// organization account publication status
const lastFetchTime = ref(Date.now());
function refetch() {
  lastFetchTime.value = Date.now();
}


const organizationAccountId = computedAsync(async () => {
  if (organization.value === undefined) return undefined;
  if (!pk.value) return undefined;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(organization.value.nodeEndpoint);
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
const organizationAccountPublicationStatus = computedAsync(async () => {
  const accountId = await organizationAccountId.value;
  if (accountId === undefined) return undefined;
  if (Utils.binaryIsEqual(accountId, Utils.getNullHash())) return false;
  return true;
});
const organizationAccountPublicationMessage = computed(() => {
  if (organizationAccountPublicationStatus.value === undefined) return "Loading...";
  const message = Utils.binaryIsEqual(organizationAccountId.value, Utils.getNullHash()) ? 'Account not found online' : 'Account found online';
  return `${message} (Last fetch: ${new Date(lastFetchTime.value).toLocaleString()})`;
});


// organization balance
const organizationAccountState = computedAsync(async () => {
  if (organization.value === undefined) return undefined;
  if (!pk.value) return undefined;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(organization.value.nodeEndpoint);
  if (organizationAccountId.value === undefined) return undefined;
  const accountId = await organizationAccountId.value;
  const accountState = await provider.getAccountState(accountId);
  return accountState;
})
const organizationBreakdown = computedAsync(async () => {
  if (!organizationAccountState.value) return undefined;
  const breakdown = BalanceAvailability.createFromAccountStateAbciResponse(organizationAccountState.value);
  return breakdown;
});


// organization virtual blockchain id
const storedVbId = computed(() => organization.value?.vbId);
const providedVbId = ref("");
async function importOrganizationByVbId() {
  if (!providedVbId.value) return;
  if (!organization.value) return;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(organization.value.nodeEndpoint);
  try {
    const orgVb = await provider.loadOrganizationVirtualBlockchain(Hash.from(providedVbId.value));
    await storageStore.addVbIdToOrganization(organizationId.value, Hash.from(orgVb.getId()).encode())
    toast.add({ severity: 'success', summary: 'Organization imported', detail: 'Organization imported successfully', life: 3000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error importing organization', detail: 'Error importing organization', life: 3000 });
  } finally {
    providedVbId.value = "";
  }
}

// organization nodes
const organizationNodes = computed(() => organization.value?.nodes || []);

async function deleteNode(nodeId: number) {
  await storageStore.deleteNodeById(organizationId.value, nodeId);
  toast.add({ severity: 'success', summary: 'Node deleted', detail: 'Node deleted successfully', life: 3000 });
}

// manual node import form
const showManualImportForm = ref(false);
const manualNodeName = ref('');
const manualNodeVbId = ref('');
const manualNodeRpcEndpoint = ref('');

async function submitManualNodeImport() {
  if (!manualNodeName.value || !manualNodeRpcEndpoint.value) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Name and RPC endpoint are required', life: 3000 });
    return;
  }

  const newNode: NodeEntity = {
    name: manualNodeName.value,
    rpcEndpoint: manualNodeRpcEndpoint.value,
  };

  if (manualNodeVbId.value) {
    newNode.vbId = manualNodeVbId.value;
  }

  await storageStore.importExistingNodes(organizationId.value, [newNode]);

  // Reset form
  manualNodeName.value = '';
  manualNodeVbId.value = '';
  manualNodeRpcEndpoint.value = '';
  showManualImportForm.value = false;

  toast.add({ severity: 'success', summary: 'Node imported', detail: 'Node imported successfully', life: 3000 });
}

// organization nodes to claim
const showImportDialog = ref(false);
const nodesToImport = ref<string[]>([]);

async function fetchNodesOnChain() {
  const accountState = organizationAccountState.value;
  if (!accountState) {
    toast.add({ severity: 'info', summary: 'No nodes', detail: 'No node to import', life: 3000 });
    return;
  }

  const locks = accountState.locks;
  const stakingLocks = locks.filter(lock => lock.type === LockType.NodeStaking);
  const nodesIds = stakingLocks.map(sl => Hash.from(sl.parameters.validatorNodeAccountId as Uint8Array));
  const newNodesIds = [];
  for (const nodeId of nodesIds) {
    const isAlreadyDeclared = await storageStore.isNodeDeclared(organizationId.value, nodeId.encode());
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
  if (!organization.value) return;

  // load new nodes
  const newNodes: NodeEntity[] = [];
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(organization.value.nodeEndpoint);
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
  await storageStore.importExistingNodes(organizationId.value, newNodes);
  showImportDialog.value = false;
  toast.add({ severity: 'success', summary: 'Nodes imported', detail: `${newNodes.length} node(s) imported successfully`, life: 3000 });
}


</script>

<template>
  <div class="space-y-6">
    <div v-if="organization">
      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ organization.name }}</h1>
          <p class="text-sm text-gray-500 mt-1">Wallet ID: {{ organization.id }}</p>
        </div>
        <div class="flex gap-2">
          <Button @click="goBack" label="Back" icon="pi pi-arrow-left" text />
          <Button @click="refetch" label="Refresh" icon="pi pi-refresh" outlined />
          <Button @click="deleteOrganization" label="Delete" icon="pi pi-trash" severity="danger" outlined />
        </div>
      </div>

      <!-- Account Status Banner -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center gap-2">
          <i class="pi pi-info-circle text-blue-600"></i>
          <span class="text-sm text-blue-900">{{ organizationAccountPublicationMessage }}</span>
        </div>
      </div>

      <!-- Wallet Keys Card -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-key text-xl"></i>
            <span>Wallet Keys</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Private Key</label>
              <Password v-model="sk" :feedback="false" toggleMask class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
              <InputText v-model="pk" :disabled="true" class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Node Endpoint</label>
              <div class="flex items-center gap-2 text-gray-600">
                <i class="pi pi-server"></i>
                <span class="text-sm">{{ organization.nodeEndpoint }}</span>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Balance Card -->
      <Card v-if="organizationAccountPublicationStatus && organizationBreakdown">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-wallet text-xl"></i>
            <span>Balance</span>
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-50 rounded-lg p-4">
              <div class="text-sm text-green-600 font-medium mb-1">Spendable</div>
              <div class="text-2xl font-bold text-green-900">{{ organizationBreakdown.getSpendable() }}</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="text-sm text-blue-600 font-medium mb-1">Vested</div>
              <div class="text-2xl font-bold text-blue-900">{{ organizationBreakdown.getVested() }}</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-4">
              <div class="text-sm text-purple-600 font-medium mb-1">Staked</div>
              <div class="text-2xl font-bold text-purple-900">{{ organizationBreakdown.getStaked() }}</div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Organization Card -->
      <Card v-if="organizationAccountPublicationStatus">
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-building text-xl"></i>
              <span>Organization</span>
            </div>
          </div>
        </template>
        <template #content>
          <div v-if="storedVbId" class="space-y-3">
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium text-gray-700">Organization ID:</span>
              <code class="bg-gray-100 px-2 py-1 rounded text-xs">{{ Hash.from(storedVbId).encode() }}</code>
            </div>
          </div>
          <div v-else class="space-y-4">
            <p class="text-sm text-gray-600">Link this wallet to an organization by providing the virtual blockchain ID.</p>
            <div class="flex gap-2">
              <InputText v-model="providedVbId" placeholder="Enter organization VB ID" class="flex-1" />
              <Button @click="importOrganizationByVbId" label="Link" icon="pi pi-link" />
            </div>
          </div>
        </template>
      </Card>

      <!-- Nodes Card -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-sitemap text-xl"></i>
              <span>Nodes ({{ organizationNodes.length }})</span>
            </div>
            <div class="flex gap-2">
              <Button @click="fetchNodesOnChain" label="Fetch On-Chain" icon="pi pi-cloud-download" size="small" outlined />
              <Button @click="showManualImportForm = true" label="Add Node" icon="pi pi-plus" size="small" />
            </div>
          </div>
        </template>
        <template #content>
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
              @click="router.push(`/wallet/${organizationId}/node/${node.id}`)"
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
        </template>
      </Card>

      <!-- Dialogs -->
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

      <Dialog v-model:visible="showManualImportForm" header="Add Node Manually" modal class="w-full max-w-2xl">
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
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Wallet Not Found</h1>
      <p class="text-gray-500 mb-6">The wallet you're looking for doesn't exist.</p>
      <Button @click="goBack" label="Back to Home" icon="pi pi-home" />
    </div>
  </div>
</template>
