<script setup lang="ts">
import Button from "primevue/button";
import {computedAsync, useAsyncState} from "@vueuse/core";
import * as nodeRepo from "../../../../db/repositories/nodeRepository.ts";
import {NodeEntity} from "../../../../stores/storage.ts";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import {useOnChainStore} from "../../../../stores/onchain.ts";
import {useSessionStore} from "../../../../stores/sessionStore.ts";
import {storeToRefs} from "pinia";
import {computed, ref, watch} from "vue";
import {Tendermint37Client} from "@cosmjs/tendermint-rpc";
import {
    CarmentisError,
    CryptoEncoderFactory,
    EncoderFactory, Hash, LockType,
    ProviderFactory, SeedEncoder, SignatureSchemeId,
    Utils, WalletCrypto
} from "@cmts-dev/carmentis-sdk-core";
import {createIndexerClient} from "../../../../api/indexer/client.ts";
import * as walletRepo from "../../../../db/repositories/walletRepository.ts";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import FieldNameAndDescription from "../../../../components/utils/FieldNameAndDescription.vue";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import {useCurrentWallet} from "../../../../composables/useCurrentWallet.ts";
import TabPanel from "primevue/tabpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import Tabs from "primevue/tabs";
import TabPanels from "primevue/tabpanels";
import DataTable, {DataTableRowClickEvent} from "primevue/datatable";
import Column from "primevue/column";
import {InsertType} from "dexie";
import {ValidatorNodeDto} from "../../../../api/indexer/model";
import {useNavigation} from "../../../../composables/useNavigation.ts";
import {useCurrentDate} from "../../../../stores/useCurrentDate.ts";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const {indexer} = useCurrentWallet();
const {organizationNodes: nodes, createNode, deleteNode: deleteNodeById, useFoundNodesOnChain} = useCurrentOrganization();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));


// Nodes management (reactive via nodes state from useAsyncState)

const isSearchingForVbId = ref(false);
const showManualImportForm = ref(false);
const manualNodeName = ref('');
const manualNodeVbId = ref('');
const manualNodeRpcEndpoint = ref('');
watch(manualNodeRpcEndpoint, async () => {
    if (!indexer.value) return;
    isSearchingForVbId.value = true;
    try {
        const endpoint = manualNodeRpcEndpoint.value;
        if (endpoint.trim().length !== 0) {
            const client = await Tendermint37Client.connect(endpoint);
            const status = await client.status();
            const pk = status.validatorInfo.pubkey;
            if (pk) {
                const b64 = EncoderFactory.bytesToBase64Encoder();
                const nodeResult = await indexer.value.getValidatorNodes({
                    public_key: b64.encode(pk.data),
                });
                if (nodeResult.items.length === 0) throw new Error('Node not found in indexer');
                toast.add({
                    severity: 'success',
                    summary: 'Node found',
                    detail: `Node found with Virtual Blockchain ID`,
                    life: 3000,
                });
                manualNodeVbId.value = nodeResult.items[0].virtualBlockchainId;
            }
        } else {
            manualNodeVbId.value = '';
        }
    } catch (e) {
        manualNodeVbId.value = '';
    } finally {
        isSearchingForVbId.value = false;
    }
});

async function submitManualNodeImport() {
    if (!manualNodeName.value || !manualNodeRpcEndpoint.value) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Name and RPC endpoint are required',
            life: 3000,
        });
        return;
    }

    const newNode: Omit<NodeEntity, 'id'> = {
        name: manualNodeName.value,
        rpcEndpoint: manualNodeRpcEndpoint.value,
    };

    if (manualNodeVbId.value) {
        newNode.vbId = manualNodeVbId.value;
    }
    await createNode(newNode.name, newNode.rpcEndpoint, newNode.vbId);

    // Reset form
    manualNodeName.value = '';
    manualNodeVbId.value = '';
    manualNodeRpcEndpoint.value = '';
    showManualImportForm.value = false;

    toast.add({
        severity: 'success',
        summary: 'Node added',
        detail: 'Node added successfully',
        life: 3000,
    });
}

