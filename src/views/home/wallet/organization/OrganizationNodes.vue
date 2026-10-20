<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import {useToast} from "primevue/usetoast";
import {useRoute} from "vue-router";
import {computed, ref, watch} from "vue";
import {Tendermint37Client} from "@cosmjs/tendermint-rpc";
import {EncoderFactory} from "@cmts-dev/carmentis-sdk-core";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import {useCurrentWallet} from "../../../../composables/useCurrentWallet.ts";
import {useNavigation} from "../../../../composables/useNavigation.ts";
import {ValidatorNodeDto} from "../../../../api/indexer/model";
import FieldNameAndDescription from "../../../../components/utils/FieldNameAndDescription.vue";
import ResponsiveDialog from "../../../../components/ui/ResponsiveDialog.vue";
import SegmentedControl from "../../../../components/ui/SegmentedControl.vue";
import StatusBadge from "../../../../components/ui/StatusBadge.vue";
import CopyableValue from "../../../../components/ui/CopyableValue.vue";
import EmptyState from "../../../../components/ui/EmptyState.vue";
import ErrorState from "../../../../components/ui/ErrorState.vue";
import SkeletonBlock from "../../../../components/ui/SkeletonBlock.vue";
import type {SegmentedOption} from "../../../../components/ui/types.ts";

const toast = useToast();
const route = useRoute();
const navigation = useNavigation();

const {indexer} = useCurrentWallet();
const {organizationNodes: nodes, createNode, useFoundNodesOnChain} = useCurrentOrganization();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');

// ---- adding a node manually ----
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

// inline validation, shown once the user tried to add the node
const addSubmitted = ref(false);
const isAdding = ref(false);
const nameError = computed(() => addSubmitted.value && !manualNodeName.value ? 'Enter a name for the node.' : '');
const rpcError = computed(() => addSubmitted.value && !manualNodeRpcEndpoint.value ? 'Enter the RPC endpoint of the node.' : '');

function openAddDialog() {
    addSubmitted.value = false;
    showManualImportForm.value = true;
}

async function submitManualNodeImport() {
    addSubmitted.value = true;
    if (nameError.value || rpcError.value) return;

    isAdding.value = true;
    try {
        const name = manualNodeName.value;
        const rpcEndpoint = manualNodeRpcEndpoint.value;
        const vbId = manualNodeVbId.value || undefined;
        await createNode(name, rpcEndpoint, vbId);

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
    } finally {
        isAdding.value = false;
    }
}

function visitNode(nodeId: number) {
    navigation.goToNode(walletId.value, orgId.value, nodeId);
}

async function importNode(existingNode: ValidatorNodeDto) {
    const nodeId = await createNode(existingNode.moniker, existingNode.rpcEndpoint, existingNode.virtualBlockchainId);
    await navigation.goToNode(walletId.value, orgId.value, nodeId);
}

// ---- presentation: Local / On-chain is a filter, not another row of tabs ----
type NodesView = 'local' | 'on-chain';
const view = ref<NodesView>('local');
const foundNodesOnChain = useFoundNodesOnChain();

const onChainCount = computed(() => {
    if (foundNodesOnChain.isLoading.value) return '';
    if (foundNodesOnChain.error.value) return ' (!)';
    return foundNodesOnChain.data.value ? ` (${foundNodesOnChain.data.value.length})` : '';
});
const viewOptions = computed<SegmentedOption<NodesView>[]>(() => [
    { value: 'local', label: `On this device (${nodes.value.length})` },
    { value: 'on-chain', label: `On-chain${onChainCount.value}` },
]);

