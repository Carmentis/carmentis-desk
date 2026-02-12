<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import SplitButton from 'primevue/splitbutton';
import {useStorageStore, OrganizationEntity} from '../stores/storage';
import {useOnChainStore} from '../stores/onchain';
import {computedAsync} from "@vueuse/core";
import {
  CryptoEncoderFactory,
  SeedEncoder,
  SignatureSchemeId,
  WalletCrypto,
  CMTSToken
} from "@cmts-dev/carmentis-sdk/client";
import Password from 'primevue/password';
import {useToast} from 'primevue/usetoast';
import {
  useAccountBreakdownQuery,
  useAccountIdQuery,
  useAccountStateQuery,
  useAccountTransactionsHistory
} from "../composables/useAccountBreakdown.ts";
import WalletDetailTransactionsHistory from "./WalletDetailTransactionsHistory.vue";
import {useWalletStore} from "../stores/walletStore.ts";
import Message from 'primevue/message'
const toast = useToast();
const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
const onChainStore = useOnChainStore();

const goBack = () => {
  router.push('/');
};

const deleteWallet = async () => {
  await storageStore.removeOrganizationById(walletId.value);
  await router.push('/');
};

const walletId = computed(() => Number(route.params.walletId));
const wallet = computed(() =>
  storageStore.organizations.find(w => w.id === walletId.value)
);

// wallet key pair
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
const sk = computed(() => walletKeyPair.value?.sk)
const pk = computed(() => walletKeyPair.value?.pk)

// wallet account publication status

// transfer dialog
const walletStore = useWalletStore();
const isCreatingNewAccount = ref<boolean | undefined>(undefined);
const showTransferDialog = ref(false);
const transferPublicKey = ref('');
const transferAmount = ref('');
watch(transferPublicKey, async () => {
  try {
     // attempt to parse the public key
    const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    const pk = await encoder.decodePublicKey(transferPublicKey.value);
    isCreatingNewAccount.value = !await walletStore.isAccountFoundByPublicKey(walletId.value, pk);
  } catch (e) {
    isCreatingNewAccount.value = undefined;
  }
});

function openTransferDialog() {
  transferPublicKey.value = '';
  transferAmount.value = '';
  showTransferDialog.value = true;
}

async function submitTransferDialog() {
  if (!transferPublicKey.value) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Public key is required', life: 3000 });
    return;
  }
  if (!transferAmount.value || Number(transferAmount.value) <= 0) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Valid amount is required', life: 3000 });
    return;
  }

  try {
    const amount = CMTSToken.createCMTS(Number(transferAmount.value));
    await onChainStore.transferTokens({
      walletId: walletId.value,
      recipientPublicKey: transferPublicKey.value,
      amount: amount
    });
    showTransferDialog.value = false;
    refetchBreakdown();
  } catch (e) {
    console.error('Transfer failed:', e);
  }
}

// organization management
const showOrgDialog = ref(false);
const orgDialogMode = ref<'create' | 'import'>('create');
const orgName = ref('');
const orgVbId = ref('');

function openCreateOrgDialog() {
  orgDialogMode.value = 'create';
  orgName.value = '';
  orgVbId.value = '';
  showOrgDialog.value = true;
}

function openImportOrgDialog() {
  orgDialogMode.value = 'import';
  orgName.value = '';
  orgVbId.value = '';
  showOrgDialog.value = true;
}

async function submitOrgDialog() {
  if (orgDialogMode.value === 'create') {
    if (!orgName.value) {
      toast.add({ severity: 'error', summary: 'Validation error', detail: 'Organization name is required', life: 3000 });
      return;
    }
    const newOrg: Omit<OrganizationEntity, 'id'> = {
      name: orgName.value,
      nodes: [],
      applications: [],
      city: "",
      countryCode: "",
      website: "",
    };
    await storageStore.addOrganizationToWallet(walletId.value, newOrg);
    toast.add({ severity: 'success', summary: 'Organization created', detail: `Organization "${orgName.value}" created successfully`, life: 3000 });
  } else {
    if (!orgVbId.value) {
      toast.add({ severity: 'error', summary: 'Validation error', detail: 'VB ID is required for import', life: 3000 });
      return;
    }
    if (!orgName.value) {
      toast.add({ severity: 'error', summary: 'Validation error', detail: 'Organization name is required for import', life: 3000 });
      return;
    }
    const newOrg: Omit<OrganizationEntity, 'id'> = {
      name: orgName.value,
      vbId: orgVbId.value,
      nodes: [],
      applications: []
    };
    await storageStore.addOrganizationToWallet(walletId.value, newOrg);
    toast.add({ severity: 'success', summary: 'Organization imported', detail: 'Organization imported successfully', life: 3000 });
  }
  showOrgDialog.value = false;
}

