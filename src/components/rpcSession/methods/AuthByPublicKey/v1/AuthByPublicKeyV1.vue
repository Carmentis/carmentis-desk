<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import Button from 'primevue/button';
import {useToast} from 'primevue/usetoast';
import stringify from 'canonical-json'
import {
    CryptoEncoderFactory,
    Ed25519PrivateSignatureKey, Ed25519PublicSignatureKey, EncoderFactory, SeedEncoder, SignatureSchemeId, WalletCrypto
} from '@cmts-dev/carmentis-sdk-core';
import {useStorageStore} from '../../../../../stores/storage.ts';
import { useSessionStore } from '../../../../../stores/sessionStore.ts';
import {storeToRefs} from 'pinia';
import * as jose from 'jose';
import {JwkSignatureKeyExporter} from '../../../../../utils/jwk-signature-key-exporter.ts';
import {AuthByPublicKeyV1Params, AuthMethod} from './AuthByPublicKeyRequestTypeV1.ts';
import {useWalletStore} from "../../../../../stores/walletStore.ts";
import {JsonWebKeyFactory} from "../../../../../utils/jwk/JsonWebKeyFactory.ts";
import {match, P} from "ts-pattern";
import {DidFactory} from "../../../../../utils/did/DidFactory.ts";
import {importJWK} from "jose";
import {WalletUtils} from "../../../../../utils/WalletUtils.ts";
import {DeskLogger} from "../../../../../utils/DeskLogger.ts";
import {useAppStore} from "../../../../../stores/appStore.ts";
import RpcRequestLayout from "../../../RpcRequestLayout.vue";
import RpcWalletPicker from "../../../RpcWalletPicker.vue";
import CopyableValue from "../../../../ui/CopyableValue.vue";

const props = defineProps<{ params: AuthByPublicKeyV1Params }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const logger = DeskLogger.getLogger().getChild("authentication")
const toast = useToast();
const store = useStorageStore();
const sessionStore = useSessionStore();
const {wallets} = useAppStore();
const chosenWallet = ref(wallets.value[0]);
const chosenWalletStore = computed(() => chosenWallet.value ? useWalletStore(chosenWallet.value.id) : null)
const isProcessing = ref(false);

async function approve() {
    if (!chosenWalletStore.value) throw new Error("No wallet selected");
    isProcessing.value = true;
    try {
        const {walletPrivateKey} = chosenWalletStore.value;
        const sk = walletPrivateKey.value;
        if (!sk) throw new Error("No private key selected");
        const pk = await sk.getPublicKey();

        // encode the signature into the desired format
        const { origin, challenge, sigMethod } = props.params;
        const response = await match(sigMethod)
            .with(AuthMethod.CanonicalJson, async () => {
                const { sigEncoding, pkFormat } = props.params;

                // encode the public key into the desired format
                const carmentisSignatureKeyEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
                const encodedPk = await match({ pk, format: pkFormat })
                    .with({ format: 'cmts' }, async ({ pk }) => carmentisSignatureKeyEncoder.encodePublicKey(pk))
                    .exhaustive();

                // compute the json-payload
                const payload = {
                    sub: challenge,
                    iss: encodedPk,
                    aud: origin,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 60,
                }

                // encode the payload into the desired format
                const utf8Decoder = new TextEncoder();
                const rawPayload = utf8Decoder.encode(stringify(payload));

                // compute the signature
                const rawSignature = await sk.sign(rawPayload);

                // encode the signature in the desired format
                const b64Decoder = EncoderFactory.bytesToBase64Encoder();
                const hexDecoder = EncoderFactory.bytesToHexEncoder();
                const signature = match(sigEncoding)
                    .with(P.union('base64', 'b64'), () => b64Decoder.encode(rawSignature))
                    .with(P.union('hex', 'hexa'), () => hexDecoder.encode(rawSignature))
                    .exhaustive();


                // return the response
                return {
                    // returns both pk and publicKey for consistency
                    pk: encodedPk,
                    publicKey: encodedPk,
                    signature,
                    payload
                }
            })
            .exhaustive()

        toast.add({
            severity: 'success',
            summary: 'Authentication successful',
            detail: 'You are authenticated',
            life: 3000,
        });
        emit('done', response);
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
        icon="pi-key"
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
                icon="pi pi-key"
                :loading="isProcessing"
                @click="approve"
            />
        </template>
    </RpcRequestLayout>
</template>
