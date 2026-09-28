<script setup lang="ts">
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import NodeInformationCard from './NodeInformationCard.vue';
import NodePublicationStatusCard from './NodePublicationStatusCard.vue';
import NodeStakingCard from './NodeStakingCard.vue';
import {useCurrentNode} from "../../../../../composables/useCurrentNode.ts";
import {capitalize, computed} from "vue";
import {useNavigation} from "../../../../../composables/useNavigation.ts";

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
const nav = useNavigation();
</script>

<template>
    <div class="space-y-6">
        <div v-if="node && wallet && organization">

            <!-- Application Header -->
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-900">Node - {{ capitalize(node.name) }}</h2>
                <Button @click="nav.goToOrganization(walletId, orgId)">Back to organization</Button>
            </div>

            <!-- Node Information and Status Cards -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <!-- Not Found State -->
        <div v-else class="text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Node Not Found</h1>
            <p class="text-gray-500 mb-6">The node you're looking for doesn't exist.</p>
            <Button @click="router.push('/')" label="Back to Home" icon="pi pi-home" />
        </div>

        <!-- Dialogs -->



    </div>
</template>
