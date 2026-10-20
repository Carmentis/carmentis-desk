<script setup lang="ts">
import Button from 'primevue/button';
import type { CMTSToken } from '@cmts-dev/carmentis-sdk-core';
import NodeStakeDialog from "./NodeStakeDialog.vue";
import {computed, ref, watch} from "vue";
import NodeUnstakeDialog from "./NodeUnstakeDialog.vue";
import {useCurrentNode} from "../../../../../composables/useCurrentNode.ts";
import UiCard from "../../../../../components/ui/UiCard.vue";
import AmountDisplay from "../../../../../components/ui/AmountDisplay.vue";
import StatusBadge from "../../../../../components/ui/StatusBadge.vue";
import EmptyState from "../../../../../components/ui/EmptyState.vue";

defineProps<{
    currentStakedAmount?: CMTSToken;
    hasUnstakingOperationInProgress?: boolean;
    unstakingAmountInProgress?: CMTSToken;
    unstakingAtTimestamp?: number;
    isOwnedByWallet?: boolean;
}>();

const {currentStakedAmount, nodeStakeInformation, hasNodeStakeInformation} = useCurrentNode();
const showStakeDialog = ref(false);
const showUnstakeDialog = ref(false);


const noStakingInfoFound = computed(() => !hasNodeStakeInformation.value);
const maxUnstakeAmount = computed(() => {
    if (currentStakedAmount.value === undefined) return 0;
    return currentStakedAmount.value.getAmountAsAtomic();
});

watch(nodeStakeInformation, (newInfo) => {
    console.log("NodeStakeInformation in node staking card", nodeStakeInformation.value);
})
</script>

<template>
    <UiCard title="Staking">
        <!-- No staking state -->
        <EmptyState
            v-if="noStakingInfoFound"
            icon="pi-ban"
            title="No staking detected"
            description="Nothing is staked on this node yet."
        >
            <Button v-if="isOwnedByWallet" label="Stake tokens" icon="pi pi-wallet" @click="() => showStakeDialog = true" />
        </EmptyState>

        <!-- Has staking -->
        <div v-else class="space-y-5">
            <div>
                <p class="text-sm text-fg-muted">Staked amount</p>
                <AmountDisplay :value="currentStakedAmount" size="hero" />
            </div>

            <!-- Unstaking operation -->
            <div v-if="hasUnstakingOperationInProgress" class="space-y-2 rounded-control bg-warning-soft p-3 text-sm">
                <StatusBadge tone="warning" label="Unstaking in progress" icon="pi-clock" />
                <div class="flex items-baseline justify-between gap-3">
                    <span class="text-fg-muted">Amount</span>
                    <AmountDisplay :value="unstakingAmountInProgress" size="sm" />
                </div>
                <div v-if="unstakingAtTimestamp" class="flex items-baseline justify-between gap-3">
                    <span class="text-fg-muted">Unlock date</span>
                    <span class="font-medium text-fg">{{ new Date(unstakingAtTimestamp * 1000).toLocaleString() }}</span>
                </div>
            </div>
            <p v-else class="flex items-center gap-2 text-sm text-fg-muted">
                <i class="pi pi-info-circle" aria-hidden="true" />
                No unstaking operation is scheduled.
            </p>

            <!-- Actions -->
            <div v-if="isOwnedByWallet" class="grid gap-2 sm:grid-cols-2">
                <Button @click="() => showStakeDialog = true" label="Stake more" icon="pi pi-plus" />
                <Button
                    v-if="!hasUnstakingOperationInProgress"
                    @click="() => showUnstakeDialog = true"
                    label="Unstake"
                    icon="pi pi-minus"
                    severity="secondary"
                    outlined
                />
            </div>
        </div>
    </UiCard>

    <NodeStakeDialog v-model:is-open="showStakeDialog" />
    <NodeUnstakeDialog v-model:is-open="showUnstakeDialog" :max-unstake-amount="maxUnstakeAmount" />
</template>