function visitOrganization(orgId: number) {
  router.push(`/wallet/${walletId.value}/organization/${orgId}`);
}

// Copy menu items
const copyMenuItems = ref([
  {
    label: 'Copy Public Key',
    icon: 'pi pi-copy',
    command: () => copyToClipboard(pk.value, 'Public key')
  },
  {
    label: 'Copy Private Key',
    icon: 'pi pi-copy',
    command: () => copyToClipboard(sk.value, 'Private key')
  },
  {
    label: 'Copy Seed',
    icon: 'pi pi-copy',
    command: () => copyToClipboard(wallet.value?.seed, 'Seed')
  }
]);

async function copyToClipboard(text: string | undefined, label: string) {
  if (!text) {
    toast.add({ severity: 'error', summary: 'Copy failed', detail: `${label} not available`, life: 3000 });
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ severity: 'success', summary: 'Copied', detail: `${label} copied to clipboard`, life: 3000 });
  } catch (e) {
    console.error('Failed to copy:', e);
    toast.add({ severity: 'error', summary: 'Copy failed', detail: 'Failed to copy to clipboard', life: 3000 });
  }
}


const accountIdQuery = useAccountIdQuery(walletId.value);
const accountStateQuery = useAccountStateQuery(walletId.value);
const breakdownQuery = useAccountBreakdownQuery(walletId.value);
const { accountHistoryQuery } = useAccountTransactionsHistory(walletId.value);

async function refetchWallet() {
  await accountStateQuery.refetch();
  await breakdownQuery.refetch();
  await accountHistoryQuery.refetch();
}