async function deleteNode(nodeId: number) {
    await deleteNodeById(nodeId);
    toast.add({
        severity: 'success',
        summary: 'Node deleted',
        detail: 'Node deleted successfully',
        life: 3000,
    });
}

function visitNode(nodeId: number) {
    const endpoint = `/wallet/${walletId.value}/organization/${orgId.value}/node/${nodeId}`
    console.log(`Routing to ${endpoint}`)
    router.push(endpoint);
}

// organization nodes to claim
const showImportDialog = ref(false);
const nodesToImport = ref<string[]>([]);

async function importNewNodes() {
    /*
    if (!wallet.value) return;

    // load new nodes
    const newNodes: Omit<NodeEntity, 'id'>[] = [];
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    for (const newNodeId of nodesToImport.value) {
        const vb = await provider.loadValidatorNodeVirtualBlockchain(Hash.from(newNodeId));
        const rpcEndpoint = await vb.getRpcEndpointDeclaration();
        const nodeStatus = await provider.getNodeStatus(rpcEndpoint);
        const moniker = nodeStatus.result.node_info.moniker;
        newNodes.push({
            vbId: newNodeId,
            rpcEndpoint: rpcEndpoint,
            name: moniker,
        });
    }

    // import nodes
    await nodeRepo.insertManyNodes(orgId.value, newNodes);
    showImportDialog.value = false;
    toast.add({
        severity: 'success',
        summary: 'Nodes imported',
        detail: `${newNodes.length} node(s) imported successfully`,
        life: 3000,
    });

     */
}

const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
const foundNodesOnChain = useFoundNodesOnChain();
const activeTab = ref<string>('local');
const now = useCurrentDate();
const onChainNodesCounter = computed(() => {
    if (foundNodesOnChain.isLoading.value) {
        return '.'.repeat(now.value.getSeconds() % 3 + 1);
    }

    if (foundNodesOnChain.error.value) {
        return ':(';
    }

    if (foundNodesOnChain.data.value) {
        return `(${foundNodesOnChain.data.value.length})`
    }

    return 0;
})


