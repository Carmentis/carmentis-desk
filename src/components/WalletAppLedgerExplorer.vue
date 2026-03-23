<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Breadcrumb from 'primevue/breadcrumb';
import Skeleton from 'primevue/skeleton';
import Divider from 'primevue/divider';
import {
  AccountCrypto,
  ApplicationLedgerVb,
  Hash,
  ProviderFactory,
  SeedEncoder,
  WalletCrypto
} from '@cmts-dev/carmentis-sdk/client';
import { useStorageStore, AppLedgerParticipation } from '../stores/storage.ts';
import VirtualBlockchainRecordNavigator from './walletRequest/VirtualBlockchainRecordNavigator.vue';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const store = useStorageStore();
const toast = useToast();

const walletId = computed(() => Number(route.params.walletId));
const appParticipationId = computed(() => route.params.appId as string);

const wallet = computed(() => store.organizations.find(w => w.id === walletId.value));
const participation = computed(() =>
  (wallet.value?.participations ?? []).find(p => p.id === appParticipationId.value)
);
const accountCrypto = computed<AccountCrypto | null>(() => {
  if (!wallet.value) return null;
  return WalletCrypto.fromSeed(new SeedEncoder().decode(wallet.value.seed)).getDefaultAccountCrypto();
});

// breadcrumb
const breadcrumbHome = ref({ icon: 'pi pi-home', command: () => router.push('/') });
const breadcrumbItems = computed(() => {
  if (!wallet.value) return [];
  return [
    { label: wallet.value.name, command: () => router.push(`/wallet/${walletId.value}`) },
    { label: appDescription.value?.name ?? 'Application Ledger' }
  ];
});

// app description loaded from blockchain
interface AppDescription { name: string; logoUrl: string; homepageUrl: string; description: string; }
const appDescription = ref<AppDescription | null>(null);
const isLoadingDescription = ref(true);

// per-ledger loaded VBs
interface LoadedLedger {
  meta: AppLedgerParticipation;
  vb: ApplicationLedgerVb | null;
  error: string | null;
  loading: boolean;
}
const loadedLedgers = ref<LoadedLedger[]>([]);

onMounted(async () => {
  if (!wallet.value || !participation.value) return;
  const nodeEndpoint = wallet.value.nodeEndpoint;
  const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(nodeEndpoint);

  // load app description
  try {
    const appVb = await provider.loadApplicationVirtualBlockchain(Hash.fromHex(participation.value.id));
    appDescription.value = await appVb.getApplicationDescription() as AppDescription;
  } catch (e) {
    console.warn('Could not load app description', e);
  } finally {
    isLoadingDescription.value = false;
  }

  // init ledger slots
  loadedLedgers.value = participation.value.appLedgers.map(meta => ({
    meta,
    vb: null,
    error: null,
    loading: true,
  }));

  // load each app ledger VB
  for (let i = 0; i < loadedLedgers.value.length; i++) {
    const slot = loadedLedgers.value[i];
    try {
      slot.vb = await provider.loadApplicationLedgerVirtualBlockchain(Hash.fromHex(slot.meta.id));
    } catch (e) {
      slot.error = e instanceof Error ? e.message : String(e);
    } finally {
      slot.loading = false;
    }
  }
});

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.add({ severity: 'success', summary: 'Copied', detail: 'Copied to clipboard', life: 2000 });
}
</script>

