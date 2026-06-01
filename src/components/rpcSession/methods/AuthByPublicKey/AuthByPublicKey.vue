<script setup lang="ts">
import {ref} from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import {useToast} from 'primevue/usetoast';
import {Ed25519PrivateSignatureKey, Ed25519PublicSignatureKey, SeedEncoder,SignatureSchemeId, WalletCrypto} from '@cmts-dev/carmentis-sdk-core';
import {useStorageStore} from '../../../../stores/storage.ts';
import { useSessionStore } from '../../../../stores/sessionStore.ts';
import {storeToRefs} from 'pinia';
import * as jose from 'jose';
import {JwkSignatureKeyExporter} from '../../../../utils/jwk-signature-key-exporter.ts';
import type {AuthByPublicKeyParams} from './AuthByPublicKeyRequestType.ts';

const props = defineProps<{ params: AuthByPublicKeyParams }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const toast = useToast();
const store = useStorageStore();
const sessionStore = useSessionStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);
const isProcessing = ref(false);

type SupportedPkFormat = 'did' | 'jwk' | 'cmts';

async function exportPublicKeyIntoFormat(publicSignatureKey: Ed25519PublicSignatureKey, format: SupportedPkFormat) {
    const jwk = await JwkSignatureKeyExporter.exportPublicKey(publicSignatureKey);
    if (format === 'jwk') {
        return jwk;
    }

    if (format === 'did') {
        return JwkSignatureKeyExporter.exportPublicKeyAsDidJwk(publicSignatureKey);
    }

    throw new Error(`Unsupported format: ${format}`);
}

async function approve() {
    isProcessing.value = true;
    try {
        const seed = await sessionStore.getWalletSeed(chosenWallet.value.id);
        const wc = WalletCrypto.fromSeed(new SeedEncoder().decode(seed));
        const sk = await wc.getDefaultAccountCrypto().getPrivateSignatureKey(SignatureSchemeId.ED25519);
        const pk = (await sk.getPublicKey()) as Ed25519PublicSignatureKey;
        const skJwk = await JwkSignatureKeyExporter.exportPrivateKey(sk);
        const pkFormat = props.params.pkFormat ?? 'did';
        const encoderPk: string | object = await exportPublicKeyIntoFormat(pk, pkFormat as SupportedPkFormat);
        const signature = await new jose.SignJWT({
            sub: props.params.b64Challenge,
            iss: pkFormat,
            aud: props.params.origin,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60,
        })
            .setProtectedHeader({ alg: 'EdDSA' })
            .sign(skJwk);

        toast.add({
            severity: 'success',
            summary: 'Authentication successful',
            detail: 'You are authenticated',
            life: 3000,
        });
        emit('done', { pk: encoderPk, signature });
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
                            {{ params.b64Challenge }}
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
