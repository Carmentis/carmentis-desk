<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
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
  <div style="padding: 2rem;">
    <div v-if="organization">
      <h1 class="font-bold text-2xl">{{ organization.name }}</h1>
      <p><strong>ID:</strong> {{ organization.id }}</p>
      <p><strong>Seed:</strong> {{ organization.seed }}</p>
      <p><strong>Node Endpoint:</strong> {{ organization.nodeEndpoint }}</p>
      <p>{{ organizationAccountPublicationMessage }}</p>
      <Password v-model="sk" :feedback="false" toggleMask />
      <InputText v-model="pk" :disabled="true" />




      <div v-if="organizationAccountPublicationStatus">

        <div v-if="organizationBreakdown">
          <p>Spendable: {{organizationBreakdown.getSpendable()}}</p>
          <p>Vested: {{organizationBreakdown.getVested()}}</p>
          <p>Staked: {{organizationBreakdown.getStaked()}}</p>
        </div>

        <div v-if="storedVbId">
          Organization ID: {{ Hash.from(storedVbId).encode() }}

          Below the linked nodes:
          <div v-for="node of organizationNodes" :key="node.vbId">
            Node {{ node.vbId }}
          </div>

        </div>
        <div v-else>
          You have to provide an organization virtual blockchain id.
          <InputText v-model="providedVbId" />
          <Button @click="importOrganizationByVbId" label="Import your organization" severity="primary" />
        </div>
      </div>


      <div style="display: flex; gap: 1rem; margin-top: 2rem;">
        <Button @click="goBack" label="Back to Home" severity="secondary" />
        <Button @click="refetch" label="Refetch" severity="primary" />
        <Button @click="fetchNodesOnChain" label="Fetch nodes on-chain" severity="primary" />
        <Button @click="showManualImportForm = true" label="Import node manually" severity="primary" />
        <Button @click="deleteOrganization" label="Delete Organization" severity="danger" />
      </div>

      <Dialog v-model:visible="showImportDialog" header="Import Nodes" modal style="width: 50rem;">
        <p>The following nodes were detected and can be imported:</p>
        <ul>
          <li v-for="node in nodesToImport" :key="node">
            {{ node }}
          </li>
        </ul>
        <template #footer>
          <Button label="Cancel" @click="showImportDialog = false" severity="secondary" />
          <Button label="Confirm Import" @click="importNewNodes" severity="primary" />
        </template>
      </Dialog>

      <Dialog v-model:visible="showManualImportForm" header="Import Node Manually" modal style="width: 50rem;">
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label for="manual-node-name" style="display: block; margin-bottom: 0.5rem;">Name *</label>
            <InputText id="manual-node-name" v-model="manualNodeName" style="width: 100%;" />
          </div>
          <div>
            <label for="manual-node-vbid" style="display: block; margin-bottom: 0.5rem;">Virtual Blockchain ID (optional)</label>
            <InputText id="manual-node-vbid" v-model="manualNodeVbId" style="width: 100%;" />
          </div>
          <div>
            <label for="manual-node-rpc" style="display: block; margin-bottom: 0.5rem;">RPC Endpoint *</label>
            <InputText id="manual-node-rpc" v-model="manualNodeRpcEndpoint" style="width: 100%;" />
          </div>
        </div>
        <template #footer>
          <Button label="Cancel" @click="showManualImportForm = false" severity="secondary" />
          <Button label="Import" @click="submitManualNodeImport" severity="primary" />
        </template>
      </Dialog>
    </div>
    <div v-else>
      <h1>Organization not found</h1>
      <Button @click="goBack" label="Back to Home" />
    </div>
  </div>
</template>
