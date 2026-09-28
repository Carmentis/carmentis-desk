<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
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
    <div class="flex items-center justify-center flex-col h-full p-4">
        <div v-if="logoUrl" class="mb-4 flex justify-center">
            <img :src="logoUrl" class="w-20 h-20 rounded-full border-8 border-gray-100 bg-white p-2 object-contain" alt=""/>
        </div>

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
                            :disabled="!walletPrivateKey"
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
