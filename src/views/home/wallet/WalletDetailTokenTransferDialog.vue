<script setup lang="ts">
import { useOnChainActions } from "../../../composables/useOnChainActions.ts";
import { computed, ref, watch } from "vue";
import { CMTSToken, CryptoEncoderFactory } from "@cmts-dev/carmentis-sdk-core";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Button from "primevue/button";
import { useCurrentWallet } from "../../../composables/useCurrentWallet.ts";
import ResponsiveDialog from "../../../components/ui/ResponsiveDialog.vue";
import FieldNameAndDescription from "../../../components/utils/FieldNameAndDescription.vue";

const onChainStore = useOnChainActions();

// transfer dialog
const isOpen = defineModel<boolean>('isOpen', { default: false });
const {isAccountFoundByPublicKey}  = useCurrentWallet();
const isCreatingNewAccount = ref<boolean | undefined>(undefined);
const transferPublicKey = ref('');
const transferAmount = ref('');
const isTransferring = ref(false);
watch(transferPublicKey, async () => {
    try {
        // attempt to parse the public key
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const pk = await encoder.decodePublicKey(transferPublicKey.value);
        isCreatingNewAccount.value = !(await isAccountFoundByPublicKey(pk));
    } catch (e) {
        isCreatingNewAccount.value = undefined;
    }
});

// inline validation, shown once the user tried to submit
const submitted = ref(false);
watch(isOpen, (open) => {
    if (open) submitted.value = false;
});
const publicKeyError = computed(() =>
    submitted.value && !transferPublicKey.value ? "Enter the recipient's public key." : '',
);
const amountError = computed(() =>
    submitted.value && (!transferAmount.value || Number(transferAmount.value) <= 0)
        ? 'Enter an amount greater than 0.'
        : '',
);

async function submitTransferDialog() {
    submitted.value = true;
    if (publicKeyError.value || amountError.value) return;

    // initiate the transfer
    isTransferring.value = true;
    try {
        const amount = CMTSToken.createCMTS(Number(transferAmount.value));
        await onChainStore.transferTokens({
            recipientPublicKey: transferPublicKey.value,
            amount: amount,
        });
        isOpen.value = false;
    } catch (e) {
        console.error('Transfer failed:', e);
    } finally {
        isTransferring.value = false;
    }
}
</script>
<template>
    <ResponsiveDialog v-model:visible="isOpen" header="Send tokens" :closable="!isTransferring">
        <form id="transfer-form" class="space-y-5" novalidate @submit.prevent="submitTransferDialog">
            <Message v-if="isCreatingNewAccount === true" severity="info" size="small">
                This recipient has no account yet. It will be created with this transfer.
            </Message>
            <Message v-if="isCreatingNewAccount === false" severity="success" size="small">
                Recipient account found on the blockchain.
            </Message>

            <div>
                <FieldNameAndDescription
                    name="Recipient public key"
                    description="The recipient finds it under “Receive”."
                    input-id="transfer-public-key"
                    required
                />
                <InputText
                    id="transfer-public-key"
                    v-model="transferPublicKey"
                    fluid
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="Paste the public key"
                    class="font-mono text-sm"
                    :invalid="!!publicKeyError"
                    :aria-invalid="!!publicKeyError"
                    aria-describedby="transfer-public-key-error"
                />
                <p v-if="publicKeyError" id="transfer-public-key-error" class="mt-1 text-sm text-danger">
                    {{ publicKeyError }}
                </p>
            </div>

            <div>
                <FieldNameAndDescription name="Amount (CMTS)" input-id="transfer-amount" required />
                <InputText
                    id="transfer-amount"
                    v-model="transferAmount"
                    type="number"
                    inputmode="decimal"
                    step="any"
                    min="0"
                    fluid
                    autocomplete="off"
                    placeholder="0.00"
                    :invalid="!!amountError"
                    :aria-invalid="!!amountError"
                    aria-describedby="transfer-amount-error"
                />
                <p v-if="amountError" id="transfer-amount-error" class="mt-1 text-sm text-danger">
                    {{ amountError }}
                </p>
            </div>
        </form>

        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="isTransferring" @click="isOpen = false" />
            <Button
                type="submit"
                form="transfer-form"
                label="Send"
                icon="pi pi-send"
                :loading="isTransferring"
            />
        </template>
    </ResponsiveDialog>
</template>