const navigation = useNavigation();
async function importNode(existingNode: ValidatorNodeDto) {
    const nodeId = await createNode(existingNode.moniker, existingNode.rpcEndpoint, existingNode.virtualBlockchainId);
    await navigation.goToNode(walletId.value, orgId.value, nodeId);
}
</script>
<template>
    <div
        v-if="isOrganizationFoundOnChain !== true"
        class="flex items-start gap-3 px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg"
    >
        <i class="pi pi-lock text-gray-500 mt-0.5 text-lg"></i>
        <div>
            <p class="text-sm font-medium text-gray-700">Feature locked</p>
            <p class="text-sm text-gray-500 mt-1">
                Node management is only available once the organization has been
                published on the Carmentis network.
            </p>
        </div>
    </div>
    <div v-else class="space-y-4">
        <!-- Nodes Header Actions -->
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
                Nodes
            </h3>
            <div class="flex gap-2">
                <Button
                    @click="showManualImportForm = true"
                    label="Add Node"
                    icon="pi pi-plus"
                    size="small"
                />
            </div>
        </div>

        <Tabs v-model:value="activeTab">
            <TabList>
                <Tab value="local">Local Nodes ({{ nodes.length }})</Tab>
                <Tab value="on-chain">On-Chain Nodes {{onChainNodesCounter}}</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="local">
                    <div class="mb-4">
                        <span class="font-bold">Below are displayed the nodes associated with this wallet, found locally.</span>

                        <div>
                            If a node is displayed here, then its configuration is stored in the local database.
                            If a node is displayed here but is not available on the network, it means that
                            the node has been configured locally but is not currently registered or reachable.
                        </div>


                        <!-- Nodes Content -->
                        <div v-if="nodes.length === 0" class="text-center py-8">
                            <div
                                class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3"
                            >
                                <i class="pi pi-sitemap text-2xl text-gray-400"></i>
                            </div>
                            <p class="text-gray-500 text-sm">No nodes configured yet</p>
                        </div>
                        <div v-else class="space-y-3">
                            <DataTable
                                :value="nodes"
                                stripedRows
                                showGridlines
                                responsiveLayout="scroll"
                                class="text-sm hover:cursor-pointer"
                                @rowClick=" (event: DataTableRowClickEvent<any>) => visitNode(event.data.id)"
                            >
                                <Column field="name" header="Name" sortable style="min-width: 150px"></Column>
                                <Column field="rpcEndpoint" header="RPC Endpoint" sortable/>
                                <Column field="nodeVbId" header="Node ID" sortable style="min-width: 150px"/>

                            </DataTable>

                            <!--div
                                v-for="node of nodes"
                                :key="node.id"
                                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                @click="() => (node.id)"
                            >
                                <div class="flex items-start justify-between">
                                    <div class="space-y-2 flex-1">
                                        <div class="font-medium text-gray-900">
                                            {{ node.name }}
                                        </div>
                                        <div class="text-xs text-gray-500 space-y-1">
                                            <div v-if="node.nodeVbId" class="flex items-center gap-2">
                                                <i class="pi pi-tag"></i>
                                                <code class="bg-gray-100 px-2 py-0.5 rounded">
                                                    {{ node.nodeVbId }}
                                                </code>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <i class="pi pi-globe"></i>
                                                <span>
                                                                        {{ node.rpcEndpoint }}
                                                                    </span>
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
                            </div-->
                        </div>

                    </div>
                </TabPanel>

                <TabPanel value="on-chain">
                    <div class="mb-4">
                        <span class="font-bold">Below are the nodes associated with this wallet that were found on-chain.</span>

                        <div>
                            If a node is displayed here but is not present in the local database,
                            it means that the node has been registered on the blockchain but has not yet been synchronized
                            with the local database. To import it, click on the node.
                        </div>

                    </div>
                    <div>
                    <DataTable
                        :value="foundNodesOnChain.data.value"
                        stripedRows
                        showGridlines
                        responsiveLayout="scroll"
                        class="text-sm hover:cursor-pointer"
                        @rowClick=" (event: DataTableRowClickEvent<any>) => importNode(event.data)"
                    >
                        <Column field="moniker" header="Name" sortable style="min-width: 150px"></Column>
                        <Column field="rpcEndpoint" header="RPC Endpoint" sortable/>
                        <Column field="virtualBlockchainId" header="Node ID" sortable style="min-width: 150px"/>
                        <Column>
                            <template #body>
                                <Button icon="pi pi-download" title="Import"/>
                            </template>
                        </Column>
                    </DataTable>
                    </div>
                </TabPanel>
            </TabPanels>
        </Tabs>



    </div>


    <!-- Add Node Dialog -->
    <Dialog v-model:visible="showManualImportForm" header="Add Node" modal class="w-full max-w-2xl">
        <div class="mb-3">
            Add a node to your organization. Note that your node should be already running
            before adding it to the organization.
        </div>
        <div class="space-y-4">
            <div>
                <FieldNameAndDescription name="Node name" description="Name of your node." required />
                <InputText
                    id="manual-node-name"
                    v-model="manualNodeName"
                    placeholder="Node name"
                    class="w-full"
                />
            </div>
            <div>
                <FieldNameAndDescription name="RPC Endpoint" description="URL pointing to the RPC page of the node." required />
                <InputText
                    id="manual-node-rpc"
                    v-model="manualNodeRpcEndpoint"
                    placeholder="https://my-node.example.com"
                    class="w-full"
                />
            </div>
            <div>
                <FieldNameAndDescription name="Virtual Blockchain ID" description="Virtual Blockchain ID of your node, if already published on-chain."  />

                <InputText id="manual-node-vbid" v-model="manualNodeVbId" placeholder="VB ID" class="w-full" />
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="showManualImportForm = false" severity="secondary" outlined />
                <Button
                    label="Add Node"
                    @click="submitManualNodeImport"
                    icon="pi pi-check"
                    :disabled="isSearchingForVbId"
                />
            </div>
        </template>
    </Dialog>

    <!-- Import Nodes Dialog -->
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
</template>