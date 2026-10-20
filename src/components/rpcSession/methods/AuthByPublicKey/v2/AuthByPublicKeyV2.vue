<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import Button from 'primevue/button';
import {useToast} from 'primevue/usetoast';
import stringify from 'canonical-json'
import {
    CryptoEncoderFactory,
    Ed25519PrivateSignatureKey, Ed25519PublicSignatureKey, EncoderFactory,
    JsonCanonicalUtf8Signer, SeedEncoder, SignatureContext, SignatureSchemeId, WalletCrypto
} from '@cmts-dev/carmentis-sdk-core';
import {useStorageStore} from '../../../../../stores/storage.ts';
import { useSessionStore } from '../../../../../stores/sessionStore.ts';
import {storeToRefs} from 'pinia';
import * as jose from 'jose';
import {JwkSignatureKeyExporter} from '../../../../../utils/jwk-signature-key-exporter.ts';
import {AuthByPublicKeyV2Params} from './AuthByPublicKeyRequestTypeV2.ts';
import {useWalletStore} from "../../../../../stores/walletStore.ts";
import {JsonWebKeyFactory} from "../../../../../utils/jwk/JsonWebKeyFactory.ts";
import {match, P} from "ts-pattern";
import {useAppStore} from "../../../../../stores/appStore.ts";
import RpcRequestLayout from "../../../RpcRequestLayout.vue";
import RpcWalletPicker from "../../../RpcWalletPicker.vue";
import CopyableValue from "../../../../ui/CopyableValue.vue";




const props = defineProps<{ params: AuthByPublicKeyV2Params }>();
const { logoUrl } = props.params;

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const toast = useToast();
const {wallets} = useAppStore();
const chosenWallet = ref(wallets.value[0]);
const chosenWalletStore = computed(() => chosenWallet.value ? useWalletStore(chosenWallet.value.id) : null)
const walletPrivateKey = computed(() => chosenWalletStore.value?.walletPrivateKey.value);
const isProcessing = ref(false);

async function approve() {
    if (!chosenWalletStore.value) throw new Error("No wallet selected");
    isProcessing.value = true;
    try {
        const {walletPrivateKey} = chosenWalletStore.value;
        const sk = walletPrivateKey.value;
        if (!sk) throw new Error("No private key selected");
        const pk = await sk.getPublicKey();
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const encodedPk = await encoder.encodePublicKey(pk);

        // encode the signature into the desired format
        const { title, origin, challenge } = props.params;

        const now = Date.now();
        const nowPlusFiveMinutes = now + 5 * 60 * 1000; // in milliseconds
        const context: SignatureContext = {
            target: origin,
            purpose: title,
            signedAt: now,
            notValidAfter: nowPlusFiveMinutes,
            allowOnChain: false,
        }
        const signature = await (
            new JsonCanonicalUtf8Signer()
            .sign(sk, context, { challenge })
        )

        toast.add({
            severity: 'success',
            summary: 'Authentication successful',
            detail: 'You are authenticated',
            life: 3000,
        });

        console.log("signature of auth:", signature)

        emit('done', {
            // returns both pk and publicKey for consistency
            pk: encodedPk,
            publicKey: encodedPk,
            signature,
        });
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
        title="Authentication request"
        description="This application asks you to authenticate with your public key."
        icon="pi-key" :logo-url="logoUrl ?? undefined"
        :requester="{ label: 'Requesting party', value: params.origin }"
    >
        <RpcWalletPicker v-model="chosenWallet" :wallets="wallets" label="Wallet to authenticate with" />

        <div>
            <p class="mb-1 text-sm font-medium text-fg">Challenge to sign</p>
            <CopyableValue :value="params.challenge" label="challenge" :head="20" :tail="10" />
        </div>

        <template #actions>
            <Button label="Decline" severity="secondary" outlined :disabled="isProcessing" @click="emit('reject')" />
            <Button
                label="Authenticate"
                icon="pi pi-key" :disabled="!walletPrivateKey"
                :loading="isProcessing"
                @click="approve"
            />
        </template>
    </RpcRequestLayout>
</template>
