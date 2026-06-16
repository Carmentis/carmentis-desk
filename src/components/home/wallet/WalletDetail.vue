<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import SplitButton from 'primevue/splitbutton';
import { useStorageStore, type OrganizationEntity as OrgEntity, type ApplicationParticipation } from '../../../stores/storage';
import { useSessionStore } from '../../../stores/sessionStore.ts';
import {useAsyncState, computedAsync} from '@vueuse/core';
import * as walletRepo from '../../../db/repositories/walletRepository';
import * as orgRepo from '../../../db/repositories/organizationRepository';
import * as participationRepo from '../../../db/repositories/participationRepository';
import { useOnChainStore } from '../../../stores/onchain';

import MenuBar from 'primevue/menubar';
import {
    CryptoEncoderFactory,
    SeedEncoder,
    SignatureSchemeId,
    WalletCrypto,
    CMTSToken, Utils, EncoderFactory,
} from '@cmts-dev/carmentis-sdk-core';
import Password from 'primevue/password';
import { useToast } from 'primevue/usetoast';
import {
    useAccountBreakdownQuery,
    useAccountIdQuery,
    useAccountStateQuery,
    useAccountTransactionsHistory,
} from '../../../composables/useAccountBreakdown.ts';
import WalletDetailTransactionsHistoryDialog from './components/transactionsHistory/WalletDetailTransactionsHistoryDialog.vue';
import WalletDetailAppParticipationCard from './WalletDetailAppParticipationCard.vue';
import { useWalletStore } from '../../../stores/walletStore.ts';
import Message from 'primevue/message';
import { useConfirm } from 'primevue/useconfirm';
import type { MenuItem } from 'primevue/menuitem';
import {createIndexerClient} from "../../../api/indexer/client.ts";
import {getAppControllerGetOrganizationsUrl} from "../../../api/indexer/indexer.ts";
import WalletDetailSync from "./WalletDetailSync.vue";
import {useClipboard} from "../../../composables/useClipboard.ts";
import WalletDetailBalanceCard from "./WalletDetailBalanceCard.vue";
import WalletDetailKeysCard from "./WalletDetailKeysCard.vue";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
const onChainStore = useOnChainStore();
const sessionStore = useSessionStore();
const clipboard = useClipboard();
const confirm = useConfirm();

const goBack = () => {
    router.push('/');
};

const deleteWallet = () => {
    confirm.require({
        message: `Are you sure you want to delete the wallet "${wallet.value?.name}"? This action will delete all associated organizations, nodes, and applications and cannot be undone.`,
        header: 'Delete Wallet',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancel',
        acceptLabel: 'Delete',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await storageStore.removeOrganizationById(walletId.value);
            toast.add({
                severity: 'success',
                summary: 'Wallet deleted',
                detail: 'Wallet deleted successfully',
                life: 3000,
            });
            await router.push('/');
        },
    });
};

const walletId = computed(() => Number(route.params.walletId));

const { state: wallet, execute: fetchWallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const { state: organizations, execute: fetchOrgs } = useAsyncState(
    () => orgRepo.getOrganizationsByWalletId(walletId.value),
    [],
    { immediate: true },
);

const { state: participations, execute: fetchParticipations } = useAsyncState(
    () => participationRepo.getAppParticipationsByWalletId(walletId.value),
    [] as ApplicationParticipation[],
    { immediate: true },
);

// wallet key pair
const walletKeyPair = computedAsync(async () => {
    if (!wallet.value) return undefined;
    const seedEncoder = new SeedEncoder();
    const rawSeed = await sessionStore.getWalletSeed(wallet.value.id);
    const walletSeed = WalletCrypto.fromSeed(seedEncoder.decode(rawSeed));
    const accountCrypto = walletSeed.getDefaultAccountCrypto();
    const sk = await accountCrypto.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);
    const pk = await sk.getPublicKey();
    const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    return {
        sk: await sigEncoder.encodePrivateKey(sk),
        pk: await sigEncoder.encodePublicKey(pk),
    };
});
const sk = computed(() => walletKeyPair.value?.sk);
const pk = computed(() => walletKeyPair.value?.pk);

