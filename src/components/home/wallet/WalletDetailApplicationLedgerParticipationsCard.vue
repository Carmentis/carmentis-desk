<script setup lang="ts">
import Card from "primevue/card";
import WalletDetailAppParticipationCard from "./WalletDetailAppParticipationCard.vue";
import {useAccountBreakdownQuery, useAccountStateQuery} from "../../../composables/useAccountBreakdown.ts";
import {computed, watch} from "vue";
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
    <!-- Application Participations -->
    <Card v-if="participations.length > 0">
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-box text-xl"></i>
                <span>Application Ledgers ({{ participations.length }})</span>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Applications this wallet has interacted with through the anchoring protocol. Click on a card
                to explore the associated virtual blockchain records.
            </p>
        </template>
        <template #content>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <WalletDetailAppParticipationCard
                    v-for="participation in participations"
                    :key="participation.id"
                    :participation="participation"
                    :node-endpoint="wallet!.nodeEndpoint"
                    :wallet-id="walletId"
                />
            </div>
        </template>
    </Card>

    <div v-else class="flex items-center w-6/12">
        You will see here the usage of application ledgers this wallet has interacted with through the anchoring protocol.
        Since you have not interacted with any application ledgers yet, this section will be empty.
    </div>
</template>