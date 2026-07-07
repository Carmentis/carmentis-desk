<script setup lang="ts">
import WalletDetailAppParticipationCard from "./WalletDetailAppParticipationCard.vue";
import {computed} from "vue";
import {ApplicationParticipation} from "../../../stores/storage.ts";
import {useAsyncState} from "@vueuse/core";
import {useRoute} from "vue-router";
import * as participationRepo from '../../../db/repositories/participationRepository';
import * as walletRepo from "../../../db/repositories/walletRepository.ts";

const route = useRoute();
const walletId = computed(() => Number(route.params.walletId));
const { state: participations } = useAsyncState(
    () => participationRepo.getAppParticipationsByWalletId(walletId.value),
    [] as ApplicationParticipation[],
    { immediate: true },
);

const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);
</script>

<template>
    <div v-if="participations.length > 0" class="space-y-4">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <i class="pi pi-box text-lg text-blue-600" />
            <h2 class="text-lg font-semibold text-gray-900">Application Ledgers</h2>
            <span class="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                {{ participations.length }}
            </span>
        </div>

        <!-- Subtitle -->
        <p class="text-sm text-gray-500">
            Applications this wallet has interacted with through the anchoring protocol. Click on a card to explore the associated virtual blockchain records.
        </p>

        <!-- Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <WalletDetailAppParticipationCard
                v-for="participation in participations"
                :key="participation.id"
                :participation="participation"
                :node-endpoint="wallet!.nodeEndpoint"
                :wallet-id="walletId"
            />
        </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16 px-6">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 mb-4">
            <i class="pi pi-inbox text-2xl text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">No Application Ledgers</h3>
        <p class="text-sm text-gray-500 max-w-sm mx-auto">
            You will see application ledgers here once this wallet interacts with applications through the anchoring protocol.
        </p>
    </div>
</template>