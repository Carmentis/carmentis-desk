<script setup lang="ts">
import {computed, onMounted, ref, shallowRef, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Breadcrumb from 'primevue/breadcrumb';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import {useConfirm} from 'primevue/useconfirm';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import {
    AccountCrypto,
    ApplicationLedgerVb,
    Hash,
    ProviderFactory,
    SeedEncoder,
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
import {useStorageStore, AppLedgerParticipation} from '../stores/storage.ts';
import VirtualBlockchainRecordNavigator from './walletRequest/VirtualBlockchainRecordNavigator.vue';
import ExportProofButton from './ExportProofButton.vue';
import {useToast} from 'primevue/usetoast';
import {computedAsync} from "@vueuse/core";

const route = useRoute();
const router = useRouter();
const store = useStorageStore();
const toast = useToast();
const confirm = useConfirm();

const walletId = computed(() => Number(route.params.walletId));
const appParticipationId = computed(() => route.params.appId as string);

const wallet = computed(() => store.organizations.find((w) => w.id === walletId.value));
const participation = computed(() =>
    (wallet.value?.participations ?? []).find((p) => p.id === appParticipationId.value),
);
const accountCrypto = computed<AccountCrypto | null>(() => {
    if (!wallet.value) return null;
    return WalletCrypto.fromSeed(new SeedEncoder().decode(wallet.value.seed)).getDefaultAccountCrypto();
});

// app description — single load, non-blocking
interface AppDescription {
    name: string;
    logoUrl: string;
    homepageUrl: string;
    description: string;
}

const appDescription = ref<AppDescription | null>(null);
const isLoadingDescription = ref(true);

// selected ledger + lazy-loaded VB
const selectedIdx = ref<number | null>(null);
const selectedVb = shallowRef<ApplicationLedgerVb | null>(null);
const isLoadingVb = ref(false);
const vbError = ref<string | null>(null);
const activeTab = ref('overview');
const firstAndLastMicroblockAnchoringDate = computedAsync(async () => {
    if (selectedVb.value) {
        const vb = selectedVb.value;
        const [firstMb, lastMb] = await Promise.all([
            vb.getFirstMicroBlock(),
            vb.getLastMicroblock()
        ]);
        return { firstAnchoringDate: firstMb.getTimestampAsDate(), lastAnchoringDate: lastMb.getTimestampAsDate() }
    } else {
        return null
    }
})

async function selectLedger(idx: number) {
    if (selectedIdx.value === idx) return;
    selectedIdx.value = idx;
    selectedVb.value = null;
    vbError.value = null;
    activeTab.value = 'overview';

    const ledger = participation.value?.appLedgers[idx];
    if (!ledger || !wallet.value) return;

    isLoadingVb.value = true;
    try {
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
        selectedVb.value = await provider.loadApplicationLedgerVirtualBlockchain(Hash.fromHex(ledger.id));
    } catch (e) {
        vbError.value = e instanceof Error ? e.message : String(e);
    } finally {
        isLoadingVb.value = false;
    }
}

onMounted(async () => {
    if (!wallet.value || !participation.value) return;
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    try {
        const appVb = await provider.loadApplicationVirtualBlockchain(Hash.fromHex(participation.value.id));
        appDescription.value = (await appVb.getApplicationDescription()) as AppDescription;
    } catch (e) {
        console.warn('Could not load app description', e);
    } finally {
        isLoadingDescription.value = false;
    }

    // auto-select first if only one ledger
    if (participation.value.appLedgers.length === 1) {
        selectLedger(0);
    }
});

async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    toast.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Copied to clipboard',
        life: 2000,
    });
}

