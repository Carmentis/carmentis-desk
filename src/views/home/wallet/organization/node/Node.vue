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
} = useCurrentNode();

const hasAccountOnChain = useHasAccountOnChainQuery();

// The node arrives asynchronously and a missing one looks the same as a loading one:
// show a skeleton for a moment before concluding that it does not exist.
const hasWaited = ref(false);
useTimeoutFn(() => hasWaited.value = true, 1000);
</script>

<template>
    <div v-if="node && wallet && organization" class="space-y-6">
        <PageHeader :title="capitalize(node.name)" :back-to="`/wallet/${walletId}/organization/${orgId}`" />

        <!-- Node information, publication status and staking -->
        <div class="grid gap-4 lg:grid-cols-2 lg:items-start">
            <NodeInformationCard
                :node="node"
                :chain-name="chainNameOnWhichNodeIsConnected"
                :node-public-key="nodePublicKey"
                :is-node-published="isNodePublished"
                :is-node-claimed="isNodeClaimed"
                :has-account-on-chain="hasAccountOnChain"
            />

            <NodePublicationStatusCard
                :node="node"
                :is-node-published="isNodePublished"
                :is-node-validator="isNodeValidator"
                :is-node-claimed="isNodeClaimed"
                :node-owner-name="nodeOwnerName"
                :node-owner-account-id="nodeOwnerAccountId"
                :is-owned-by-wallet="isOwnedByWallet"
            />

            <NodeStakingCard
                v-if="node.nodeVbId"
                :node-stake-information="nodeStakeInformation"
                :current-staked-amount="currentStakedAmount"
                :has-unstaking-operation-in-progress="hasUnstakingOperationInProgress"
                :unstaking-amount-in-progress="unstakingAmountInProgress"
                :unstaking-at-timestamp="unstakingAtTimestamp"
                :is-owned-by-wallet="isOwnedByWallet"
            />
        </div>
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
