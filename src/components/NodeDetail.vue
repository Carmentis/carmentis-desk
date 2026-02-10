<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useToast} from 'primevue/usetoast';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Breadcrumb from 'primevue/breadcrumb';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import {useStorageStore} from '../stores/storage';
import {computedAsync} from "@vueuse/core";
import {
  CMTSToken, EncoderFactory,
  Hash,
  LockType,
  ProviderFactory,
  SeedEncoder,
  SignatureSchemeId, Utils,
  WalletCrypto,
} from "@cmts-dev/carmentis-sdk/client";
import {Tendermint37Client} from "@cosmjs/tendermint-rpc";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const storageStore = useStorageStore();
await storageStore.initStorage();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

const wallet = computed(() =>
  storageStore.organizations.find(w => w.id === walletId.value)
);

const organization = computed(() =>
  wallet.value?.organizations.find(org => org.id === orgId.value)
);

const node = computed(() =>
  organization.value?.nodes.find(n => n.id === nodeId.value)
);

const goBack = () => {
  router.push(`/wallet/${walletId.value}/organization/${orgId.value}`);
};

// Breadcrumb
const breadcrumbHome = ref({
  icon: 'pi pi-home',
  command: () => router.push('/')
});

const breadcrumbItems = computed(() => {
  if (!wallet.value || !organization.value || !node.value) return [];
  return [
    {
      label: wallet.value.name,
      command: () => router.push(`/wallet/${walletId.value}`)
    },
    {
      label: organization.value.name,
      command: () => router.push(`/wallet/${walletId.value}/organization/${orgId.value}`)
    },
    {
      label: node.value.name
    }
  ];
});

// Node publication status
const nodePublicKey = computedAsync(async () => {
  if (!node.value) return undefined;
  const endpoint = node.value.rpcEndpoint;
  const client = await Tendermint37Client.connect(endpoint);
  const status = await client.status();
  const pk = status.validatorInfo.pubkey;
  if (!pk) return undefined;
  const { data, algorithm } = pk;
  const base64 = EncoderFactory.bytesToBase64Encoder();
  return { pk: base64.encode(data), pkType: algorithm };
})



const nodeVbId = computedAsync(async () => {
  console.log("Node:", node.value, wallet.value, nodePublicKey.value)
  if (!node.value) return undefined;
  if (!wallet.value) return undefined;
  if (!nodePublicKey.value) return undefined;

  console.log("Node id:", node.value.vbId)
  console.log("node pk:", nodePublicKey.value.pk)
  if (node.value.vbId) {
    return Hash.from(node.value.vbId);
  } else {
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    const vbId = await provider.getValidatorNodeIdByCometbftPublicKey(nodePublicKey.value.pk);
    return Hash.from(vbId);
  }
});

const isNodePublished = computed(() => {
  return nodeVbId.value !== undefined;
});

// Check if node is claimed and by whom
const nodeOwnerAccountId = computedAsync(async () => {
  if (!nodeVbId.value) return undefined;
  if (!wallet.value) return undefined;
  if (!node.value?.vbId) return undefined;

  try {
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    const nodeVb = await provider.loadValidatorNodeVirtualBlockchain(Hash.from(node.value.vbId));
    const orgId = await nodeVb.getOrganizationId();
    return orgId;
  } catch (e) {
    console.error('Error loading node owner:', e);
    return undefined;
  }
});

const nodeOwnerName = computedAsync(async () => {
  if (!nodeOwnerAccountId.value) return undefined;
  if (!wallet.value) return undefined;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
  const orgVb = await provider.loadOrganizationVirtualBlockchain(nodeOwnerAccountId.value);
  const orgDesc = await orgVb.getDescription();
  return orgDesc.name;
})

const isNodeClaimed = computed(() => {
  return nodeOwnerAccountId.value !== undefined;
});

// Check if the wallet owns this node
const walletOrgId = computedAsync(async () => {
  if (!organization.value?.vbId) return undefined;
  return Hash.from(organization.value.vbId);
});

const isOwnedByWallet = computedAsync(async () => {
  if (!nodeOwnerAccountId.value || !walletOrgId.value) return false;
  const ownerHash = await nodeOwnerAccountId.value;
  const walletHash = await walletOrgId.value;
  return ownerHash.encode() === walletHash.encode();
});

