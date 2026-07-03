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
import WalletDetailTokenTransferDialog from "./WalletDetailTokenTransferDialog.vue";
import ProgressSpinner from "primevue/progressspinner";
import WalletDetailBreakdownDetailsDialog from "./WalletDetailBreakdownDetailsDialog.vue";

const route = useRoute();
const clipboard = useClipboard();
const walletId = computed(() => Number(route.params.walletId));

const accountIdQuery = useAccountIdQuery(walletId.value);
const breakdownQuery = useAccountBreakdownQuery(walletId.value);

const showBreakdownDetailsDialog = ref(false);
const showTokenTransferDialog = ref(false);
const showAccountTransactionsHistory = ref(false);
const hasError = computed(() => breakdownQuery.error.value || accountIdQuery.error.value)
const isLoading = computed(() => accountIdQuery.isLoading.value || breakdownQuery.isLoading.value)
</script>
<template>


    <!-- No account found on chain Card -->
    <Card v-if="isLoading || hasError || !breakdownQuery.data.value" class="w-full">
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl" v-if="!isLoading"></i>
                <i class="pi pi-sync text-xl" v-if="isLoading"></i>
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

    <!-- Balance Card -->
    <Card v-else-if="breakdownQuery.data.value" class="w-full">
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
                        @click="showTokenTransferDialog = true"
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
                                            accountIdQuery.data.value,
                                            'Account ID'
                                            )"
                    />
                    <Button
                        @click="() => showBreakdownDetailsDialog = true"
                        label="See Details"
                        icon="pi pi-eye"
                        size="small"
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
                    <div class="text-sm text-gray-600 font-medium mb-1">Staked</div>
                    <div class="text-2xl font-bold text-gray-900">
                        {{ breakdownQuery.data.value.getStaked() }}
                    </div>
                </div>
                <div class="flex gap-4">
                    <div class="bg-gray-50 rounded-lg p-4 w-1/2">
                        <div class="text-sm text-gray-600 font-medium mb-1">Vested</div>
                        <div class="text-2xl font-bold text-gray-900">
                            {{ breakdownQuery.data.value.getVested() }}
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4 w-1/2">
                        <div class="text-sm text-gray-600 font-medium mb-1">Escrowed</div>
                        <div class="text-2xl font-bold text-gray-900">
                            {{ breakdownQuery.data.value.getEscrowed() }}
                        </div>
                    </div>
                </div>



            </div>
        </template>
    </Card>

    <!-- dialogs -->
    <WalletDetailTokenTransferDialog v-model:isOpen="showTokenTransferDialog" />
    <WalletDetailTransactionsHistoryDialog v-model:is-open="showAccountTransactionsHistory" />
    <WalletDetailBreakdownDetailsDialog v-model:isOpen="showBreakdownDetailsDialog" />
</template>