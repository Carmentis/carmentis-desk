<script setup lang="ts">
import {computed, ref} from "vue";
import {computedAsync, useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";
import * as orgRepo from "../../../db/repositories/organizationRepository.ts";
import * as appRepo from "../../../db/repositories/applicationRepository.ts";
import * as nodeRepo from "../../../db/repositories/nodeRepository.ts";
import {Utils} from "@cmts-dev/carmentis-sdk-core";
import {createIndexerClient} from "../../../api/indexer/client.ts";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import {useStorageStore} from "../../../stores/storage.ts";
import {useOnChainStore} from "../../../stores/onchain.ts";
import {useSessionStore} from "../../../stores/sessionStore.ts";
import { useWalletStore } from '../../../stores/walletStore.ts';
import {useConfirm} from "primevue/useconfirm";
import Message from "primevue/message";
import Card from "primevue/card";
import Button from "primevue/button";
import {ApplicationDto, OrganizationDto, ValidatorNodeDto} from "../../../api/indexer/model";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
const onChainStore = useOnChainStore();
const sessionStore = useSessionStore();
const walletStore = useWalletStore();
const confirm = useConfirm();
const walletId = computed(() => Number(route.params.walletId));

interface WalletSyncOrganizationState {
    org: OrganizationDto,
    apps: ApplicationDto[],
    nodes: ValidatorNodeDto[],
}

const { state: wallet, execute: fetchWallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const refreshCount = ref(0);

const knownOrgIdsInWallet = computedAsync(async () => {
    refreshCount.value;
    const orgs = await orgRepo.getOrganizationsByWalletId(walletId.value);
    return new Set(orgs.map(o => o.vbId).filter((v): v is string => !!v));
}, new Set<string>());

const knownAppIdsInWallet = computedAsync(async () => {
    refreshCount.value;
    const orgs = await orgRepo.getOrganizationsByWalletId(walletId.value);
    const ids = new Set<string>();
    for (const org of orgs) {
        const apps = await appRepo.getApplicationsByOrgId(org.id);
        apps.forEach(a => { if (a.vbId) ids.add(a.vbId); });
    }
    return ids;
}, new Set<string>());

const knownNodeIdsInWallet = computedAsync(async () => {
    refreshCount.value;
    const orgs = await orgRepo.getOrganizationsByWalletId(walletId.value);
    const ids = new Set<string>();
    for (const org of orgs) {
        const nodes = await nodeRepo.getNodesByOrgId(org.id);
        nodes.forEach(n => { if (n.vbId) ids.add(n.vbId); });
    }
    return ids;
}, new Set<string>());

const fetchedOrganizationsFromChain = computedAsync(async () => {
    if (!!wallet.value) {
        const result: WalletSyncOrganizationState[] = [];

        // we start by fetching the organizations from the chain
        const accountId = Utils.binaryToHexa(await walletStore.getAccountId(walletId.value));
        if (!wallet.value.indexer) return undefined;
        const client = createIndexerClient(wallet.value.indexer);
        const orgs = await client.getOrganizations({
            account_id: accountId,
            limit: 100,
        });


        for (const org of orgs.items) {
            // then we fetch the applications for each organization
            const applications = await client.getApplications({
                organization_id: org.virtualBlockchainId,
                limit: 100,
            });

            // then we fetch the nodes for each organization
            const nodes = await client.getValidatorNodes({
                organization_id: org.virtualBlockchainId,
            })

            result.push({
                org,
                apps: applications.items,
                nodes: nodes.items,
            });
        }

        return result;
    } else {
        return undefined
    }
})

const newElements = computed(() => {
    const fetched = fetchedOrganizationsFromChain.value;
    if (!fetched) return [];
    return fetched
        .map(state => ({
            org: state.org,
            isNewOrg: !knownOrgIdsInWallet.value.has(state.org.virtualBlockchainId),
            newApps: state.apps.filter(a => !knownAppIdsInWallet.value.has(a.virtualBlockchainId)),
            newNodes: state.nodes.filter(n => !knownNodeIdsInWallet.value.has(n.virtualBlockchainId)),
        }))
        .filter(s => s.isNewOrg || s.newApps.length > 0 || s.newNodes.length > 0);
});

const hasNewElements = computed(() => newElements.value.length > 0);

async function importNewElements() {
    const fetched = fetchedOrganizationsFromChain.value;
    if (!fetched) return;

    const localOrgs = await orgRepo.getOrganizationsByWalletId(walletId.value);
    const localOrgByVbId = new Map(localOrgs.map(o => [o.vbId, o]));

    for (const { org, apps, nodes } of fetched) {
        let localOrgId: number;

        if (!knownOrgIdsInWallet.value.has(org.virtualBlockchainId)) {
            localOrgId = await orgRepo.insertOrganization(walletId.value, {
                name: org.name,
                vbId: org.virtualBlockchainId,
                countryCode: org.countryCode,
                city: org.city,
                website: org.website,
            });
        } else {
            const existing = localOrgByVbId.get(org.virtualBlockchainId);
            if (!existing) continue;
            localOrgId = existing.id;
        }

        for (const app of apps) {
            if (!knownAppIdsInWallet.value.has(app.virtualBlockchainId)) {
                await appRepo.insertApplication(localOrgId, {
                    name: app.name,
                    vbId: app.virtualBlockchainId,
                    description: app.description,
                    website: app.homepageUrl,
                });
            }
        }

        for (const node of nodes) {
            if (!knownNodeIdsInWallet.value.has(node.virtualBlockchainId)) {
                await nodeRepo.insertNode(localOrgId, {
                    name: node.address || node.rpcEndpoint,
                    vbId: node.virtualBlockchainId,
                    rpcEndpoint: node.rpcEndpoint,
                });
            }
        }
    }

    refreshCount.value++;
    toast.add({ severity: 'success', summary: 'Import complete', detail: 'New elements added to wallet.', life: 3000 });
}
</script>

<template>
    <div v-if="hasNewElements">

        <Card class="bg-blue-400 border-blue-500">
            <template #title>
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-download text-xl"></i>
                        <span>Import new elements from chain</span>
                    </div>
                    <Button @click="importNewElements">Import</Button>
                </div>
            </template>
            <template #subtitle>
                <p class="text-sm text-surface-500">
                    New elements are not included in your wallet yet and can be imported from the chain.
                </p>
            </template>
            <template #content>
                <Card v-for="org in newElements" :key="org.org.virtualBlockchainId" class="w-100 h-50">
                    <template #title>
                        <div class="flex items-center gap-2">
                            <i class="pi pi-building text-xl"></i>
                            <span>{{org.org.name}}</span>
                            <span v-if="org.isNewOrg" class="text-xs font-normal bg-green-500 text-white px-2 py-0.5 rounded">New</span>
                        </div>
                    </template>
                    <template #content>
                        <div class="flex justify-evenly items-center">
                            <div class="w-1/2">
                                <span class="font-bold">Applications:</span>
                                <ul>
                                    <li v-if="org.newApps.length === 0">--</li>
                                    <li v-for="app in org.newApps" :key="app.virtualBlockchainId">{{app.name}}</li>
                                </ul>
                            </div>
                            <div class="w-1/2">
                                <span class="font-bold">Nodes:</span>
                                <ul>
                                    <li v-if="org.newNodes.length === 0">--</li>
                                    <li v-for="node in org.newNodes" :key="node.virtualBlockchainId">{{node.rpcEndpoint}}</li>
                                </ul>
                            </div>
                        </div>
                    </template>
                </Card>

            </template>
        </Card>
    </div>
</template>