// staking information
const nodeStakeInformation = computedAsync(async () => {
  const wallet = await storageStore.getWalletById(walletId.value);
  if (wallet === undefined) return undefined;
  if (node.value === undefined) return undefined;
  if (node.value.vbId === undefined) return undefined;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.nodeEndpoint);
  const seed = new SeedEncoder().decode(wallet.seed);
  const crypto = WalletCrypto.fromSeed(seed);
  const account = crypto.getDefaultAccountCrypto();
  const sk = await account.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);
  const pk = await sk.getPublicKey();
  const accountId = await provider.getAccountIdByPublicKey(pk);
  const accountState = await provider.getAccountState(accountId);
  const nodeVbId = Hash.from(node.value.vbId);
  const stakingForThisNode = accountState.locks.filter(
      lock => lock.type === LockType.NodeStaking && Utils.binaryIsEqual(
          lock.parameters.validatorNodeAccountId,
          nodeVbId.toBytes()
      )
  );
  if (stakingForThisNode.length === 0) return undefined;
  const stake = stakingForThisNode[0]
  if (stake.type !== LockType.NodeStaking) throw new Error(
      `Expected lock type to be NodeStaking, got ${LockType[stake.type]}`
  )
  return stake;
});
const currentStakedAmount = computed(() => {
  if (nodeStakeInformation.value === undefined) return undefined;
  return CMTSToken.createAtomic(nodeStakeInformation.value.lockedAmountInAtomics)
})

const unstakingAmountInProgress = computed(() => {
  if (nodeStakeInformation.value === undefined) return undefined;
  const { plannedUnlockAmountInAtomics } = nodeStakeInformation.value.parameters;
  if (plannedUnlockAmountInAtomics === undefined) return undefined;
  return CMTSToken.createAtomic(plannedUnlockAmountInAtomics)
})

const hasUnstakingOperationInProgress = computed(() =>
    unstakingAmountInProgress.value !== undefined &&
    unstakingAmountInProgress.value.isPositive() &&
    !unstakingAmountInProgress.value.isZero()
)

const unstakingAtTimestamp = computed(() => {
  if (nodeStakeInformation.value === undefined) return undefined;
  const { plannedUnlockTimestamp } = nodeStakeInformation.value.parameters;
  if (plannedUnlockTimestamp === undefined) return undefined;
  return plannedUnlockTimestamp;
})

// Staking Dialog
const showStakeDialog = ref(false);
const stakeAmount = ref<number | null>(null);
const isStaking = ref(false);
const MIN_STAKE = 1_000_000;
const MAX_STAKE = 10_000_000;

const stakeAmountError = computed(() => {
  if (stakeAmount.value === null) return null;
  if (stakeAmount.value < MIN_STAKE) {
    return `Minimum stake amount is ${MIN_STAKE.toLocaleString()} CMTS`;
  }
  if (stakeAmount.value > MAX_STAKE) {
    return `Maximum stake amount is ${MAX_STAKE.toLocaleString()} CMTS`;
  }
  return null;
});

const canStake = computed(() => {
  return stakeAmount.value !== null && stakeAmountError.value === null;
});

const openStakeDialog = () => {
  stakeAmount.value = null;
  showStakeDialog.value = true;
};

const closeStakeDialog = () => {
  showStakeDialog.value = false;
  stakeAmount.value = null;
};

const submitStake = async () => {
  if (!canStake.value || !wallet.value || !node.value?.vbId) return;

  isStaking.value = true;
  try {
    // TODO: Implement staking transaction
    console.log('Staking', stakeAmount.value, 'CMTS for node', node.value.vbId);
    closeStakeDialog();
  } catch (error) {
    console.error('Error staking:', error);
  } finally {
    isStaking.value = false;
  }
};

// Unstaking Dialog
const showUnstakeDialog = ref(false);
const unstakeAmount = ref<number | null>(null);
const isUnstaking = ref(false);

const maxUnstakeAmount = computed(() => {
  if (nodeStakeInformation.value === undefined) return 0;
  return CMTSToken.createAtomic(nodeStakeInformation.value.lockedAmountInAtomics).getAmountAsAtomic();
});

const unstakeAmountError = computed(() => {
  if (unstakeAmount.value === null) return null;
  if (unstakeAmount.value <= 0) {
    return 'Amount must be greater than 0';
  }
  if (unstakeAmount.value > maxUnstakeAmount.value) {
    return `Maximum unstake amount is ${maxUnstakeAmount.value.toLocaleString()} CMTS`;
  }
  return null;
});

const canUnstake = computed(() => {
  return unstakeAmount.value !== null && unstakeAmountError.value === null;
});

const openUnstakeDialog = () => {
  unstakeAmount.value = null;
  showUnstakeDialog.value = true;
};

const closeUnstakeDialog = () => {
  showUnstakeDialog.value = false;
  unstakeAmount.value = null;
};

