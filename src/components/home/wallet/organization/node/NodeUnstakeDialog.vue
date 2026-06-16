<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { CMTSToken } from '@cmts-dev/carmentis-sdk-core';
import { useOnChainStore } from '../../../../../stores/onchain';

const props = defineProps<{
    maxUnstakeAmount: number;
}>();

const isOpen = defineModel<boolean>('isOpen');

const route = useRoute();
const onChainStore = useOnChainStore();
const { isUnstakingFromNode } = storeToRefs(onChainStore);

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

const unstakeAmount = ref<number | null>(null);

const unstakeAmountError = computed(() => {
    if (unstakeAmount.value === null) return null;
    if (unstakeAmount.value <= 0) {
        return 'Amount must be greater than 0';
    }
    if (unstakeAmount.value > props.maxUnstakeAmount) {
        return `Maximum unstake amount is ${props.maxUnstakeAmount.toLocaleString()} CMTS`;
    }
    return null;
});

const canUnstake = computed(() => {
    return unstakeAmount.value !== null && unstakeAmountError.value === null;
});

// Reset the amount whenever the dialog opens
watch(isOpen, (open) => {
    if (open) unstakeAmount.value = null;
});

async function submitUnstake() {
    if (!canUnstake.value || unstakeAmount.value === null) return;

    try {
        await onChainStore.unstakeFromNode({
            walletId: walletId.value,
            orgId: orgId.value,
            nodeId: nodeId.value,
            amount: CMTSToken.createCMTS(unstakeAmount.value),
        });
        isOpen.value = false;
        unstakeAmount.value = null;
    } catch (error) {
        console.error('Error unstaking:', error);
    }
}
</script>

<template>
    <Dialog v-model:visible="isOpen" modal header="Unstake Tokens" :style="{ width: '30rem' }">
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Amount (CMTS)</label>
                <InputNumber
                    v-model="unstakeAmount"
                    :min="0"
                    :max="maxUnstakeAmount"
                    :minFractionDigits="0"
                    :maxFractionDigits="2"
                    locale="en-US"
                    class="w-full"
                    placeholder="Enter amount to unstake"
                />
                <small class="text-gray-500 mt-1 block"> Max available: {{ maxUnstakeAmount.toLocaleString() }} CMTS </small>
                <small v-if="unstakeAmountError" class="text-red-500 mt-1 block">
                    {{ unstakeAmountError }}
                </small>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="isOpen = false" text />
                <Button
                    label="Unstake"
                    @click="submitUnstake"
                    :disabled="!canUnstake"
                    :loading="isUnstakingFromNode"
                    icon="pi pi-check"
                    severity="secondary"
                />
            </div>
        </template>
    </Dialog>
</template>