// A local node is published once the same node is found on-chain.
const onChainIds = computed(() => new Set(foundNodesOnChain.data.value?.map((n) => n.virtualBlockchainId) ?? []));
const isPublished = (vbId?: string) => !!vbId && onChainIds.value.has(vbId);
const canTellPublication = computed(() => !!foundNodesOnChain.data.value);
const localIds = computed(() => new Set(nodes.value.map((n) => n.nodeVbId).filter(Boolean)));
</script>
<template>
    <EmptyState
        v-if="isOrganizationFoundOnChain !== true"
        framed
        icon="pi-lock"
        title="Publish your organization first"
        description="Node management is only available once the organization has been published on the Carmentis network."
    />

    <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-fg">Nodes</h2>
            <Button @click="openAddDialog" label="Add node" icon="pi pi-plus" />
        </div>

        <SegmentedControl v-model="view" :options="viewOptions" ariaLabel="Where to look for nodes" />

        <!-- On this device -->
        <template v-if="view === 'local'">
            <p class="text-sm text-fg-muted">
                Nodes configured on this device. A draft node is not registered on the blockchain.
            </p>

            <EmptyState
                v-if="nodes.length === 0"
                framed
                icon="pi-sitemap"
                title="No nodes configured yet"
                description="Add the node you run to manage its staking and publication."
            >
                <Button @click="openAddDialog" label="Add node" icon="pi pi-plus" />
            </EmptyState>

            <ul v-else class="grid gap-3 lg:grid-cols-2">
                <li
                    v-for="node in nodes"
                    :key="node.id"
                    class="min-w-0 space-y-2 rounded-card border border-line bg-surface p-4 shadow-card"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="truncate font-semibold text-fg">{{ node.name }}</p>
                            <p class="truncate font-mono text-xs text-fg-muted">{{ node.rpcEndpoint }}</p>
                        </div>
                        <Button label="Open" icon="pi pi-arrow-right" icon-pos="right" severity="secondary" outlined size="small" @click="visitNode(node.id)" />
                    </div>
                    <StatusBadge
                        v-if="canTellPublication"
                        :tone="isPublished(node.nodeVbId) ? 'success' : 'warning'"
                        :label="isPublished(node.nodeVbId) ? 'Published' : 'Draft'"
                        :icon="isPublished(node.nodeVbId) ? 'pi-check-circle' : 'pi-file-edit'"
                    />
                    <CopyableValue v-if="node.nodeVbId" :value="node.nodeVbId" label="node ID" :head="10" :tail="8" />
                </li>
            </ul>
        </template>

        <!-- On-chain -->
        <template v-else>
            <p class="text-sm text-fg-muted">
                Nodes of this organization registered on the blockchain. Import one to manage it here.
            </p>

            <SkeletonBlock v-if="foundNodesOnChain.isLoading.value" :lines="3" height-class="h-16" />

            <ErrorState
                v-else-if="foundNodesOnChain.error.value"
                title="Could not search the blockchain"
                :message="foundNodesOnChain.error.value.message"
                retryable
                @retry="foundNodesOnChain.refetch()"
            />

            <EmptyState
                v-else-if="!foundNodesOnChain.data.value?.length"
                framed
                icon="pi-sitemap"
                title="No node found on-chain"
                description="Nodes registered for this organization will appear here."
            />

            <ul v-else class="grid gap-3 lg:grid-cols-2">
                <li
                    v-for="node in foundNodesOnChain.data.value"
                    :key="node.virtualBlockchainId"
                    class="min-w-0 space-y-2 rounded-card border border-line bg-surface p-4 shadow-card"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="truncate font-semibold text-fg">{{ node.moniker }}</p>
                            <p class="truncate font-mono text-xs text-fg-muted">{{ node.rpcEndpoint }}</p>
                        </div>
                        <Button label="Import" icon="pi pi-download" severity="secondary" outlined size="small" @click="importNode(node)" />
                    </div>
                    <StatusBadge
                        :tone="localIds.has(node.virtualBlockchainId) ? 'success' : 'info'"
                        :label="localIds.has(node.virtualBlockchainId) ? 'On this device' : 'Not imported'"
                        :icon="localIds.has(node.virtualBlockchainId) ? 'pi-check-circle' : 'pi-cloud-download'"
                    />
                    <CopyableValue :value="node.virtualBlockchainId" label="node ID" :head="10" :tail="8" />
                </li>
            </ul>
        </template>
    </div>

    <!-- Add Node Dialog -->
    <ResponsiveDialog v-model:visible="showManualImportForm" header="Add node" size="lg" :closable="!isAdding">
        <p class="mb-4 text-sm text-fg-muted">
            Add a node to your organization. Your node must already be running.
        </p>
        <form id="add-node-form" class="space-y-5" novalidate @submit.prevent="submitManualNodeImport">
            <div>
                <FieldNameAndDescription name="Node name" input-id="manual-node-name" required />
                <InputText
                    id="manual-node-name"
                    v-model="manualNodeName"
                    fluid
                    autocomplete="off"
                    placeholder="e.g. Validator Paris 1"
                    :invalid="!!nameError"
                    :aria-invalid="!!nameError"
                    aria-describedby="manual-node-name-error"
                />
                <p v-if="nameError" id="manual-node-name-error" class="mt-1 text-sm text-danger">{{ nameError }}</p>
            </div>
            <div>
                <FieldNameAndDescription
                    name="RPC endpoint"
                    description="The URL of the node's RPC page."
                    input-id="manual-node-rpc"
                    required
                />
                <InputText
                    id="manual-node-rpc"
                    v-model="manualNodeRpcEndpoint"
                    fluid
                    inputmode="url"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="https://my-node.example.com"
                    :invalid="!!rpcError"
                    :aria-invalid="!!rpcError"
                    aria-describedby="manual-node-rpc-error"
                />
                <p v-if="rpcError" id="manual-node-rpc-error" class="mt-1 text-sm text-danger">{{ rpcError }}</p>
                <p v-if="isSearchingForVbId" class="mt-1 text-sm text-fg-muted" role="status">
                    <i class="pi pi-spin pi-spinner mr-1" aria-hidden="true" />Looking up the node on the blockchain…
                </p>
            </div>
            <div>
                <FieldNameAndDescription
                    name="Virtual blockchain ID"
                    description="Filled in automatically when the node is found on the blockchain. Leave empty otherwise."
                    input-id="manual-node-vbid"
                />
                <InputText
                    id="manual-node-vbid"
                    v-model="manualNodeVbId"
                    fluid
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    class="font-mono text-sm"
                    placeholder="Found automatically"
                />
            </div>
        </form>
        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="isAdding" @click="showManualImportForm = false" />
            <Button
                type="submit"
                form="add-node-form"
                label="Add node"
                icon="pi pi-check"
                :loading="isAdding"
                :disabled="isSearchingForVbId"
            />
        </template>
    </ResponsiveDialog>
</template>
