<script setup lang="ts">
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { CMTSToken } from '@cmts-dev/carmentis-sdk-core';
import { useOnChainActions } from '../../../../../composables/useOnChainActions.ts';
import ResponsiveDialog from '../../../../../components/ui/ResponsiveDialog.vue';
import FieldNameAndDescription from '../../../../../components/utils/FieldNameAndDescription.vue';

const props = defineProps<{
    maxUnstakeAmount: number;
}>();

const isOpen = defineModel<boolean>('isOpen', { default: false });

const route = useRoute();
const onChainStore = useOnChainActions();
const { isUnstakingFromNode } = onChainStore;
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
    <ResponsiveDialog v-model:visible="isOpen" header="Unstake tokens" :closable="!isUnstakingFromNode">
        <form id="unstake-form" novalidate @submit.prevent="submitUnstake">
            <FieldNameAndDescription name="Amount (CMTS)" input-id="unstake-amount" required />
            <InputNumber
                v-model="unstakeAmount"
                input-id="unstake-amount"
                :min="0"
                :max="maxUnstakeAmount"
                :minFractionDigits="0"
                :maxFractionDigits="2"
                locale="en-US"
                fluid
                placeholder="0.00"
                :invalid="!!unstakeAmountError"
                aria-describedby="unstake-amount-hint"
            />
            <p id="unstake-amount-hint" class="mt-1 text-sm" :class="unstakeAmountError ? 'text-danger' : 'text-fg-muted'">
                {{ unstakeAmountError ?? `Maximum available: ${maxUnstakeAmount.toLocaleString()} CMTS` }}
            </p>
        </form>

        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="isUnstakingFromNode" @click="isOpen = false" />
            <Button
                type="submit"
                form="unstake-form"
                label="Unstake"
                icon="pi pi-check"
                :disabled="!canUnstake"
                :loading="isUnstakingFromNode"
            />
        </template>
    </ResponsiveDialog>
</template>
