<script setup lang="ts">
import {useRoute, useRouter} from 'vue-router';
import {useTimeoutFn} from '@vueuse/core';
import Button from 'primevue/button';
import NodeInformationCard from './NodeInformationCard.vue';
import NodePublicationStatusCard from './NodePublicationStatusCard.vue';
import NodeStakingCard from './NodeStakingCard.vue';
import {useCurrentNode} from "../../../../../composables/useCurrentNode.ts";
import {capitalize, computed, ref} from "vue";
import PageHeader from "../../../../../components/ui/PageHeader.vue";
import EmptyState from "../../../../../components/ui/EmptyState.vue";
import SkeletonBlock from "../../../../../components/ui/SkeletonBlock.vue";
import ConfirmActionDialog from "../../../../../components/ui/ConfirmActionDialog.vue";
import {useToast} from "primevue/usetoast";

const route = useRoute();
const router = useRouter();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const {
    wallet,
    organization,
    node,
    chainNameOnWhichNodeIsConnected,
    nodePublicKey,
    isNodePublished,
    nodeOwnerAccountId,
    nodeOwnerName,
    isNodeValidator,
    isNodeClaimed,
    isOwnedByWallet,
    nodeStakeInformation,
    currentStakedAmount,
    unstakingAmountInProgress,
    hasUnstakingOperationInProgress,
    unstakingAtTimestamp,
    useHasAccountOnChainQuery,
    deleteNode,
} = useCurrentNode();

const toast = useToast();

// ---- delete: only removes the local record, the on-chain node (if any) is untouched ----
const showDeletionDialog = ref(false);
const isDeleting = ref(false);
const menuItems = [
    {label: 'Delete node', icon: 'pi pi-trash', class: 'text-danger', command: () => showDeletionDialog.value = true},
];

async function confirmDeleteNode() {
    isDeleting.value = true;
    try {
        // Leave the page first: once the record is gone this page would flash "Node not found".
        await router.push(`/wallet/${walletId.value}/organization/${orgId.value}`);
        showDeletionDialog.value = false;
        await deleteNode();
        toast.add({severity: 'success', summary: 'Node deleted', detail: 'Node deleted successfully', life: 3000});
    } finally {
        isDeleting.value = false;
    }
}

const hasAccountOnChain = useHasAccountOnChainQuery();

// The node arrives asynchronously and a missing one looks the same as a loading one:
// show a skeleton for a moment before concluding that it does not exist.
const hasWaited = ref(false);
useTimeoutFn(() => hasWaited.value = true, 1000);
</script>

<template>
    <div v-if="node && wallet && organization" class="space-y-6">
        <PageHeader :title="capitalize(node.name)" :back-to="`/wallet/${walletId}/organization/${orgId}`" :menu-items="menuItems" />

        <!-- One column on phones; from lg, information and status share a row at the same height, staking spans the full width. -->
        <div class="grid gap-4 lg:grid-cols-2">
            <!-- `grid` makes the card stretch to the height of the row. -->
            <div class="grid min-w-0">
                <NodeInformationCard
                    :node="node"
                    :chain-name="chainNameOnWhichNodeIsConnected"
                    :node-public-key="nodePublicKey"
                    :is-node-published="isNodePublished"
                    :is-node-claimed="isNodeClaimed"
                    :has-account-on-chain="hasAccountOnChain"
                />
            </div>

            <div class="grid min-w-0">
                <NodePublicationStatusCard
                    :node="node"
                    :is-node-published="isNodePublished"
                    :is-node-validator="isNodeValidator"
                    :is-node-claimed="isNodeClaimed"
                    :node-owner-name="nodeOwnerName"
                    :node-owner-account-id="nodeOwnerAccountId"
                    :is-owned-by-wallet="isOwnedByWallet"
                />
            </div>

            <div v-if="node.nodeVbId" class="min-w-0 lg:col-span-2">
                <NodeStakingCard
                    :node-stake-information="nodeStakeInformation"
                    :current-staked-amount="currentStakedAmount"
                    :has-unstaking-operation-in-progress="hasUnstakingOperationInProgress"
                    :unstaking-amount-in-progress="unstakingAmountInProgress"
                    :unstaking-at-timestamp="unstakingAtTimestamp"
                    :is-owned-by-wallet="isOwnedByWallet"
                />
            </div>
        </div>

        <ConfirmActionDialog
            v-model:visible="showDeletionDialog"
            title="Delete node"
            :item-name="node.name"
            message="This removes the node from Desk only. If it was claimed on the blockchain, it stays there. This cannot be undone."
            :loading="isDeleting"
            @confirm="confirmDeleteNode"
        />
    </div>

    <SkeletonBlock v-else-if="!hasWaited" :lines="4" />

    <!-- Not Found State -->
    <EmptyState
        v-else
        framed
        icon="pi-exclamation-triangle"
        title="Node not found"
        description="The node you are looking for does not exist."
    >
        <Button label="Back to wallets" icon="pi pi-home" @click="router.push('/')" />
    </EmptyState>
</template>