const walletSeed = computedAsync(async () => {
    if (!wallet.value) return '';
    return sessionStore.getWalletSeed(wallet.value.id);
}, '');

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
        isCreatingNewAccount.value = !(await walletStore.isAccountFoundByPublicKey(walletId.value, pk));
    } catch (e) {
        isCreatingNewAccount.value = undefined;
    }
});

function openTransferDialog() {
    transferPublicKey.value = '';
    transferAmount.value = '';
    showTransferDialog.value = true;
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
            toast.add({
                severity: 'error',
                summary: 'Validation error',
                detail: 'Organization name is required',
                life: 3000,
            });
            return;
        }
        await orgRepo.insertOrganization(walletId.value, {
            name: orgName.value,
            city: '',
            countryCode: '',
            website: '',
        });
        await fetchOrgs();
        toast.add({
            severity: 'success',
            summary: 'Organization created',
            detail: `Organization "${orgName.value}" created successfully`,
            life: 3000,
        });
    } else {
        if (!orgVbId.value) {
            toast.add({
                severity: 'error',
                summary: 'Validation error',
                detail: 'VB ID is required for import',
                life: 3000,
            });
            return;
        }
        if (!orgName.value) {
            toast.add({
                severity: 'error',
                summary: 'Validation error',
                detail: 'Organization name is required for import',
                life: 3000,
            });
            return;
        }
        await orgRepo.insertOrganization(walletId.value, {
            name: orgName.value,
            vbId: orgVbId.value,
        });
        await fetchOrgs();
        toast.add({
            severity: 'success',
            summary: 'Organization imported',
            detail: 'Organization imported successfully',
            life: 3000,
        });
    }
    showOrgDialog.value = false;
}

function visitOrganization(orgId: number) {
    router.push(`/wallet/${walletId.value}/organization/${orgId}`);
}



const accountStateQuery = useAccountStateQuery(walletId.value);
const breakdownQuery = useAccountBreakdownQuery(walletId.value);

watch(walletId, () => {
    accountStateQuery.refetch()
    breakdownQuery.refetch()
})


const menuItems = computed<MenuItem[]>(() => [
    {
        label: 'Credentials',
        icon: 'pi pi-id-card',
        command: () => router.push(`/wallet/${walletId.value}/credentials`),
    },
    {
        label: 'Transfer',
        icon: 'pi pi-send',
        command: openTransferDialog,
    },
    {
        label: 'Delete Wallet',
        icon: 'pi pi-trash',
        command: deleteWallet,
    },
]);
</script>