const submitUnstake = async () => {
  if (!canUnstake.value || !wallet.value || !node.value?.vbId) return;

  isUnstaking.value = true;
  try {
    // TODO: Implement unstaking transaction
    console.log('Unstaking', unstakeAmount.value, 'CMTS from node', node.value.vbId);
    closeUnstakeDialog();
  } catch (error) {
    console.error('Error unstaking:', error);
  } finally {
    isUnstaking.value = false;
  }
};

console.log(unstakingAmountInProgress, unstakingAtTimestamp)

// Watcher for node vb id
/*
watch(nodeVbId, async (newNodeVbId) => {
  console.log("Watching:", newNodeVbId, node.value, node.value?.vbId)
  if (node.value && !node.value.vbId && newNodeVbId) {
    // Update node.value.vbId with the found nodeVbId
    node.value.vbId = newNodeVbId.encode();
    // Store it in storage store
    await storageStore.updateNode(walletId.value, orgId.value, nodeId.value, {
      vbId: newNodeVbId.encode()
    });
    // Show toast notification
    toast.add({
      severity: 'success',
      summary: 'Node Updated',
      detail: 'Node VB ID has been automatically updated',
      life: 3000
    });
  }
}, { immediate: true });

 */

</script>

<template>
  <div class="space-y-6">
    <div v-if="node && wallet && organization">
      <!-- Breadcrumb -->
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="mb-4 bg-transparent"  />

      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ node.name }}</h1>
          <p class="text-sm text-gray-500 mt-1">Node ID: {{ node.id }}</p>
        </div>
        <div class="flex gap-2">
          <Button @click="goBack" label="Back to Organization" icon="pi pi-arrow-left" text />
        </div>
      </div>

      <!-- Node Information and Status Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Node Information Card -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-sitemap text-xl"></i>
              <span>Node Information</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Node Name</label>
                <div class="text-gray-900">{{ node.name }}</div>
              </div>

              <div v-if="node.vbId">
                <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Blockchain ID</label>
                <code class="bg-gray-100 px-3 py-2 rounded text-sm block overflow-x-auto">{{ node.vbId }}</code>
              </div>

              <div v-if="nodePublicKey">
                <label class="block text-sm font-medium text-gray-700 mb-2">Node Public Key</label>
                <div class="flex items-center gap-2 text-gray-600">
                  <i class="pi pi-key"></i>
                  <span class="text-sm">{{ nodePublicKey.pk }} ({{nodePublicKey.pkType}})</span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">RPC Endpoint</label>
                <div class="flex items-center gap-2 text-gray-600">
                  <i class="pi pi-globe"></i>
                  <span class="text-sm">{{ node.rpcEndpoint }}</span>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Node Publication Status Card -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-xl"></i>
              <span>Publication Status</span>
            </div>
          </template>
          <template #content>
            <div v-if="!node.vbId" class="text-center py-8">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <i class="pi pi-question-circle text-2xl text-gray-400"></i>
              </div>
              <p class="text-sm text-gray-500">Node has no Virtual Blockchain ID</p>
            </div>
            <div v-else class="space-y-4">
              <!-- Publication Status -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Publication Status</label>
                <div class="flex items-center gap-2">
                  <div
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="isNodePublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                  >
                    <i class="pi" :class="isNodePublished ? 'pi-check-circle' : 'pi-times-circle'"></i>
                    {{ isNodePublished ? 'Published' : 'Not Published' }}
                  </div>
                </div>
              </div>

              <!-- Claimed Status -->
              <div v-if="isNodePublished">
                <label class="block text-sm font-medium text-gray-700 mb-2">Claim Status</label>
                <div class="flex items-center gap-2">
                  <div
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="isNodeClaimed ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                  >
                    <i class="pi" :class="isNodeClaimed ? 'pi-lock' : 'pi-unlock'"></i>
                    {{ isNodeClaimed ?
                      ( nodeOwnerName ? `Claimed by ${nodeOwnerName}` : 'Claimed' )
                      :
                      'Not Claimed' }}
                  </div>
                </div>
              </div>

              <!-- Owner Information -->
              <div v-if="isNodeClaimed && nodeOwnerAccountId">
                <label class="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                <div class="space-y-2">
                  <code class="bg-gray-100 px-3 py-2 rounded text-xs block overflow-x-auto">
                    {{ nodeOwnerAccountId.encode() }}
                  </code>
                  <div v-if="isOwnedByWallet" class="flex items-center gap-2 text-sm text-green-700">
                    <i class="pi pi-check-circle"></i>
                    <span>Owned by this wallet</span>
                  </div>
                  <div v-else class="flex items-center gap-2 text-sm text-orange-700">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span>Owned by another account</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Node Staking Information Card -->
        <Card v-if="node.vbId">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-wallet text-xl"></i>
              <span>Staking Information</span>
            </div>
          </template>
          <template #content>
            <!-- No Staking State -->
            <div v-if="nodeStakeInformation === undefined" class="text-center py-8">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <i class="pi pi-ban text-2xl text-gray-400"></i>
              </div>
              <p class="text-sm text-gray-500">No staking detected for this node</p>
            </div>

            <!-- Has Staking -->
            <div v-else class="space-y-4">
              <!-- Staked Amount -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Staked Amount</label>
                <div class="flex items-center gap-2">
                  <div class="">
                    <span class="text-lg font-semibold">
                      {{ currentStakedAmount }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Unstaking Operation -->
              <div v-if="hasUnstakingOperationInProgress">
                <label class="block text-sm font-medium text-gray-700 mb-2">Programmed Unstaking</label>
                <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Amount</span>
                    <span class="text-sm font-semibold text-orange-800">
                      {{ unstakingAmountInProgress }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between" v-if="unstakingAtTimestamp">
                    <span class="text-sm text-gray-600">Unlock Date</span>
                    <span class="text-sm font-semibold text-orange-800">
                      {{ new Date(unstakingAtTimestamp * 1000).toLocaleString() }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-orange-700 mt-2">
                    <i class="pi pi-clock"></i>
                    <span>Unstaking operation in progress</span>
                  </div>
                </div>
              </div>

              <!-- No Unstaking Operation -->
              <div v-else>
                <label class="block text-sm font-medium text-gray-700 mb-2">Unstaking Status</label>
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <i class="pi pi-info-circle"></i>
                  <span>No programmed unstaking operation</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-2 pt-2">
                <Button
                  @click="openStakeDialog"
                  label="Stake More"
                  icon="pi pi-plus"
                  size="small"
                  outlined
                />
                <Button
                  @click="openUnstakeDialog"
                  label="Unstake"
                  icon="pi pi-minus"
                  size="small"
                  severity="secondary"
                  outlined
                />
              </div>
            </div>

            <!-- Action Buttons (No Staking) -->
            <div v-if="nodeStakeInformation === undefined" class="mt-4">
              <Button
                @click="openStakeDialog"
                label="Stake Tokens"
                icon="pi pi-wallet"
                class="w-full"
                outlined
              />
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Node Not Found</h1>
      <p class="text-gray-500 mb-6">The node you're looking for doesn't exist.</p>
      <Button @click="router.push('/')" label="Back to Home" icon="pi pi-home" />
    </div>

    <!-- Stake Dialog -->
    <Dialog v-model:visible="showStakeDialog" modal header="Stake Tokens" :style="{ width: '30rem' }">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Amount (CMTS)</label>
          <InputNumber
            v-model="stakeAmount"
            :min="MIN_STAKE"
            :max="MAX_STAKE"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            locale="en-US"
            class="w-full"
            placeholder="Enter amount to stake"
          />
          <small class="text-gray-500 mt-1 block">
            Min: {{ MIN_STAKE.toLocaleString() }} CMTS | Max: {{ MAX_STAKE.toLocaleString() }} CMTS
          </small>
          <small v-if="stakeAmountError" class="text-red-500 mt-1 block">
            {{ stakeAmountError }}
          </small>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" @click="closeStakeDialog" text />
          <Button
            label="Stake"
            @click="submitStake"
            :disabled="!canStake"
            :loading="isStaking"
            icon="pi pi-check"
          />
        </div>
      </template>
    </Dialog>

    <!-- Unstake Dialog -->
    <Dialog v-model:visible="showUnstakeDialog" modal header="Unstake Tokens" :style="{ width: '30rem' }">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Amount (CMTS)</label>
          <InputNumber
            v-model="unstakeAmount"
            :min="0"
            :max="maxUnstakeAmount"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            locale="en-US"
            class="w-full"
            placeholder="Enter amount to unstake"
          />
          <small class="text-gray-500 mt-1 block">
            Max available: {{ maxUnstakeAmount.toLocaleString() }} CMTS
          </small>
          <small v-if="unstakeAmountError" class="text-red-500 mt-1 block">
            {{ unstakeAmountError }}
          </small>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" @click="closeUnstakeDialog" text />
          <Button
            label="Unstake"
            @click="submitUnstake"
            :disabled="!canUnstake"
            :loading="isUnstaking"
            icon="pi pi-check"
            severity="secondary"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
