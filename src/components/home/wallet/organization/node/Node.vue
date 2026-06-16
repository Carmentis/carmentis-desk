<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useHasAccountOnChainQuery } from '../../../../../composables/useAccountBreakdown.ts';
import { useNode } from '../../../../../composables/useNode.ts';
import NodeInformationCard from './NodeInformationCard.vue';
import NodePublicationStatusCard from './NodePublicationStatusCard.vue';
import NodeStakingCard from './NodeStakingCard.vue';
import NodeStakeDialog from './NodeStakeDialog.vue';
import NodeUnstakeDialog from './NodeUnstakeDialog.vue';
import NodeClaimDialog from './NodeClaimDialog.vue';

const route = useRoute();
const router = useRouter();
const registerNavbarActions = inject<(actions: any[]) => void>('registerNavbarActions');

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

const {
    wallet,
    organization,
    node,
    chainNameOnWhichNodeIsConnected,
    nodePublicKey,
    nodeVbId,
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
} = useNode(walletId, orgId, nodeId);

const hasAccountOnChain = useHasAccountOnChainQuery(walletId.value);

// Dialog visibility
const showStakeDialog = ref(false);
const showUnstakeDialog = ref(false);
const showClaimDialog = ref(false);

const openStakeDialog = () => (showStakeDialog.value = true);
const openUnstakeDialog = () => (showUnstakeDialog.value = true);
const openClaimDialog = () => (showClaimDialog.value = true);

const maxUnstakeAmount = computed(() => {
    if (currentStakedAmount.value === undefined) return 0;
    return currentStakedAmount.value.getAmountAsAtomic();
});

// Register navbar actions - needs to be reactive to node state changes
watch(
    [isNodePublished, isNodeClaimed, isOwnedByWallet, nodeStakeInformation, hasUnstakingOperationInProgress],
    () => {
        if (registerNavbarActions) {
            const actions = [];

            if (!node.value?.vbId && !isNodePublished.value && !isNodeClaimed.value) {
                actions.push({
                    label: 'Claim Node',
                    icon: 'pi pi-lock',
                    command: openClaimDialog,
                    outlined: true,
                });
            }

            if (isOwnedByWallet.value && nodeStakeInformation.value === undefined) {
                actions.push({
                    label: 'Stake Tokens',
                    icon: 'pi pi-wallet',
                    command: openStakeDialog,
                    outlined: true,
                });
            }

            if (isOwnedByWallet.value && nodeStakeInformation.value !== undefined) {
                actions.push({
                    label: 'Stake More',
                    icon: 'pi pi-plus',
                    command: openStakeDialog,
                    outlined: true,
                });

                if (!hasUnstakingOperationInProgress.value) {
                    actions.push({
                        label: 'Unstake',
                        icon: 'pi pi-minus',
                        severity: 'secondary',
                        command: openUnstakeDialog,
                        outlined: true,
                    });
                }
            }

            registerNavbarActions(actions);
        }
    },
    { immediate: true },
);
</script>

<template>
    <div class="space-y-6">
        <div v-if="node && wallet && organization">
            <!-- Node Information and Status Cards -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NodeInformationCard
                    :node="node"
                    :chain-name="chainNameOnWhichNodeIsConnected"
                    :node-public-key="nodePublicKey"
                    :is-node-published="isNodePublished"
                    :is-node-claimed="isNodeClaimed"
                    :has-account-on-chain="hasAccountOnChain"
                    @claim="openClaimDialog"
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
                    v-if="node.vbId"
                    :node-stake-information="nodeStakeInformation"
                    :current-staked-amount="currentStakedAmount"
                    :has-unstaking-operation-in-progress="hasUnstakingOperationInProgress"
                    :unstaking-amount-in-progress="unstakingAmountInProgress"
                    :unstaking-at-timestamp="unstakingAtTimestamp"
                    :is-owned-by-wallet="isOwnedByWallet"
                    @stake="openStakeDialog"
                    @unstake="openUnstakeDialog"
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
        <NodeStakeDialog v-model:is-open="showStakeDialog" />
        <NodeUnstakeDialog v-model:is-open="showUnstakeDialog" :max-unstake-amount="maxUnstakeAmount" />
        <NodeClaimDialog
            v-model:is-open="showClaimDialog"
            :node-vb-id="nodeVbId"
            :organization-name="organization?.name"
        />
    </div>
</template>
