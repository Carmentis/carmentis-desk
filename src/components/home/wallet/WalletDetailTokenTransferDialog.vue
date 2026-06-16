<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useRoute} from "vue-router";
import {useOnChainStore} from "../../../stores/onchain.ts";
import {computed, ref, watch} from "vue";
import {useWalletStore} from "../../../stores/walletStore.ts";
import {CMTSToken, CryptoEncoderFactory} from "@cmts-dev/carmentis-sdk-core";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Button from "primevue/button";

const toast = useToast();
const route = useRoute();
const onChainStore = useOnChainStore();
const walletId = computed(() => Number(route.params.walletId));



// transfer dialog
const isOpen = defineModel<boolean>('isOpen');
const walletStore = useWalletStore();
const isCreatingNewAccount = ref<boolean | undefined>(undefined);
const showTransferDialog = ref(false);
const transferPublicKey = ref('');
const transferAmount = ref('');
watch(transferPublicKey, async () => {
    try {
        // attempt to parse the public key
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const pk = await encoder.decodePublicKey(transferPublicKey.value);
        isCreatingNewAccount.value = !(await walletStore.isAccountFoundByPublicKey(walletId.value, pk));
    } catch (e) {
        isCreatingNewAccount.value = undefined;
    }
});


async function submitTransferDialog() {
    if (!transferPublicKey.value) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Public key is required',
            life: 3000,
        });
        return;
    }
    if (!transferAmount.value || Number(transferAmount.value) <= 0) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Valid amount is required',
            life: 3000,
        });
        return;
    }

    try {
        const amount = CMTSToken.createCMTS(Number(transferAmount.value));
        await onChainStore.transferTokens({
            walletId: walletId.value,
            recipientPublicKey: transferPublicKey.value,
            amount: amount,
        });
        showTransferDialog.value = false;
    } catch (e) {
        console.error('Transfer failed:', e);
    }
}
</script>
<template>
    <!-- Transfer Dialog -->
    <Dialog v-model:visible="isOpen" header="Transfer Tokens" modal class="w-full max-w-md">
        <div class="space-y-4">
            <div v-if="isCreatingNewAccount === true">
                <Message>You are creating a new account</Message>
            </div>
            <div v-if="isCreatingNewAccount === false">
                <Message>The account has been found online.</Message>
            </div>
            <div>
                <label for="transfer-public-key" class="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Public Key
                    <span class="text-red-500">*</span>
                </label>
                <InputText
                    id="transfer-public-key"
                    v-model="transferPublicKey"
                    placeholder="Enter recipient public key"
                    class="w-full"
                />
            </div>
            <div>
                <label for="transfer-amount" class="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                    <span class="text-red-500">*</span>
                </label>
                <InputText
                    id="transfer-amount"
                    v-model="transferAmount"
                    type="number"
                    placeholder="Enter amount"
                    class="w-full"
                />
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="showTransferDialog = false" severity="secondary" outlined />
                <Button label="Transfer" @click="submitTransferDialog" icon="pi pi-send" />
            </div>
        </template>
    </Dialog>
</template>