<template>
    <div>
        <div v-if="wallet">
            <div class="space-y-4">
                <!-- Actions Bar -->
                <MenuBar :model="menuItems"></MenuBar>
                <WalletDetailSync/>

                <!-- Wallet Keys and Balance Cards Side-by-Side -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <WalletDetailKeysCard/>
                    <WalletDetailBalanceCard/>
                </div>

                <!-- Organizations Card -->
                <Card>
                    <template #title>
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <i class="pi pi-building text-xl"></i>
                                <span>Organizations ({{ organizations.length }})</span>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <Button
                                    @click="openCreateOrgDialog"
                                    label="Create Org"
                                    icon="pi pi-plus"
                                    size="small"
                                />
                                <Button
                                    @click="openImportOrgDialog"
                                    label="Import Org"
                                    icon="pi pi-download"
                                    size="small"
                                    outlined
                                />
                            </div>
                        </div>
                    </template>
                    <template #subtitle>
                        <p class="text-sm text-surface-500">
                            Legal entities registered on the Carmentis network. Each organization can run validator
                            nodes and deploy applications.
                        </p>
                    </template>
                    <template #content>
                        <div v-if="organizations.length === 0" class="text-center py-8">
                            <div
                                class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3"
                            >
                                <i class="pi pi-building text-2xl text-gray-400"></i>
                            </div>
                            <p class="text-gray-500 text-sm mb-4">No organizations yet</p>
                            <div class="flex gap-2 justify-center">
                                <Button
                                    @click="openCreateOrgDialog"
                                    label="Create Organization"
                                    icon="pi pi-plus"
                                    size="small"
                                />
                                <Button
                                    @click="openImportOrgDialog"
                                    label="Import Organization"
                                    icon="pi pi-download"
                                    size="small"
                                    outlined
                                />
                            </div>
                        </div>
                        <div v-else class="space-y-3">
                            <div
                                v-for="org in organizations"
                                :key="org.id"
                                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                @click="visitOrganization(org.id)"
                            >
                                <div class="flex items-start justify-between">
                                    <div class="space-y-2 flex-1">
                                        <div class="flex items-center gap-3">
                                            <div class="font-medium text-gray-900">
                                                {{ org.name }}
                                            </div>
                                            <div
                                                v-if="org.vbId"
                                                class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                                            >
                                                <i class="pi pi-tag"></i>
                                                {{ org.vbId }}
                                            </div>
                                        </div>
                                        <div class="text-sm text-gray-600 space-y-1">
                                            <div class="flex items-center gap-4">
                                            </div>
                                        </div>
                                    </div>
                                    <i class="pi pi-chevron-right text-gray-400"></i>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- Application Participations -->
                <Card v-if="participations.length > 0">
                    <template #title>
                        <div class="flex items-center gap-2">
                            <i class="pi pi-box text-xl"></i>
                            <span>Application Ledgers ({{ participations.length }})</span>
                        </div>
                    </template>
                    <template #subtitle>
                        <p class="text-sm text-surface-500">
                            Applications this wallet has interacted with through the anchoring protocol. Click on a card
                            to explore the associated virtual blockchain records.
                        </p>
                    </template>
                    <template #content>
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <WalletDetailAppParticipationCard
                                v-for="participation in participations"
                                :key="participation.id"
                                :participation="participation"
                                :node-endpoint="wallet!.nodeEndpoint"
                                :wallet-id="walletId"
                            />
                        </div>
                    </template>
                </Card>


            </div>


            <!-- Organization Dialog -->
            <Dialog
                v-model:visible="showOrgDialog"
                :header="orgDialogMode === 'create' ? 'Create Organization' : 'Import Organization'"
                modal
                class="w-full max-w-md"
            >
                <div class="space-y-4">
                    <div>
                        <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
                            Organization Name
                            <span class="text-red-500">*</span>
                        </label>
                        <InputText
                            id="org-name"
                            v-model="orgName"
                            placeholder="Enter organization name"
                            class="w-full"
                        />
                    </div>
                    <div v-if="orgDialogMode === 'import'">
                        <label for="org-vbid" class="block text-sm font-medium text-gray-700 mb-2">
                            Virtual Blockchain ID
                            <span class="text-red-500">*</span>
                        </label>
                        <InputText id="org-vbid" v-model="orgVbId" placeholder="Enter VB ID" class="w-full" />
                    </div>
                </div>
                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button label="Cancel" @click="showOrgDialog = false" severity="secondary" outlined />
                        <Button
                            :label="orgDialogMode === 'create' ? 'Create' : 'Import'"
                            @click="submitOrgDialog"
                            icon="pi pi-check"
                        />
                    </div>
                </template>
            </Dialog>
        </div>

        <!-- Not Found State -->
        <div v-else class="text-center py-12 px-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Wallet Not Found</h1>
            <p class="text-gray-500 mb-6">The wallet you're looking for doesn't exist.</p>
            <Button @click="goBack" label="Back to Home" icon="pi pi-home" />
        </div>
    </div>
</template>