function refetchBreakdown() {
  breakdownQuery.refetch();
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="wallet">
      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <i class="pi pi-wallet text-5xl"></i>
            {{ wallet.name }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">Wallet ID: {{ wallet.id }}</p>
        </div>
        <div class="flex gap-2">
          <Button @click="goBack" label="Back" icon="pi pi-arrow-left" text />
          <Button @click="refetchWallet" label="Refresh" icon="pi pi-refresh" outlined />
          <Button @click="deleteWallet" label="Delete" icon="pi pi-trash" severity="danger" outlined />
        </div>
      </div>

      <div class="space-y-4">
        <!-- Wallet Keys and Balance Cards Side-by-Side -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Wallet Keys Card -->
          <Card>
            <template #title>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="pi pi-key text-xl"></i>
                  <span>Wallet Keys</span>
                </div>
                <SplitButton
                  label="Copy"
                  icon="pi pi-copy"
                  :model="copyMenuItems"
                  size="small"
                  @click="copyToClipboard(walletKeyPair?.pk, 'Public key')"
                />
              </div>
            </template>
            <template #content>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
                  <InputText v-model="pk" :disabled="true" class="w-full" />
                </div>
                <div class="w-full">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Private Key</label>
                  <Password v-model="sk" :feedback="false" toggleMask class="w-full" width="100%" />
                </div>
                <div class="w-full">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Private seed</label>
                  <Password v-model="wallet.seed" :feedback="false" toggleMask class="w-full" width="100%" />
                </div>
              </div>
            </template>
          </Card>

          <!-- No account found on chain Card -->
          <Card v-if="breakdownQuery.error.value || accountIdQuery.error.value">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl"></i>
                <span>Balance</span>
              </div>
            </template>
            <template #content>
              <div class="text-center py-12">
                <i class="pi pi-exclamation-circle text-3xl text-amber-500 mb-2"></i>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">No account found</h1>
                <p class="text-gray-600 text-sm">
                  Purchase tokens to see your balance.
                </p>
              </div>
            </template>
          </Card>

          <!-- Balance Card Loading -->
          <Card v-else-if="accountIdQuery.isLoading.value || breakdownQuery.isLoading.value">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl"></i>
                <span>Balance</span>
              </div>
            </template>
            <template #content>
              <div class="grid grid-cols-1 gap-4">
                <div class="bg-gray-50 rounded-lg p-4 animate-pulse">
                  <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div class="h-8 bg-gray-200 rounded w-24"></div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 animate-pulse">
                  <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div class="h-8 bg-gray-200 rounded w-24"></div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 animate-pulse">
                  <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div class="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Balance Card -->
          <Card v-else-if="breakdownQuery.data.value">
            <template #title>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="pi pi-wallet text-xl"></i>
                  <span>Balance</span>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="breakdownQuery.dataUpdatedAt.value" class="text-xs text-gray-500">
                    {{ new Date(breakdownQuery.dataUpdatedAt.value).toLocaleString() }}
                  </span>
                  <Button @click="openTransferDialog" label="Transfer" icon="pi pi-send" size="small" />
                </div>
              </div>
            </template>
            <template #content>
              <div class="grid grid-cols-1 gap-4">
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-sm text-gray-600 font-medium mb-1">Spendable</div>
                  <div class="text-2xl font-bold text-gray-900">{{ breakdownQuery.data.value.getSpendable() }}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-sm text-gray-600 font-medium mb-1">Vested</div>
                  <div class="text-2xl font-bold text-gray-900">{{ breakdownQuery.data.value.getVested() }}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-sm text-gray-600 font-medium mb-1">Staked</div>
                  <div class="text-2xl font-bold text-gray-900">{{ breakdownQuery.data.value.getStaked() }}</div>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Organizations Card -->
        <Card>
          <template #title>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi pi-building text-xl"></i>
                <span>Organizations ({{ wallet.organizations.length }})</span>
              </div>
              <div class="flex gap-2">
                <Button @click="openCreateOrgDialog" label="Create Org" icon="pi pi-plus" size="small" />
                <Button @click="openImportOrgDialog" label="Import Org" icon="pi pi-download" size="small" outlined />
              </div>
            </div>
          </template>
          <template #content>
            <div v-if="wallet.organizations.length === 0" class="text-center py-8">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <i class="pi pi-building text-2xl text-gray-400"></i>
              </div>
              <p class="text-gray-500 text-sm mb-4">No organizations yet</p>
              <div class="flex gap-2 justify-center">
                <Button @click="openCreateOrgDialog" label="Create Organization" icon="pi pi-plus" size="small" />
                <Button @click="openImportOrgDialog" label="Import Organization" icon="pi pi-download" size="small" outlined />
              </div>
            </div>
            <div v-else class="space-y-3">
              <div
                  v-for="org in wallet.organizations"
                  :key="org.id"
                  class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  @click="visitOrganization(org.id)"
              >
                <div class="flex items-start justify-between">
                  <div class="space-y-2 flex-1">
                    <div class="flex items-center gap-3">
                      <div class="font-medium text-gray-900">{{ org.name }}</div>
                      <div v-if="org.vbId" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        <i class="pi pi-tag"></i> {{ org.vbId }}
                      </div>
                    </div>
                    <div class="text-sm text-gray-600 space-y-1">
                      <div class="flex items-center gap-4">
                      <span class="flex items-center gap-1">
                        <i class="pi pi-sitemap text-gray-400"></i>
                        {{ org.nodes.length }} node(s)
                      </span>
                        <span class="flex items-center gap-1">
                        <i class="pi pi-box text-gray-400"></i>
                        {{ org.applications.length }} app(s)
                      </span>
                      </div>
                    </div>
                  </div>
                  <i class="pi pi-chevron-right text-gray-400"></i>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <WalletDetailTransactionsHistory/>

      </div>
      <!-- Transfer Dialog -->
      <Dialog v-model:visible="showTransferDialog" header="Transfer Tokens" modal class="w-full max-w-md">
        <div class="space-y-4">
          <div v-if="isCreatingNewAccount === true">
            <Message>You are creating a new account</Message>
          </div>
          <div v-if="isCreatingNewAccount === false">
            <Message>The account has been found online.</Message>
          </div>
          <div>
            <label for="transfer-public-key" class="block text-sm font-medium text-gray-700 mb-2">
              Recipient Public Key <span class="text-red-500">*</span>
            </label>
            <InputText id="transfer-public-key" v-model="transferPublicKey" placeholder="Enter recipient public key" class="w-full" />
          </div>
          <div>
            <label for="transfer-amount" class="block text-sm font-medium text-gray-700 mb-2">
              Amount <span class="text-red-500">*</span>
            </label>
            <InputText id="transfer-amount" v-model="transferAmount" type="number" placeholder="Enter amount" class="w-full" />
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Cancel" @click="showTransferDialog = false" severity="secondary" outlined />
            <Button label="Transfer" @click="submitTransferDialog" icon="pi pi-send" />
          </div>
        </template>
      </Dialog>

      <!-- Organization Dialog -->
      <Dialog v-model:visible="showOrgDialog" :header="orgDialogMode === 'create' ? 'Create Organization' : 'Import Organization'" modal class="w-full max-w-md">
        <div class="space-y-4">
          <div>
            <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
              Organization Name <span class="text-red-500">*</span>
            </label>
            <InputText id="org-name" v-model="orgName" placeholder="Enter organization name" class="w-full" />
          </div>
          <div v-if="orgDialogMode === 'import'">
            <label for="org-vbid" class="block text-sm font-medium text-gray-700 mb-2">
              Virtual Blockchain ID <span class="text-red-500">*</span>
            </label>
            <InputText id="org-vbid" v-model="orgVbId" placeholder="Enter VB ID" class="w-full" />
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Cancel" @click="showOrgDialog = false" severity="secondary" outlined />
            <Button :label="orgDialogMode === 'create' ? 'Create' : 'Import'" @click="submitOrgDialog" icon="pi pi-check" />
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
