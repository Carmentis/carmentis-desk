<script setup lang="ts">
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

const props = defineProps<{ params: SignJsonParams }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const params = props.params;
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
            <p class="mb-1 text-sm font-medium text-fg">Payload to sign</p>
            <JsonViewer :data="params.payload" max-height="16rem" />
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
