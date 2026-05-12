<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
    ApplicationLedgerVb,
    AccountCrypto,
    Utils,
    EncoderFactory,
} from '@cmts-dev/carmentis-sdk/client';
import {
    CryptoEncoderFactory,
    SignatureSchemeId,
} from '@cmts-dev/carmentis-sdk/client';
import JsonViewer from './JsonViewer.vue';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';

const props = defineProps<{
    applicationLedger: ApplicationLedgerVb;
    accountCrypto: AccountCrypto;
}>();

const height = ref<number | null>(null);
const loading = ref(false);
const error = ref<Error | null>(null);
const record = ref<any>(null);

const maxHeight = computed(() => props.applicationLedger.getHeight());
const currentHeight = computed(() => height.value ?? maxHeight.value);

const isAtStart = computed(() => currentHeight.value === 1);
const isAtEnd = computed(() => currentHeight.value === maxHeight.value);

async function loadRecord(h: number) {
    loading.value = true;
    error.value = null;
    try {
        const genesisSeed = await props.applicationLedger.getGenesisSeed();
        const actorCrypto = props.accountCrypto.deriveActorFromVbSeed(
            genesisSeed.toBytes(),
        );
        console.log(`Record navigator: Genesis seed: ${genesisSeed.toBytes()}`);

        const pk = await actorCrypto.getPublicSignatureKey(
            SignatureSchemeId.SECP256K1,
        );
        const encodedGenesisSeed = genesisSeed.encode();
        const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();

        //console.log(`Generated signature public key for genesisSeed ${encodedGenesisSeed}: ${await sigEncoder.encodePublicKey(pk)}`);
        //console.log('Application ledger:', props.applicationLedger);
        //console.log('Actor ID:', await props.applicationLedger.getActorIdByPublicSignatureKey(pk));

        record.value = await props.applicationLedger.getRecord(h, actorCrypto);
    } catch (e) {
        error.value = e instanceof Error ? e : new Error(String(e));
        console.error('Error loading record:', e);
    } finally {
        loading.value = false;
    }
}

function goToStart() {
    height.value = 1;
}

function goToPrev() {
    const newHeight = Math.max((height.value ?? currentHeight.value) - 1, 1);
    height.value = newHeight;
}

function goToNext() {
    const newHeight = Math.min(
        (height.value ?? currentHeight.value) + 1,
        maxHeight.value,
    );
    height.value = newHeight;
}

function goToEnd() {
    height.value = maxHeight.value;
}

// Load record when height changes
watch(
    currentHeight,
    (newHeight) => {
        loadRecord(newHeight);
    },
    { immediate: true },
);
</script>

<template>
    <div class="flex flex-col gap-4 h-full">
        <!-- Navigation controls -->
        <div
            class="flex justify-between items-center p-2 bg-gray-100 rounded-lg"
        >
            <span class="text-sm font-medium text-gray-700">
                Block {{ currentHeight }} / {{ maxHeight }}
            </span>
            <div class="flex gap-1">
                <Button
                    icon="pi pi-angle-double-left"
                    size="small"
                    text
                    :disabled="isAtStart"
                    @click="goToStart"
                    v-tooltip.top="'Begin'"
                />
                <Button
                    icon="pi pi-angle-left"
                    size="small"
                    text
                    :disabled="isAtStart"
                    @click="goToPrev"
                    v-tooltip.top="'Previous'"
                />
                <Button
                    icon="pi pi-angle-right"
                    size="small"
                    text
                    :disabled="isAtEnd"
                    @click="goToNext"
                    v-tooltip.top="'Next'"
                />
                <Button
                    icon="pi pi-angle-double-right"
                    size="small"
                    text
                    :disabled="isAtEnd"
                    @click="goToEnd"
                    v-tooltip.top="'End'"
                />
            </div>
        </div>

        <!-- Record viewer -->
        <div v-if="loading" class="flex flex-col gap-2">
            <Skeleton height="2rem" />
            <Skeleton height="10rem" />
        </div>
        <div
            v-else-if="error"
            class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
            Error loading record: {{ error.message }}
        </div>
        <JsonViewer v-else-if="record" :data="record" :key="currentHeight" />
    </div>
</template>