<template>
  <div class="space-y-6">
    <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" />

    <!-- App header card -->
    <Card>
      <template #content>
        <div class="flex items-start gap-4">
          <div v-if="isLoadingDescription" class="w-14 h-14 rounded-xl bg-surface-100 animate-pulse flex-shrink-0"></div>
          <img
            v-else-if="appDescription?.logoUrl"
            :src="appDescription.logoUrl"
            :alt="appDescription.name"
            class="w-14 h-14 rounded-xl object-contain border border-surface-100 p-1 flex-shrink-0"
          />
          <div v-else class="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-box text-primary text-2xl"></i>
          </div>

          <div class="flex-1 min-w-0">
            <div v-if="isLoadingDescription">
              <Skeleton height="1.25rem" width="40%" class="mb-2" />
              <Skeleton height="0.875rem" width="60%" />
            </div>
            <div v-else>
              <h1 class="text-lg font-semibold text-surface-800">
                {{ appDescription?.name ?? 'Unknown Application' }}
              </h1>
              <a
                v-if="appDescription?.homepageUrl"
                :href="appDescription.homepageUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-primary hover:underline"
              >{{ appDescription.homepageUrl }}</a>
              <p v-if="appDescription?.description" class="text-sm text-surface-600 mt-2">
                {{ appDescription.description }}
              </p>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <span class="text-xs text-surface-400 font-mono break-all">{{ appParticipationId }}</span>
              <Button icon="pi pi-copy" size="small" text rounded @click="copyToClipboard(appParticipationId)" v-tooltip="'Copy App ID'" />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- No participation found -->
    <div v-if="!participation" class="text-center py-12">
      <i class="pi pi-exclamation-triangle text-3xl text-amber-500 mb-3"></i>
      <p class="text-surface-600">No participation data found for this application.</p>
      <Button label="Back" icon="pi pi-arrow-left" class="mt-4" @click="router.push(`/wallet/${walletId}`)" />
    </div>

    <!-- Ledger sections -->
    <template v-else>
      <div
        v-for="(slot, idx) in loadedLedgers"
        :key="slot.meta.id"
        class="space-y-0"
      >
        <Card>
          <template #content>
            <div class="flex flex-col gap-4">

              <!-- Ledger header -->
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">
                    App Ledger {{ loadedLedgers.length > 1 ? idx + 1 : '' }}
                  </p>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono text-surface-700 break-all">{{ slot.meta.id }}</span>
                    <Button icon="pi pi-copy" size="small" text rounded @click="copyToClipboard(slot.meta.id)" v-tooltip="'Copy VB ID'" />
                  </div>
                </div>
              </div>

              <!-- Metadata row -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-if="slot.meta.operatorEndpoint" class="bg-surface-50 rounded-lg p-3">
                  <p class="text-xs text-surface-400 mb-1">Operator</p>
                  <p class="text-xs font-mono text-surface-700 truncate">{{ slot.meta.operatorEndpoint }}</p>
                </div>
                <div v-if="slot.meta.b64EncodedMicroblock" class="bg-surface-50 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-xs text-surface-400">Validated microblock</p>
                    <Button
                      icon="pi pi-copy"
                      size="small"
                      text
                      rounded
                      class="-mt-1 -mr-1"
                      @click="copyToClipboard(slot.meta.b64EncodedMicroblock)"
                      v-tooltip="'Copy full microblock'"
                    />
                  </div>
                  <p class="text-xs font-mono text-surface-600 truncate">
                    {{ slot.meta.b64EncodedMicroblock.slice(0, 48) }}…
                  </p>
                </div>
              </div>

              <Divider class="my-0" />

              <!-- Record navigator or loading/error -->
              <div>
                <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">History</p>
                <div v-if="slot.loading" class="flex flex-col gap-2">
                  <Skeleton height="2rem" />
                  <Skeleton height="8rem" />
                </div>
                <div v-else-if="slot.error" class="flex items-start gap-2 text-red-700 text-sm">
                  <i class="pi pi-times-circle mt-0.5 flex-shrink-0"></i>
                  <span class="font-mono text-xs break-all">{{ slot.error }}</span>
                </div>
                <VirtualBlockchainRecordNavigator
                  v-else-if="slot.vb && accountCrypto"
                  :application-ledger="slot.vb"
                  :account-crypto="accountCrypto"
                />
              </div>

            </div>
          </template>
        </Card>
      </div>
    </template>
  </div>
</template>