function shortId(id: string) {
    return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-8)}` : id;
}

// Reversed ledger list (most recent first) with original index preserved
const reversedLedgers = computed(() =>
    [...(participation.value?.appLedgers ?? [])]
        .map((ledger, originalIdx) => ({...ledger, originalIdx}))
        .reverse(),
);

// Row selection for DataTable
const selectedRow = computed(() =>
    selectedIdx.value !== null
        ? reversedLedgers.value.find((r) => r.originalIdx === selectedIdx.value) ?? null
        : null,
);

function onRowSelect(event: { data: { originalIdx: number } }) {
    selectLedger(event.data.originalIdx);
}

function confirmDeleteLedger(vbId: string) {
    confirm.require({
        message: 'Are you sure you want to remove this ledger record? This action cannot be undone.',
        header: 'Delete Ledger Record',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {label: 'Cancel', severity: 'secondary', outlined: true},
        acceptProps: {label: 'Delete', severity: 'danger', icon: 'pi pi-trash'},
        accept: async () => {
            await store.deleteAppLedger(walletId.value, appParticipationId.value, vbId);
            selectedIdx.value = null;
            selectedVb.value = null;
            // navigate back if no ledgers remain
            if (!participation.value || participation.value.appLedgers.length === 0) {
                router.push(`/wallet/${walletId.value}`);
            }
        },
    });
}
</script>

<template>
    <div class="space-y-6">
        <!-- App header -->
        <Card>
            <template #content>
                <!-- Loading state -->
                <div v-if="isLoadingDescription" class="flex items-center gap-4">
                    <Skeleton shape="circle" size="3.5rem"/>
                    <div class="flex-1">
                        <Skeleton height="1.5rem" width="35%" class="mb-2"/>
                        <Skeleton height="1rem" width="55%"/>
                    </div>
                </div>

                <!-- Loaded state -->
                <div v-else class="flex flex-col gap-3">
                    <!-- Top row: logo + name + actions -->
                    <div class="flex items-center justify-between gap-4">
                        <!-- Left: logo + name + tag -->
                        <div class="flex items-center gap-3 min-w-0">
                            <img
                                v-if="appDescription?.logoUrl"
                                :src="appDescription.logoUrl"
                                :alt="appDescription.name"
                                class="w-8 h-8 rounded-lg object-contain border border-surface-200 flex-shrink-0"
                            />
                            <div
                                v-else
                                class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0"
                                aria-hidden="true"
                            >
                                <i class="pi pi-box text-primary-400 text-sm"></i>
                            </div>
                            <h1 class="text-xl font-semibold text-surface-900 truncate">
                                {{ appDescription?.name ?? 'Unknown Application' }}
                            </h1>
                            <Tag
                                :value="`${participation?.appLedgers.length ?? 0} ledger${(participation?.appLedgers.length ?? 0) !== 1 ? 's' : ''}`"
                                severity="secondary"
                                class="flex-shrink-0"
                            />
                        </div>

                        <!-- Right: action buttons -->
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <Button
                                v-if="appDescription?.homepageUrl"
                                icon="pi pi-external-link"
                                label="Website"
                                size="small"
                                outlined
                                as="a"
                                :href="appDescription.homepageUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open application homepage"
                            />
                            <Button
                                icon="pi pi-copy"
                                label="Copy ID"
                                size="small"
                                outlined
                                @click="copyToClipboard(appParticipationId)"
                                v-tooltip="appParticipationId"
                                aria-label="Copy Application ID"
                            />
                        </div>
                    </div>

                    <!-- Description -->
                    <Textarea
                        v-if="appDescription?.description"
                        :value="appDescription.description"
                        readonly
                        auto-resize
                        rows="2"
                        class="w-full text-sm text-surface-700 resize-none"
                        aria-label="Application description"
                    />
                </div>
            </template>
        </Card>

        <!-- No data -->
        <div v-if="!participation" class="text-center py-12">
            <i class="pi pi-exclamation-triangle text-3xl text-amber-500 mb-3"></i>
            <p class="text-surface-600">No participation data found for this application.</p>
            <Button label="Back" icon="pi pi-arrow-left" class="mt-4" @click="router.push(`/wallet/${walletId}`)"/>
        </div>

        <!-- Main layout: list + detail -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <!-- Ledger list (left) -->
            <div class="flex flex-col gap-2">
                <div class="px-1 mb-1">
                    <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">App Ledgers</p>
                    <p class="text-xs text-surface-400 mt-0.5">
                        All ledger instances associated with this application where you have participated.
                    </p>
                </div>
                <DataTable
                    :value="reversedLedgers"
                    selectionMode="single"
                    :selection="selectedRow"
                    dataKey="id"
                    size="small"
                    class="text-sm cursor-pointer"
                    @row-select="onRowSelect"
                    :pt="{ table: { class: 'w-full' } }"
                >
                    <Column header="Ledger ID">
                        <template #body="{ data }">
                            <span class="font-mono text-xs text-surface-700">{{ shortId(data.id) }}</span>
                        </template>
                    </Column>
                    <Column header="Operator">
                        <template #body="{ data }">
                            <span v-if="data.operatorEndpoint"
                                  class="text-xs text-surface-500 truncate block max-w-[12rem]">
                                {{ data.operatorEndpoint }}
                            </span>
                            <span v-else class="text-xs text-surface-300">—</span>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Detail panel (right, 2 cols) -->
            <div class="lg:col-span-2 flex flex-col gap-2">
                <div class="px-1 mb-1">
                    <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">App Ledger Details</p>
                    <p class="text-xs text-surface-400 mt-0.5">
                        Inspect the full details and transaction history of the selected ledger.
                    </p>
                </div>
                <!-- Nothing selected -->
                <div
                    v-if="selectedIdx === null"
                    class="flex flex-col items-center justify-center py-16 text-surface-400"
                >
                    <i class="pi pi-hand-pointer text-4xl mb-3"></i>
                    <p class="text-sm">Select a ledger on the left to explore its records</p>
                </div>

                <!-- Selected ledger detail -->
                <Card v-else>
                    <template #header>
                        <div class="flex items-center justify-between gap-3 px-4 pt-4 pb-0">
                            <!-- VB ID -->
                            <div class="flex items-center gap-2 min-w-0">
                                <i class="pi pi-box text-primary-400 text-sm flex-shrink-0"></i>
                                <span class="text-xs font-mono text-surface-700 truncate">
                                    {{ participation.appLedgers[selectedIdx].id }}
                                </span>
                                <Button
                                    icon="pi pi-copy"
                                    size="small"
                                    text
                                    rounded
                                    @click="copyToClipboard(participation.appLedgers[selectedIdx].id)"
                                    v-tooltip="'Copy VB ID'"
                                />
                            </div>
                            <!-- Action buttons -->
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <Button
                                    icon="pi pi-external-link"
                                    label="Explorer"
                                    size="small"
                                    outlined
                                    as="a"
                                    :href="`https://explorer.testnet.carmentis.io/vb/${participation.appLedgers[selectedIdx].id}`"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    v-tooltip="'Open in Carmentis Explorer'"
                                />
                                <Button
                                    icon="pi pi-trash"
                                    size="small"
                                    severity="danger"
                                    outlined
                                    @click="confirmDeleteLedger(participation.appLedgers[selectedIdx].id)"
                                    v-tooltip="'Remove this ledger record'"
                                />
                            </div>
                        </div>
                    </template>
                    <template #content>
                        <Tabs v-model:value="activeTab">
                            <TabList>
                                <Tab value="overview">VB Overview</Tab>
                                <Tab value="history">VB History</Tab>
                            </TabList>
                            <TabPanels>
                                <!-- VB Overview -->
                                <TabPanel value="overview">
                                    <div class="flex flex-col gap-3 pt-1">
                                        <!-- First and last mb anchoring date -->
                                        <div v-if="firstAndLastMicroblockAnchoringDate">
                                            <ul>
                                                <li> First microblock published at {{firstAndLastMicroblockAnchoringDate.firstAnchoringDate.toLocaleString()}}</li>
                                                <li> Last microblock published at {{firstAndLastMicroblockAnchoringDate.lastAnchoringDate.toLocaleString()}}</li>
                                            </ul>
                                        </div>

                                        <!-- Virtual Blockchain ID -->
                                        <div class="border border-surface-200 rounded-lg p-3">
                                            <div class="flex items-center justify-between mb-1.5">
                                                <div class="flex items-center gap-1.5">
                                                    <i class="pi pi-box text-primary-400 text-xs"></i>
                                                    <span
                                                        class="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                                                        Virtual Blockchain ID
                                                    </span>
                                                </div>
                                                <Button
                                                    icon="pi pi-copy"
                                                    size="small"
                                                    text
                                                    rounded
                                                    class="-mt-0.5 -mr-1"
                                                    @click="copyToClipboard(participation.appLedgers[selectedIdx].id)"
                                                    v-tooltip="'Copy VB ID'"
                                                />
                                            </div>
                                            <p class="text-sm font-mono text-surface-800 break-all leading-relaxed">
                                                {{ participation.appLedgers[selectedIdx].id }}
                                            </p>
                                        </div>



                                        <!-- Operator URL -->
                                        <div
                                            v-if="participation.appLedgers[selectedIdx].operatorEndpoint"
                                            class="border border-surface-200 rounded-lg p-3"
                                        >
                                            <div class="flex items-center gap-1.5 mb-1.5">
                                                <i class="pi pi-server text-primary-400 text-xs"></i>
                                                <span
                                                    class="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                                                    Operator URL
                                                </span>
                                            </div>
                                            <p class="text-sm text-surface-800 break-all">
                                                {{ participation.appLedgers[selectedIdx].operatorEndpoint }}
                                            </p>
                                        </div>

                                        <!-- Validated microblock -->
                                        <div
                                            v-if="participation.appLedgers[selectedIdx].b64EncodedMicroblock"
                                            class="border border-surface-200 rounded-lg p-3"
                                        >
                                            <div class="flex items-center justify-between mb-1.5">
                                                <div class="flex items-center gap-1.5">
                                                    <i class="pi pi-check-circle text-green-400 text-xs"></i>
                                                    <span
                                                        class="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                                                        Validated Microblock
                                                    </span>
                                                </div>
                                                <Button
                                                    icon="pi pi-copy"
                                                    size="small"
                                                    text
                                                    rounded
                                                    class="-mt-0.5 -mr-1"
                                                    @click="copyToClipboard(participation.appLedgers[selectedIdx].b64EncodedMicroblock)"
                                                    v-tooltip="'Copy full microblock'"
                                                />
                                            </div>
                                            <p class="text-sm font-mono text-surface-800 truncate">
                                                {{
                                                    participation.appLedgers[selectedIdx].b64EncodedMicroblock.slice(0, 48)
                                                }}…
                                            </p>
                                        </div>

                                        <!-- Export proof -->
                                        <div class="flex gap-2 pt-1">
                                            <ExportProofButton
                                                v-if="accountCrypto"
                                                :vb="selectedVb"
                                                :account-crypto="accountCrypto"
                                                :ledger-id="participation.appLedgers[selectedIdx].id"
                                                :author="wallet?.name ?? ''"
                                            />
                                        </div>
                                    </div>
                                </TabPanel>

                                <!-- VB History -->
                                <TabPanel value="history">
                                    <div class="pt-1">
                                        <div v-if="isLoadingVb" class="flex flex-col gap-2">
                                            <Skeleton height="2.5rem"/>
                                            <Skeleton height="10rem"/>
                                        </div>
                                        <div v-else-if="vbError" class="flex items-start gap-2 text-red-700">
                                            <i class="pi pi-times-circle mt-0.5 flex-shrink-0"></i>
                                            <span class="text-xs font-mono break-all">{{ vbError }}</span>
                                        </div>
                                        <div
                                            v-else-if="!selectedVb"
                                            class="flex flex-col items-center justify-center py-10 text-surface-400"
                                        >
                                            <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
                                            <p class="text-sm">Loading virtual blockchain…</p>
                                        </div>
                                        <VirtualBlockchainRecordNavigator
                                            v-else-if="accountCrypto"
                                            :application-ledger="(selectedVb as any)"
                                            :account-crypto="(accountCrypto as any)"
                                        />
                                    </div>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>
