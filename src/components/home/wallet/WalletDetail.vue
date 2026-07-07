<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import {type ApplicationParticipation, useStorageStore} from '../../../stores/storage';
import {useSessionStore} from '../../../stores/sessionStore.ts';
import {useAsyncState} from '@vueuse/core';
import * as walletRepo from '../../../db/repositories/walletRepository';
import * as orgRepo from '../../../db/repositories/organizationRepository';
import * as participationRepo from '../../../db/repositories/participationRepository';
import {useOnChainStore} from '../../../stores/onchain';

import MenuBar from 'primevue/menubar';
import {useToast} from 'primevue/usetoast';
import {useAccountBreakdownQuery, useAccountStateQuery,} from '../../../composables/useAccountBreakdown.ts';
import WalletDetailAppParticipationCard from './WalletDetailAppParticipationCard.vue';
import {useConfirm} from 'primevue/useconfirm';
import type {MenuItem} from 'primevue/menuitem';
import WalletDetailSync from "./WalletDetailSync.vue";
import {useClipboard} from "../../../composables/useClipboard.ts";
import WalletDetailBalanceCard from "./WalletDetailBalanceCard.vue";
import WalletDetailKeysCard from "./WalletDetailKeysCard.vue";
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import WalletDetailOrganizationsCard from "./WalletDetailOrganizationsCard.vue";
import WalletDetailApplicationLedgerParticipationsCard from "./WalletDetailApplicationLedgerParticipationsCard.vue";
import WalletDetailConnectivity from "./WalletDetailConnectivity.vue";
import WalletDetailVirtualBlockchains from "./WalletDetailVirtualBlockchains.vue";


const toast = useToast();
const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
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

const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);




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

                <Tabs value="-1">
                    <TabList>
                        <Tab value="-1">
                            <i class="pi pi-key mr-2"></i>
                            Overview
                        </Tab>
                        <Tab value="0">
                            <i class="pi pi-building mr-2"></i>
                            Organizations
                        </Tab>
                        <Tab value="1">
                            <i class="pi pi-box mr-2"></i>
                            Application ledgers
                        </Tab>
                        <Tab value="2">
                            <i class="pi pi-server mr-2"></i>
                            Connectivity
                        </Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel value="-1">
                            <div class="flex gap-4">
                                <WalletDetailKeysCard/>
                                <WalletDetailBalanceCard/>
                            </div>
                        </TabPanel>
                        <TabPanel value="0">
                            <WalletDetailOrganizationsCard/>
                        </TabPanel>
                        <TabPanel value="1">
                            <WalletDetailApplicationLedgerParticipationsCard/>
                            <WalletDetailVirtualBlockchains/>
                        </TabPanel>
                        <TabPanel value="2">
                            <WalletDetailConnectivity/>
                        </TabPanel>
                    </TabPanels>
                </Tabs>

            </div>



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
