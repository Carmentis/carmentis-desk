<script setup lang="ts">
import {ref} from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import {useToast} from 'primevue/usetoast';
import stringify from 'canonical-json'
import {
    CryptoEncoderFactory,
    Ed25519PrivateSignatureKey, Ed25519PublicSignatureKey, EncoderFactory, SeedEncoder, SignatureSchemeId, WalletCrypto
} from '@cmts-dev/carmentis-sdk-core';
import {useStorageStore} from '../../../../stores/storage.ts';
import { useSessionStore } from '../../../../stores/sessionStore.ts';
import {storeToRefs} from 'pinia';
import * as jose from 'jose';
import {JwkSignatureKeyExporter} from '../../../../utils/jwk-signature-key-exporter.ts';
import type {AuthByPublicKeyParams} from './AuthByPublicKeyRequestType.ts';
import {useWalletStore} from "../../../../stores/walletStore.ts";
import {JsonWebKeyFactory} from "../../../../utils/jwk/JsonWebKeyFactory.ts";
import {match, P} from "ts-pattern";
import {DidFactory} from "../../../../utils/did/DidFactory.ts";
import {importJWK} from "jose";

const props = defineProps<{ params: AuthByPublicKeyParams }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const toast = useToast();
const store = useStorageStore();
const sessionStore = useSessionStore();
const {state} = useWalletStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);
const isProcessing = ref(false);


async function approve() {
    isProcessing.value = true;
    try {
        const schemeId = state.signatureSchemaType;
        const seed = await sessionStore.getWalletSeed(chosenWallet.value.id);
        const wc = WalletCrypto.fromSeed(new SeedEncoder().decode(seed));
        const sk = await wc.getDefaultAccountCrypto().getPrivateSignatureKey(schemeId);
        const pk = await sk.getPublicKey();

        // encode the public key into the desired format
        const carmentisSignatureKeyEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const encodedPk = await match({ pk, format: props.params.pkFormat })
            .with({ format: 'cmts' }, async ({ pk }) => carmentisSignatureKeyEncoder.encodePublicKey(pk))
            .exhaustive();

        // compute the json-payload
        const { challenge, origin } = props.params
        const payload = {
            sub: challenge,
            iss: encodedPk,
            aud: origin,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60,
        }


        // encode the signature into the desired format
        const { sigFormat } = props.params;
        const rawSignature = await match(sigFormat)
            .with('canonical-json', async () => {
                // encode the payload into the desired format
                const utf8Decoder = new TextEncoder();
                const rawPayload = utf8Decoder.encode(stringify(payload));

                // compute the signature
                return await sk.sign(rawPayload);
            })
            .exhaustive()

        // encode the signature in the desired format
        const b64Decoder = EncoderFactory.bytesToBase64Encoder();
        const hexDecoder = EncoderFactory.bytesToHexEncoder();
        const sigEncoding = props.params.sigEncoding;
        const signature = match(sigEncoding)
            .with('base64', () => b64Decoder.encode(rawSignature))
            .with('hex', () => hexDecoder.encode(rawSignature))
            .exhaustive()



        /*
        const skJwk = await JsonWebKeyFactory.fromCarmentisPrivateSignatureKey(sk);
        const signingKey = await importJWK(skJwk, skJwk.alg);
        const pkFormat = props.params.pkFormat ?? 'did';
        //const encoderPk = await exportPublicKeyIntoFormat(pk, pkFormat as SupportedPkFormat);

        const encoderPk = await match({ pk, format: pkFormat })
            .with({ format: 'cmts' }, async ({ pk }) => carmentisSignatureKeyEncoder.encodePublicKey(pk))
            .with({ format: 'did' }, async ({ pk }) => DidFactory.fromJsonWebKey(
                await JsonWebKeyFactory.fromCarmentisPublicSignatureKey(pk)
            ))
            .exhaustive();

        const alg = match(schemeId)
            .with(SignatureSchemeId.SECP256K1, () => 'ES256K')
            .with(SignatureSchemeId.ED25519, () => 'EdDSA')
            .otherwise(() => { throw new Error(`Unsupported signature scheme: ${schemeId}`); });

        const signature = await new jose.SignJWT({
            sub: props.params.b64Challenge,
            iss: pkFormat,
            aud: props.params.origin,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60,
        })
            .setProtectedHeader({ alg })
            .sign(signingKey);

         */

        toast.add({
            severity: 'success',
            summary: 'Authentication successful',
            detail: 'You are authenticated',
            life: 3000,
        });
        emit('done', { pk: encodedPk, signature, scheme: schemeId, payload });
    } catch (e) {
        console.error('Error approving authentication request:', e);
        throw e;
    } finally {
        isProcessing.value = false;
    }
}
</script>

<template>
    <div class="flex items-center justify-center h-full p-4">
        <Card class="w-full max-w-md">
            <template #title>
                <div class="flex items-center gap-3">
                    <i class="pi pi-key text-3xl text-blue-500"></i>
                    <span>Authentication Request</span>
                </div>
            </template>

            <template #content>
                <div class="space-y-4">
                    <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                        <p class="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Requesting party</p>
                        <p class="text-sm font-semibold text-blue-800">
                            {{ params.origin }}
                        </p>
                    </div>

                    <p class="text-sm text-gray-700">
                        This application is requesting you to authenticate with your public key.
                    </p>

                    <div>
                        <p class="text-xs text-gray-500 mb-1">Wallet for authentication</p>
                        <Dropdown
                            v-model="chosenWallet"
                            :options="wallets"
                            optionLabel="name"
                            placeholder="Choose a wallet"
                            class="w-full"
                        >
                            <template #value="slotProps">
                                <div v-if="slotProps.value" class="flex items-center gap-2">
                                    <i class="pi pi-wallet text-surface-500"></i>
                                    <span>{{ slotProps.value.name }}</span>
                                </div>
                                <span v-else class="text-surface-500">
                                    {{ slotProps.placeholder }}
                                </span>
                            </template>
                            <template #option="slotProps">
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-wallet text-surface-500"></i>
                                    <div>
                                        <div class="font-semibold">
                                            {{ slotProps.option.name }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Dropdown>
                    </div>

                    <div>
                        <p class="text-xs text-gray-500 mb-1">Challenge to sign</p>
                        <p class="text-xs font-mono text-surface-600 break-all bg-surface-50 rounded p-2">
                            {{ params.challenge }}
                        </p>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <Button
                            label="Decline"
                            severity="secondary"
                            outlined
                            @click="emit('reject')"
                            :disabled="isProcessing"
                            class="flex-1"
                        />
                        <Button
                            label="Authenticate"
                            severity="primary"
                            @click="approve"
                            :loading="isProcessing"
                            class="flex-1"
                        />
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>
