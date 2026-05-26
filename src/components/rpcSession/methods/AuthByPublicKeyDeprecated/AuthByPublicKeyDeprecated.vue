<script setup lang="ts">
import { CryptoEncoderFactory, SeedEncoder, WalletCrypto } from '@cmts-dev/carmentis-sdk-core';
import { ref } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import { useToast } from 'primevue/usetoast';
import { useStorageStore } from '../../../../stores/storage.ts';
import { storeToRefs } from 'pinia';
import type { AuthByPublicKeyDeprecatedParams } from './AuthByPublicKeyDeprecatedRequestType.ts';

const props = defineProps<{ params: AuthByPublicKeyDeprecatedParams }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const toast = useToast();
const store = useStorageStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);
const isProcessing = ref(false);

async function approve() {
    isProcessing.value = true;
    try {
        const selectedWallet = chosenWallet.value;
        const seed = selectedWallet.seed;
        const seedEncoder = new SeedEncoder();
        const walletSeed = WalletCrypto.fromSeed(seedEncoder.decode(seed));
        const privateSignatureKey = walletSeed.getPrivateSignatureKey();
        const publicKey = await privateSignatureKey.getPublicKey();
        const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const testEncoder = new TextEncoder();
        const signature = await privateSignatureKey.sign(
            testEncoder.encode(props.params.base64EncodedChallenge),
        );

        toast.add({
            severity: 'success',
            summary: 'Authentication successful',
            detail: 'You are authenticated',
            life: 3000,
        });
        emit('done', {
            publicKey: await sigEncoder.encodePublicKey(publicKey),
            signature: sigEncoder.encodeSignature(signature),
        });
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
                    <p class="text-sm text-gray-700 mb-2">
                        An application is requesting your authorization to authenticate with your public key.
                    </p>

                    <div>
                        <p class="text-xs text-gray-500 mb-1">Wallet for authentication</p>
                        <Dropdown
                            id="walletSelect"
                            v-model="chosenWallet"
                            :options="wallets"
                            optionLabel="name"
                            placeholder="Choose a wallet for auth"
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
                                        <div class="text-xs text-surface-500">
                                            {{ slotProps.option.nodeEndpoint }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Dropdown>
                    </div>

                    <div>
                        <p class="text-xs text-gray-500 mb-1">Message to sign</p>
                        <p>{{ params.base64EncodedChallenge }}</p>
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
