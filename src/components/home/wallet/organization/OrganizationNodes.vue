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

const toast = useToast();
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const { state: nodes, execute: fetchNodes } = useAsyncState(
    () => nodeRepo.getNodesByOrgId(orgId.value),
    [] as NodeEntity[],
    { immediate: true },
);

const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

// Nodes management (reactive via nodes state from useAsyncState)

const isSearchingForVbId = ref(false);
const showManualImportForm = ref(false);
const manualNodeName = ref('');
const manualNodeVbId = ref('');
const manualNodeRpcEndpoint = ref('');
watch(manualNodeRpcEndpoint, async () => {
    if (!wallet.value) return;
    isSearchingForVbId.value = true;
    try {
        const endpoint = manualNodeRpcEndpoint.value;
        if (endpoint.trim().length !== 0) {
            const client = await Tendermint37Client.connect(endpoint);
            const status = await client.status();
            const pk = status.validatorInfo.pubkey;
            if (pk) {
                const b64 = EncoderFactory.bytesToBase64Encoder();
                if (!wallet.value.indexer) throw new Error('Indexer not configured for this wallet');
                const nodeResult = await createIndexerClient(wallet.value.indexer).getValidatorNodes({
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

    await nodeRepo.insertManyNodes(orgId.value, [newNode]);
    await fetchNodes();

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
    await nodeRepo.deleteNodeById(nodeId);
    await fetchNodes();
    toast.add({
        severity: 'success',
        summary: 'Node deleted',
        detail: 'Node deleted successfully',
        life: 3000,
    });
}

function visitNode(nodeId: number) {
    router.push(`/wallet/${walletId.value}/organization/${orgId.value}/node/${nodeId}`);
}

// organization nodes to claim
const showImportDialog = ref(false);
const nodesToImport = ref<string[]>([]);

// wallet key pair (needed for account state)
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
const pk = computed(() => walletKeyPair.value?.pk);

// wallet account id and state
const walletAccountId = computedAsync(async () => {
    if (wallet.value === null) return undefined;
    if (!pk.value) return undefined;
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    try {
        const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        return await provider.getAccountIdByPublicKey(await sigEncoder.decodePublicKey(pk.value));
    } catch (e) {
        if (CarmentisError.isCarmentisError(e)) {
            return Utils.getNullHash();
        }
        console.error(e);
        return undefined;
    }
});

const walletAccountState = computedAsync(async () => {
    if (wallet.value === null) return undefined;
    if (!pk.value) return undefined;
    if (walletAccountId.value === undefined) return undefined;
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    const accountId = await walletAccountId.value;
    const accountState = await provider.getAccountState(accountId);
    return accountState;
}, undefined, { shallow: true });



async function fetchNodesOnChain() {
    const accountState = walletAccountState.value;
    if (!accountState) {
        toast.add({
            severity: 'info',
            summary: 'No nodes',
            detail: 'No node to import',
            life: 3000,
        });
        return;
    }

    const locks = accountState.locks;
    const stakingLocks = locks.filter((lock) => lock.type === LockType.NodeStaking);
    const nodesIds = stakingLocks.map((sl) => Hash.from(sl.parameters.validatorNodeId as Uint8Array));
    const newNodesIds = [];
    for (const nodeId of nodesIds) {
        const isAlreadyDeclared = await nodeRepo.isNodeDeclared(orgId.value, nodeId.encode());
        if (isAlreadyDeclared) {
        } else {
            newNodesIds.push(nodeId.encode());
        }
    }
    if (newNodesIds.length === 0) {
        toast.add({
            severity: 'info',
            summary: 'No nodes',
            detail: 'No node to import',
            life: 3000,
        });
        return;
    }

    nodesToImport.value = newNodesIds;
    showImportDialog.value = true;
}

async function importNewNodes() {
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
    await fetchNodes();
    showImportDialog.value = false;
    toast.add({
        severity: 'success',
        summary: 'Nodes imported',
        detail: `${newNodes.length} node(s) imported successfully`,
        life: 3000,
    });
}

const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
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
                Nodes ({{ nodes.length }})
            </h3>
            <div class="flex gap-2">
                <Button
                    @click="fetchNodesOnChain"
                    label="Fetch On-Chain"
                    icon="pi pi-cloud-download"
                    size="small"
                    outlined
                />
                <Button
                    @click="showManualImportForm = true"
                    label="Add Node"
                    icon="pi pi-plus"
                    size="small"
                />
            </div>
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
            <div
                v-for="node of nodes"
                :key="node.id"
                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                @click="visitNode(node.id)"
            >
                <div class="flex items-start justify-between">
                    <div class="space-y-2 flex-1">
                        <div class="font-medium text-gray-900">
                            {{ node.name }}
                        </div>
                        <div class="text-xs text-gray-500 space-y-1">
                            <div v-if="node.vbId" class="flex items-center gap-2">
                                <i class="pi pi-tag"></i>
                                <code class="bg-gray-100 px-2 py-0.5 rounded">
                                    {{ node.vbId }}
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
            </div>
        </div>
    </div>


    <!-- Add Node Dialog -->
    <Dialog v-model:visible="showManualImportForm" header="Add Node" modal class="w-full max-w-2xl">
        <div class="space-y-4">
            <div>
                <label for="manual-node-name" class="block text-sm font-medium text-gray-700 mb-2">
                    Name
                    <span class="text-red-500">*</span>
                </label>
                <InputText
                    id="manual-node-name"
                    v-model="manualNodeName"
                    placeholder="Node name"
                    class="w-full"
                />
            </div>
            <div>
                <label for="manual-node-vbid" class="block text-sm font-medium text-gray-700 mb-2">
                    Virtual Blockchain ID
                    <span class="text-gray-400">(optional)</span>
                </label>
                <InputText id="manual-node-vbid" v-model="manualNodeVbId" placeholder="VB ID" class="w-full" />
            </div>
            <div>
                <label for="manual-node-rpc" class="block text-sm font-medium text-gray-700 mb-2">
                    RPC Endpoint
                    <span class="text-red-500">*</span>
                </label>
                <InputText
                    id="manual-node-rpc"
                    v-model="manualNodeRpcEndpoint"
                    placeholder="https://..."
                    class="w-full"
                />
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