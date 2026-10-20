<script setup lang="ts">
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { CMTSToken } from '@cmts-dev/carmentis-sdk-core';
import { useOnChainActions } from '../../../../../composables/useOnChainActions.ts';
import FieldNameAndDescription from "../../../../../components/utils/FieldNameAndDescription.vue";
import {useCurrentNode} from "../../../../../composables/useCurrentNode.ts";
import ResponsiveDialog from "../../../../../components/ui/ResponsiveDialog.vue";
import AmountDisplay from "../../../../../components/ui/AmountDisplay.vue";

const isOpen = defineModel<boolean>('isOpen', { default: false });

const route = useRoute();
const onChainStore = useOnChainActions();
const { isStakingOnNode } = onChainStore;

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

const { currentStakedAmount } = useCurrentNode();

const MAX_STAKE = 10_000_000;

const stakeAmount = ref<number | null>(null);

const stakeAmountError = computed(() => {
    if (stakeAmount.value === null) return null;
    if (stakeAmount.value > MAX_STAKE) {
        return `Maximum stake amount is ${MAX_STAKE.toLocaleString()} CMTS`;
    }
    return null;
});

const canStake = computed(() => {
    return stakeAmount.value !== null && stakeAmountError.value === null;
});

// Reset the amount whenever the dialog opens
watch(isOpen, (open) => {
    if (open) stakeAmount.value = null;
});

async function submitStake() {
    if (!canStake.value || stakeAmount.value === null) return;

    try {
        await onChainStore.stakeOnNode({
            orgId: orgId.value,
            nodeId: nodeId.value,
            amount: CMTSToken.createCMTS(stakeAmount.value),
        });
        isOpen.value = false;
        stakeAmount.value = null;
    } catch (error) {
        console.error('Error staking:', error);
    }
}
</script>

<template>
    <ResponsiveDialog v-model:visible="isOpen" header="Stake tokens" :closable="!isStakingOnNode">
        <form id="stake-form" class="space-y-4" novalidate @submit.prevent="submitStake">
            <p class="text-sm text-fg-muted">
                The amount is added to your current stake, if any. Currently staked:
                <AmountDisplay :value="currentStakedAmount" size="sm" />
            </p>

            <div>
                <FieldNameAndDescription name="Amount (CMTS)" input-id="stake-amount" required />
                <InputNumber
                    v-model="stakeAmount"
                    input-id="stake-amount"
                    :min="0"
                    :max="MAX_STAKE"
                    :minFractionDigits="0"
                    :maxFractionDigits="2"
                    locale="en-US"
                    fluid
                    placeholder="0.00"
                    :invalid="!!stakeAmountError"
                    aria-describedby="stake-amount-hint"
                />
                <p id="stake-amount-hint" class="mt-1 text-sm" :class="stakeAmountError ? 'text-danger' : 'text-fg-muted'">
                    {{ stakeAmountError ?? `Maximum: ${MAX_STAKE.toLocaleString()} CMTS` }}
                </p>
            </div>
        </form>

        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="isStakingOnNode" @click="isOpen = false" />
            <Button
                type="submit"
                form="stake-form"
                label="Stake"
                icon="pi pi-check"
                :disabled="!canStake || isStakingOnNode"
                :loading="isStakingOnNode"
            />
        </template>
    </ResponsiveDialog>
</template>
