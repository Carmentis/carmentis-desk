<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { CMTSToken } from '@cmts-dev/carmentis-sdk-core';
import { useOnChainStore } from '../../../../../stores/onchain';
import {useNode} from "../../../../../composables/useNode.ts";
import FieldNameAndDescription from "../../../../utils/FieldNameAndDescription.vue";

const isOpen = defineModel<boolean>('isOpen');

const route = useRoute();
const onChainStore = useOnChainStore();
const { isStakingOnNode } = storeToRefs(onChainStore);

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

const { currentStakedAmount } = useNode(walletId, orgId, nodeId);

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
            walletId: walletId.value,
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
    <Dialog v-model:visible="isOpen" modal header="Stake Tokens" :style="{ width: '30rem' }">
        <div class="space-y-4">
            <div>
                <p class="text-gray-700 text-sm block mb-4">
                    Enter the amount of CMTS tokens you want to stake, which will be added to your
                    current stake (if any). You have currently {{currentStakedAmount}} staked tokens.
                </p>
                <FieldNameAndDescription name="Amount (CMTS)" description="Amount of tokens to stake" required/>
                <InputNumber
                    v-model="stakeAmount"
                    :min="0"
                    :max="MAX_STAKE"
                    :minFractionDigits="0"
                    :maxFractionDigits="2"
                    locale="en-US"
                    class="w-full"
                    placeholder="Enter amount to stake"
                />
                <small class="text-gray-500 mt-1 block">
                    Max: {{ MAX_STAKE.toLocaleString() }} CMTS
                </small>
                <small v-if="stakeAmountError" class="text-red-500 mt-1 block">
                    {{ stakeAmountError }}
                </small>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="isOpen = false" text />
                <Button
                    label="Stake"
                    @click="submitStake"
                    :disabled="!canStake || isStakingOnNode"
                    :loading="isStakingOnNode"
                    icon="pi pi-check"
                />
            </div>
        </template>
    </Dialog>
</template>
