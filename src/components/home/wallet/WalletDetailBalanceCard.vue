<script setup lang="ts">
import InputText from "primevue/inputtext";
import Card from "primevue/card";
import SplitButton from "primevue/splitbutton";
import Password from "primevue/password";
import Button from "primevue/button";
import {
    useAccountBreakdownQuery,
    useAccountIdQuery,
    useAccountStateQuery
} from "../../../composables/useAccountBreakdown.ts";
import {computed, ref, watch} from "vue";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import {useStorageStore} from "../../../stores/storage.ts";
import {useOnChainStore} from "../../../stores/onchain.ts";
import {useSessionStore} from "../../../stores/sessionStore.ts";
import {useConfirm} from "primevue/useconfirm";
import {computedAsync, useAsyncState} from "@vueuse/core";
import {
    CMTSToken,
    CryptoEncoderFactory, EncoderFactory,
    SeedEncoder,
    SignatureSchemeId,
    WalletCrypto
} from "@cmts-dev/carmentis-sdk-core";
import {useWalletStore} from "../../../stores/walletStore.ts";
import {useClipboard} from "../../../composables/useClipboard.ts";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";
import Message from "primevue/message";
import Dialog from "primevue/dialog";
import WalletDetailTransactionsHistoryDialog
    from "./components/transactionsHistory/WalletDetailTransactionsHistoryDialog.vue";

const toast = useToast();
const route = useRoute();
const clipboard = useClipboard();
const onChainStore = useOnChainStore();
const walletId = computed(() => Number(route.params.walletId));

const accountIdQuery = useAccountIdQuery(walletId.value);
const accountStateQuery = useAccountStateQuery(walletId.value);
const breakdownQuery = useAccountBreakdownQuery(walletId.value);


const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);


// transfer dialog
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

function openTransferDialog() {
    transferPublicKey.value = '';
    transferAmount.value = '';
    showTransferDialog.value = true;
}

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

const showAccountTransactionsHistory = ref(false);
</script>
<template>


    <!-- No account found on chain Card -->
    <Card v-if="breakdownQuery.error.value || accountIdQuery.error.value">
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl"></i>
                <span>Balance</span>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Your on-chain token holdings broken down by spendable, vested, and staked amounts.
            </p>
        </template>
        <template #content>
            <div class="text-center py-12">
                <i class="pi pi-exclamation-circle text-3xl text-amber-500 mb-2"></i>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">No account found</h1>
                <p class="text-gray-600 text-sm">Purchase tokens to see your balance.</p>
            </div>
        </template>
    </Card>

    <!-- Balance Card Loading -->
    <Card v-else-if="accountIdQuery.isLoading.value || breakdownQuery.isLoading.value">
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl"></i>
                <span>Balance</span>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Your on-chain token holdings broken down by spendable, vested, and staked amounts.
            </p>
        </template>
        <template #content>
            <div class="grid grid-cols-1 gap-4">
                <div class="bg-gray-50 rounded-lg p-4 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div class="h-8 bg-gray-200 rounded w-24"></div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div class="h-8 bg-gray-200 rounded w-24"></div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div class="h-8 bg-gray-200 rounded w-24"></div>
                </div>
            </div>
        </template>
    </Card>

    <!-- Balance Card -->
    <Card v-else-if="breakdownQuery.data.value">
        <template #title>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <i class="pi pi-wallet text-xl"></i>
                    <span>Balance</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                                    <span v-if="breakdownQuery.dataUpdatedAt.value" class="text-xs text-gray-500">
                                        {{ new Date(breakdownQuery.dataUpdatedAt.value).toLocaleString() }}
                                    </span>
                    <Button
                        @click="openTransferDialog"
                        label="Transfer"
                        icon="pi pi-send"
                        size="small"
                    />
                    <Button
                        @click="() => showAccountTransactionsHistory = true"
                        label="History"
                        icon="pi pi-clock"
                        size="small"
                    />
                    <Button
                        v-if="!!accountIdQuery.data && !!accountIdQuery.data.value"
                        label="Copy Account ID"
                        icon="pi pi-copy"
                        size="small"
                        @click="clipboard.copyToClipboard(
                                            EncoderFactory.bytesToHexEncoder()
                                            .encode(accountIdQuery.data.value)
                                            .toUpperCase(),
                                            'Account ID'
                                            )"
                    />
                </div>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Your on-chain token holdings broken down by spendable, vested, and staked amounts.
            </p>
        </template>
        <template #content>
            <div class="flex flex-col grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-600 font-medium mb-1">Spendable</div>
                    <div class="text-2xl font-bold text-gray-900">
                        {{ breakdownQuery.data.value.getSpendable() }}
                    </div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-600 font-medium mb-1">Vested</div>
                    <div class="text-2xl font-bold text-gray-900">
                        {{ breakdownQuery.data.value.getVested() }}
                    </div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-600 font-medium mb-1">Staked</div>
                    <div class="text-2xl font-bold text-gray-900">
                        {{ breakdownQuery.data.value.getStaked() }}
                    </div>
                </div>
            </div>
        </template>
    </Card>


    <!-- Transfer Dialog -->
    <Dialog v-model:visible="showTransferDialog" header="Transfer Tokens" modal class="w-full max-w-md">
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


    <!-- dialogs -->
    <WalletDetailTransactionsHistoryDialog v-model:is-open="showAccountTransactionsHistory" />
</template>