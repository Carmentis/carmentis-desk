<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
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
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
import { useStorageStore, AppLedgerParticipation } from '../stores/storage.ts';
import VirtualBlockchainRecordNavigator from './walletRequest/VirtualBlockchainRecordNavigator.vue';
import ExportProofButton from './ExportProofButton.vue';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const store = useStorageStore();
const toast = useToast();

const walletId = computed(() => Number(route.params.walletId));
const appParticipationId = computed(() => route.params.appId as string);

const wallet = computed(() =>
    store.organizations.find((w) => w.id === walletId.value),
);
const participation = computed(() =>
    (wallet.value?.participations ?? []).find(
        (p) => p.id === appParticipationId.value,
    ),
);
const accountCrypto = computed<AccountCrypto | null>(() => {
    if (!wallet.value) return null;
    return WalletCrypto.fromSeed(
        new SeedEncoder().decode(wallet.value.seed),
    ).getDefaultAccountCrypto();
});

// breadcrumb
const breadcrumbHome = ref({
    icon: 'pi pi-home',
    command: () => router.push('/'),
});
const breadcrumbItems = computed(() => {
    if (!wallet.value) return [];
    return [
        {
            label: wallet.value.name,
            command: () => router.push(`/wallet/${walletId.value}`),
        },
        { label: appDescription.value?.name ?? 'Application Ledger' },
    ];
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

async function selectLedger(idx: number) {
    if (selectedIdx.value === idx) return;
    selectedIdx.value = idx;
    selectedVb.value = null;
    vbError.value = null;

    const ledger = participation.value?.appLedgers[idx];
    if (!ledger || !wallet.value) return;

    isLoadingVb.value = true;
    try {
        const provider =
            ProviderFactory.createInMemoryProviderWithExternalProvider(
                wallet.value.nodeEndpoint,
            );
        selectedVb.value =
            await provider.loadApplicationLedgerVirtualBlockchain(
                Hash.fromHex(ledger.id),
            );
    } catch (e) {
        vbError.value = e instanceof Error ? e.message : String(e);
    } finally {
        isLoadingVb.value = false;
    }
}

onMounted(async () => {
    if (!wallet.value || !participation.value) return;
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(
        wallet.value.nodeEndpoint,
    );
    try {
        const appVb = await provider.loadApplicationVirtualBlockchain(
            Hash.fromHex(participation.value.id),
        );
        appDescription.value =
            (await appVb.getApplicationDescription()) as AppDescription;
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
</script>

<template>
    <div class="space-y-6">
        <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" />

        <!-- App header -->
        <Card>
            <template #content>
                <div class="flex items-start gap-4">
                    <div
                        v-if="isLoadingDescription"
                        class="w-12 h-12 rounded-xl bg-surface-100 animate-pulse flex-shrink-0"
                    ></div>
                    <img
                        v-else-if="appDescription?.logoUrl"
                        :src="appDescription.logoUrl"
                        :alt="appDescription.name"
                        class="w-12 h-12 rounded-xl object-contain border border-surface-100 p-1 flex-shrink-0"
                    />
                    <div
                        v-else
                        class="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"
                    >
                        <i class="pi pi-box text-primary text-xl"></i>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div v-if="isLoadingDescription">
                            <Skeleton
                                height="1.25rem"
                                width="40%"
                                class="mb-2"
                            />
                            <Skeleton height="0.875rem" width="60%" />
                        </div>
                        <div v-else>
                            <div class="flex items-center gap-3 flex-wrap">
                                <h1
                                    class="text-lg font-semibold text-surface-800"
                                >
                                    {{
                                        appDescription?.name ??
                                        'Unknown Application'
                                    }}
                                </h1>
                                <span
                                    class="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-100 text-surface-600"
                                >
                                    {{ participation?.appLedgers.length ?? 0 }}
                                    ledger{{
                                        (participation?.appLedgers.length ??
                                            0) !== 1
                                            ? 's'
                                            : ''
                                    }}
                                </span>
                            </div>
                            <a
                                v-if="appDescription?.homepageUrl"
                                :href="appDescription.homepageUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-sm text-primary hover:underline"
                            >
                                {{ appDescription.homepageUrl }}
                            </a>
                            <p
                                v-if="appDescription?.description"
                                class="text-sm text-surface-600 mt-1"
                            >
                                {{ appDescription.description }}
                            </p>
                        </div>
                        <div class="mt-2 flex items-center gap-1">
                            <span class="text-xs text-surface-400 font-mono">
                                {{ shortId(appParticipationId) }}
                            </span>
                            <Button
                                icon="pi pi-copy"
                                size="small"
                                text
                                rounded
                                @click="copyToClipboard(appParticipationId)"
                                v-tooltip="'Copy Application ID'"
                            />
                        </div>
                    </div>
                </div>
            </template>
        </Card>

        <!-- No data -->
        <div v-if="!participation" class="text-center py-12">
            <i
                class="pi pi-exclamation-triangle text-3xl text-amber-500 mb-3"
            ></i>
            <p class="text-surface-600">
                No participation data found for this application.
            </p>
            <Button
                label="Back"
                icon="pi pi-arrow-left"
                class="mt-4"
                @click="router.push(`/wallet/${walletId}`)"
            />
        </div>

        <!-- Main layout: list + detail -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <!-- Ledger list (left) -->
            <div class="flex flex-col gap-2">
                <p
                    class="text-xs font-semibold text-surface-500 uppercase tracking-wide px-1 mb-1"
                >
                    App Ledgers
                </p>
                <Card
                    v-for="(ledger, idx) in participation.appLedgers"
                    :key="ledger.id"
                    class="rounded-lg cursor-pointer transition-all"
                    :class="
                        selectedIdx === idx
                            ? 'border-primary bg-primary-50 shadow-sm'
                            : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50'
                    "
                    @click="selectLedger(idx)"
                >
                    <template #content>
                        <div class="flex items-center gap-2 mb-2">
                            <div
                                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                :class="'bg-surface-100 text-surface-500'"
                            >
                                {{ idx + 1 }}
                            </div>
                            <span
                                class="text-xs font-mono text-surface-700 truncate"
                            >
                                {{ shortId(ledger.id) }}
                            </span>
                        </div>
                        <div
                            v-if="ledger.operatorEndpoint"
                            class="flex items-center gap-1.5 text-xs text-surface-500 truncate"
                        >
                            <i
                                class="pi pi-server text-surface-300 flex-shrink-0"
                            ></i>
                            <span class="truncate">
                                {{ ledger.operatorEndpoint }}
                            </span>
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Detail panel (right, 2 cols) -->
            <div class="lg:col-span-2">
                <!-- Nothing selected -->
                <div
                    v-if="selectedIdx === null"
                    class="flex flex-col items-center justify-center py-16 text-surface-400"
                >
                    <i class="pi pi-hand-pointer text-4xl mb-3"></i>
                    <p class="text-sm">
                        Select a ledger on the left to explore its records
                    </p>
                </div>

                <!-- Selected ledger detail -->
                <Card v-else>
                    <template #content>
                        <div class="flex flex-col gap-4">
                            <!-- Metadata -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div
                                    class="bg-surface-50 rounded-lg p-3 col-span-1 sm:col-span-2"
                                >
                                    <div
                                        class="flex items-center justify-between mb-1"
                                    >
                                        <p class="text-xs text-surface-400">
                                            Virtual Blockchain ID
                                        </p>
                                        <Button
                                            icon="pi pi-copy"
                                            size="small"
                                            text
                                            rounded
                                            class="-mt-0.5 -mr-1"
                                            @click="
                                                copyToClipboard(
                                                    participation.appLedgers[
                                                        selectedIdx
                                                    ].id,
                                                )
                                            "
                                            v-tooltip="'Copy VB ID'"
                                        />
                                    </div>
                                    <p
                                        class="text-xs font-mono text-surface-700 break-all"
                                    >
                                        {{
                                            participation.appLedgers[
                                                selectedIdx
                                            ].id
                                        }}
                                    </p>
                                </div>

                                <div
                                    v-if="
                                        participation.appLedgers[selectedIdx]
                                            .operatorEndpoint
                                    "
                                    class="bg-surface-50 rounded-lg p-3"
                                >
                                    <p class="text-xs text-surface-400 mb-1">
                                        Operator
                                    </p>
                                    <p
                                        class="text-xs font-mono text-surface-700 truncate"
                                    >
                                        {{
                                            participation.appLedgers[
                                                selectedIdx
                                            ].operatorEndpoint
                                        }}
                                    </p>
                                </div>

                                <div
                                    v-if="
                                        participation.appLedgers[selectedIdx]
                                            .b64EncodedMicroblock
                                    "
                                    class="bg-surface-50 rounded-lg p-3"
                                >
                                    <div
                                        class="flex items-center justify-between mb-1"
                                    >
                                        <p class="text-xs text-surface-400">
                                            Validated microblock
                                        </p>
                                        <Button
                                            icon="pi pi-copy"
                                            size="small"
                                            text
                                            rounded
                                            class="-mt-0.5 -mr-1"
                                            @click="
                                                copyToClipboard(
                                                    participation.appLedgers[
                                                        selectedIdx
                                                    ].b64EncodedMicroblock,
                                                )
                                            "
                                            v-tooltip="'Copy full microblock'"
                                        />
                                    </div>
                                    <p
                                        class="text-xs font-mono text-surface-600 truncate"
                                    >
                                        {{
                                            participation.appLedgers[
                                                selectedIdx
                                            ].b64EncodedMicroblock.slice(0, 48)
                                        }}…
                                    </p>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex gap-2">
                                <ExportProofButton
                                    v-if="accountCrypto"
                                    :vb="selectedVb"
                                    :account-crypto="accountCrypto"
                                    :ledger-id="
                                        participation.appLedgers[selectedIdx].id
                                    "
                                    :author="wallet?.name ?? ''"
                                />
                            </div>

                            <Divider class="my-0" />

                            <!-- Record navigator -->
                            <div>
                                <p
                                    class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3"
                                >
                                    History
                                </p>
                                <div
                                    v-if="isLoadingVb"
                                    class="flex flex-col gap-2"
                                >
                                    <Skeleton height="2.5rem" />
                                    <Skeleton height="10rem" />
                                </div>
                                <div
                                    v-else-if="vbError"
                                    class="flex items-start gap-2 text-red-700"
                                >
                                    <i
                                        class="pi pi-times-circle mt-0.5 flex-shrink-0"
                                    ></i>
                                    <span class="text-xs font-mono break-all">
                                        {{ vbError }}
                                    </span>
                                </div>
                                <VirtualBlockchainRecordNavigator
                                    v-else-if="selectedVb && accountCrypto"
                                    :application-ledger="selectedVb"
                                    :account-crypto="accountCrypto"
                                />
                            </div>
                        </div>
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>
