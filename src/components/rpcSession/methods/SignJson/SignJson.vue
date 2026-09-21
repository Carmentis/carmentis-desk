<script setup lang="ts">
import {ref, watch} from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
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

const props = defineProps<{ params: SignJsonParams }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const params = props.params;
const logger = DeskLogger.getLogger().getChild("authentication")
const toast = useToast();
const store = useStorageStore();
const sessionStore = useSessionStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);
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
    isProcessing.value = true;
    try {
        const schemeId = chosenWallet.value.schemeId ?? SignatureSchemeId.SECP256K1;
        const seed = await sessionStore.getWalletSeed(chosenWallet.value.id);
        const wc = WalletCrypto.fromSeed(new SeedEncoder().decode(seed));
        const sk = await wc.getDefaultAccountCrypto().getPrivateSignatureKey(schemeId);


        // create the json signer
        const context: SignatureContext = {
            signedAt: Date.now(),
            purpose: purpose.value,
        }
        const signature = await new JsonCanonicalUtf8Signer()
            .sign(sk, context, payload)


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
    <div class="flex items-center justify-center h-full p-4">
        <Card class="w-full max-w-md">
            <template #title>
                <div class="flex items-center gap-3">
                    <i class="pi pi-key text-3xl text-blue-500"></i>
                    <span>Signature Request</span>
                </div>
                <p class="text-sm text-gray-700 mb-5">
                    An application wants you to authenticate some data.
                </p>
            </template>

            <template #content>
                <div class="space-y-4">
                    <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                        <p class="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">
                            Purpose
                        </p>
                        <p class="text-sm font-semibold text-blue-800">
                            {{ purpose }}
                        </p>
                    </div>

                    <div>
                        <p v-if="isRequestingAllowedOnChainDecision">
                            <p v-if="shouldBeAllowedOnChain === true">
                                This application is requesting a signature that should be allowed on chain.
                            </p>
                            <p v-else-if="shouldBeAllowedOnChain === false">
                                This application is requesting a signature that should not be allowed on chain.
                            </p>
                        </p>
                        <p v-else>

                        </p>
                    </div>



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
                        <p class="text-xs text-gray-500 mb-1">Payload to sing</p>
                        <p class="text-xs font-mono text-surface-600 break-all bg-surface-50 rounded p-2">
                            {{ params.payload }}
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
