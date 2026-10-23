<script setup lang="ts">
import {useActivityRecorder} from "../../../../composables/useWalletActivity.ts";
import {activityEvents} from "../../../../types/activity.ts";
import {computed, ref, watch} from 'vue';
import JsonViewer from '../../JsonViewer.vue';
import Button from 'primevue/button';
import {useToast} from 'primevue/usetoast';
import stringify from 'canonical-json'
import {
    CryptoEncoderFactory,
    EncoderFactory, JsonCanonicalUtf8Signer,
    SeedEncoder, SignatureContext,
    SignatureSchemeId,
    WalletCrypto
} from '@cmts-dev/carmentis-sdk-core';
import {useStorageStore} from '../../../../stores/storage.ts';
import { useSessionStore } from '../../../../stores/sessionStore.ts';
import {storeToRefs} from 'pinia';
import {match, P} from "ts-pattern";
import {WalletUtils} from "../../../../utils/WalletUtils.ts";
import {DeskLogger} from "../../../../utils/DeskLogger.ts";
import {SignJsonParams} from "./SignJsonRequestType.ts";
import {useAppStore} from "../../../../stores/appStore.ts";
import {useWalletStore} from "../../../../stores/walletStore.ts";
import RpcRequestLayout from "../../RpcRequestLayout.vue";
import RpcWalletPicker from "../../RpcWalletPicker.vue";
import ReadableData from "../../../ui/ReadableData.vue";
import SegmentedControl from "../../../ui/SegmentedControl.vue";
import type {SegmentedOption} from "../../../ui/types.ts";

const props = defineProps<{ params: SignJsonParams }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const params = props.params;
const {recordActivity} = useActivityRecorder();
const toast = useToast();
const {wallets} = useAppStore();
const chosenWallet = ref(wallets.value[0]);
const chosenWalletStore = computed(() => chosenWallet.value ? useWalletStore(chosenWallet.value.id) : null)
const isProcessing = ref(false);

const context = params.context;

// allowed on chain
const isRequestingAllowedOnChainDecision = typeof context.allowedOnChain === "boolean"
const shouldBeAllowedOnChain = ref(isRequestingAllowedOnChainDecision ?
    context.allowedOnChain as boolean : false
)
const purpose = ref(context.purpose);
const payload = params.payload

// The data to sign is first shown in plain words; the exact JSON is one click away.
type PayloadView = 'readable' | 'json';
const payloadView = ref<PayloadView>('readable');
const payloadViewOptions: SegmentedOption<PayloadView>[] = [
    { value: 'readable', label: 'Readable' },
    { value: 'json', label: 'JSON' },
];

/*
watch([props], async () => {
    // if the public key is not indicated in the parameter, then skip it
    const indicatedPublicKey = props.params.publicKey;
    logger.info(`Selecting the correct wallet based on the provide public key: ${indicatedPublicKey}`);
    if (!indicatedPublicKey) return;

    // start by loading all wallet seeds
    let index = 0;
    for (const wallet of wallets.value) {
        const pk = await WalletUtils.getPublicKeyFromWalletId(wallet.id);
        const encodedPk = await WalletUtils.encodePublicKey(pk);
        logger.debug(`Checking wallet ${wallet.name} with public key ${encodedPk}`);
        if (encodedPk === indicatedPublicKey) {
            break;
        } else {
            index += 1;
        }
    }

    // at this point, either the key is found or the index is still zero
    chosenWallet.value = wallets.value[index];
})

 */


async function approve() {
    if (!chosenWalletStore.value) {
        console.warn('No wallet chosen');
        return;
    }
    isProcessing.value = true;
    try {
        const {walletPrivateKey: sk} = chosenWalletStore.value;
        if (!sk.value) return;
        // create the json signer
        const context: SignatureContext = {
            signedAt: Date.now(),
            purpose: purpose.value,
        }
        const signature = await new JsonCanonicalUtf8Signer()
            .sign(sk.value, context, payload)


        toast.add({
            severity: 'success',
            summary: 'Signature done',
            detail: 'You have signed it',
            life: 3000,
        });
        void recordActivity(activityEvents.jsonSigned({purpose: purpose.value, signature: signature}), chosenWallet.value?.id);
        emit('done', { signature: signature });
    } catch (e) {
        console.error('Error approving authentication request:', e);
        throw e;
    } finally {
        isProcessing.value = false;
    }
}
</script>

<template>
    <RpcRequestLayout
        title="Signature request"
        description="An application wants you to sign some data."
        icon="pi-pencil"
        :requester="{ label: 'Purpose', value: purpose }"
    >
        <p v-if="isRequestingAllowedOnChainDecision" class="flex items-start gap-2 text-sm text-fg-muted">
            <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
            <span v-if="shouldBeAllowedOnChain === true">
                This application is requesting a signature that should be allowed on chain.
            </span>
            <span v-else>
                This application is requesting a signature that should not be allowed on chain.
            </span>
        </p>

        <RpcWalletPicker v-model="chosenWallet" :wallets="wallets" label="Wallet to sign with" />

        <div>
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-medium text-fg">Data to sign</p>
                <SegmentedControl v-model="payloadView" :options="payloadViewOptions" ariaLabel="How to display the data" />
            </div>
            <div
                v-if="payloadView === 'readable'"
                class="max-h-80 overflow-auto rounded-control border border-line bg-surface-muted p-3"
            >
                <ReadableData :data="params.payload" />
            </div>
            <JsonViewer v-else :data="params.payload" max-height="20rem" />
            <p class="mt-1 text-xs text-fg-muted">
                The readable view is a simplified display of the same data. Your signature covers the exact JSON.
            </p>
        </div>

        <template #actions>
            <Button label="Decline" severity="secondary" outlined :disabled="isProcessing" @click="emit('reject')" />
            <Button
                label="Sign"
                icon="pi pi-pencil"
                :disabled="!chosenWalletStore || !chosenWalletStore.walletPrivateKey.value"
                :loading="isProcessing"
                @click="approve"
            />
        </template>
    </RpcRequestLayout>
</template>
