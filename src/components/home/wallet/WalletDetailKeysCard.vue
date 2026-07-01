<script setup lang="ts">
import InputText from "primevue/inputtext";
import Card from "primevue/card";
import SplitButton from "primevue/splitbutton";
import Password from "primevue/password";
import Divider from "primevue/divider";
import Checkbox from "primevue/checkbox";
import {computed, ref} from "vue";
import {useClipboard} from "../../../composables/useClipboard.ts";
import {computedAsync, useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";
import * as orgRepo from "../../../db/repositories/organizationRepository.ts";
import {
    CryptoEncoderFactory,
    Secp256k1PrivateSignatureKey,
    Secp256k1PublicSignatureKey,
    SignatureSchemeId
} from "@cmts-dev/carmentis-sdk-core";
import {useRoute} from "vue-router";
import {useSessionStore} from "../../../stores/sessionStore.ts";
import Select from "primevue/select";
import {useWalletStore} from "../../../stores/walletStore.ts";
import {useToast} from "primevue/usetoast";
import Button from "primevue/button";
import {match, P} from "ts-pattern";
import {Secp256k1JsonWebKeyConverter} from "../../../utils/jwk/Secp256k1JsonWebKeyConverter.ts";
import FieldNameAndDescription from "../../utils/FieldNameAndDescription.vue";
import {base64url} from "jose";
import {MenuItem} from "@tauri-apps/api/menu/menuItem";
import {JsonWebKeyFactory} from "../../../utils/jwk/JsonWebKeyFactory.ts";


const walletStore = useWalletStore();
const clipboard = useClipboard();
const sessionStore = useSessionStore();
const route = useRoute();

enum KeyFormat {
    JWK = "jwk",
    CMTS = 'cmts',
    DID_JWK = "did:jwk"
}


const walletIdString = ref(route.params.walletId);
const walletId = computed(() => Number(walletIdString.value));
console.log(`Loading keys for wallet with id ${walletIdString.value}`)

const { state: wallet, execute: fetchWallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const { state: organizations, execute: fetchOrgs } = useAsyncState(
    () => orgRepo.getOrganizationsByWalletId(walletId.value),
    [],
    { immediate: true },
);

const toast = useToast();
const {execute: checkKeyPair} = useAsyncState(
    async () => {
        if (!wallet.value) return undefined;
        let verified = false;
        const message = "Hello world!"
        try {
            const walletId = wallet.value.id;
            const {sk, pk} = await walletStore.getKeyPair(walletId, signatureScheme.value);
            const textEncoder = new TextEncoder();
            const rawMessage = textEncoder.encode(message);
            const sign = await sk.sign(rawMessage);
            verified = await pk.verify(rawMessage, sign);
        } catch (e) {
            console.error('Failed to verify key pair:', e);
        } finally {
            if (verified) {
                toast.add({
                    severity: 'success',
                    summary: `Key pair is valid`,
                    detail: `Message "${message}" has been signed and verified successfully (type ${signatureScheme.value.toString()})`,
                    life: 3000,
                })
            } else {
                toast.add({
                    severity: 'error',
                    summary: 'Key pair check failed',
                    detail: 'The key pair is invalid',
                    life: 3000,
                });
            }
        }
    },
    undefined,
)

// wallet key pair
const walletState = walletStore.state;

// chosen signature scheme
const signatureScheme = ref(walletState.signatureSchemaType);
const schemeOptions = [
    {
        label: "Secp256k1",
        value: SignatureSchemeId.SECP256K1
    },
    {
        label: "MLDSA65",
        value: SignatureSchemeId.ML_DSA_65
    }
]


// chosen format
const keyFormatOptions = ref([
    {
        label: "CMTS",
        value: KeyFormat.CMTS
    },
    {
        label: "JWK",
        value: KeyFormat.JWK
    },
    {
        label: "DID JWK",
        value: KeyFormat.DID_JWK
    }
])

const chosenKeyFormatOption = ref(keyFormatOptions.value[0]);

const chosenKeyFormatName = computed(() => chosenKeyFormatOption.value.label)
const chosenKeyFormat = computed(() => chosenKeyFormatOption.value.value)




// compute the key pair
const walletKeyPair = computedAsync(async () => {
    return match(wallet.value)
        .with(P.nullish, () => undefined)
        .otherwise(async (wallet) => {
            const {sk, pk} = await walletStore.getKeyPair(
                wallet.id,
                signatureScheme.value
            );

            return {sk, pk};
        });
})


const walletSeed = computedAsync(async () => {
    if (!wallet.value) return '';
    return sessionStore.getWalletSeed(wallet.value.id);
}, '');

// compute CMTS format
const keyPairCmtsFormat = computedAsync(async () => {
    if (!walletKeyPair.value) return { sk: '', pk: '' }
    const kp = walletKeyPair.value;
    const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    return {
        sk: await sigEncoder.encodePrivateKey(kp.sk),
        pk: await sigEncoder.encodePublicKey(kp.pk),
    };
});

const sk = computed(() => keyPairCmtsFormat.value?.sk);
const pk = computed(() => keyPairCmtsFormat.value?.pk);


// compute the JWK
const shouldDisplayPrivateKeyInJwk = ref(false);
const keyInJwk = computedAsync(async () => {
    return match({ kp: walletKeyPair.value, shouldDisplayPrivateKeyInJwk: shouldDisplayPrivateKeyInJwk.value })
        .with({ kp: P.nullish }, async () => undefined)
        .with({ kp: P.not(P.nullish) }, async ({ kp, shouldDisplayPrivateKeyInJwk }) => {
            return match(shouldDisplayPrivateKeyInJwk)
                .with(true, () => {
                    return JsonWebKeyFactory.fromCarmentisPrivateSignatureKey(kp.sk);
                })
                .with(false, () => {
                    return JsonWebKeyFactory.fromCarmentisPublicSignatureKey(kp.pk)
                })
                .exhaustive();
        })
        .otherwise(async () => undefined)
})



// compute the DID JWK
const didJwkFormat = computed(() => {
    return match(keyInJwk.value)
        .with(P.not(P.nullish), (kp) => {
            return `did:jwk:${base64url.encode(JSON.stringify(kp))}`;
        })
        .otherwise(() => undefined)
})





// Copy menu items
const copyMenuItems = computed(() => {
    const alwaysAvailableItems = {
            label: 'Copy Seed',
            icon: 'pi pi-copy',
            command: async () => {
                if (!wallet.value) return;
                const seed = await sessionStore.getWalletSeed(wallet.value.id);
                clipboard.copyToClipboard(seed, 'Seed');
            },
        };

    const extraOptions = match(chosenKeyFormat.value)
        .with(KeyFormat.CMTS, () => [
            {
                label: 'Copy Public Key',
                icon: 'pi pi-copy',
                command: () => clipboard.copyToClipboard(pk.value, 'Public key'),
            },
            {
                label: 'Copy Private Key',
                icon: 'pi pi-copy',
                command: () => clipboard.copyToClipboard(sk.value, 'Private key'),
            },
        ])
        .with(KeyFormat.JWK, () => [
            {
                label: 'Copy JWK',
                icon: 'pi pi-copy',
                command: () => {
                    if (keyInJwk.value) {
                        clipboard.copyToClipboard(JSON.stringify(keyInJwk.value), 'JWK');
                    }
                }
            },
        ])
        .with(KeyFormat.DID_JWK, () => [
            {
                label: 'Copy DID',
                icon: 'pi pi-copy',
                command: () => {
                    if (didJwkFormat.value) {
                        clipboard.copyToClipboard(JSON.stringify(didJwkFormat.value), 'DID JWK');
                    }
                }
            },
        ])
        .otherwise(() => [])

    return [alwaysAvailableItems, ...extraOptions];
});
</script>
<template>
    <!-- Wallet Keys Card -->
    <Card class="w-full">
        <template #title>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <i class="pi pi-key text-xl"></i>
                    <span>Wallet Keys</span>
                </div>
                <div class="flex gap-2">

                    <Button
                        label="Check keys"
                        icon="pi pi-check"
                        size="small"
                        aria-placeholder="Perform a self-test of keys"
                        @click="() => checkKeyPair()"
                    />


                </div>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Your cryptographic key pair and seed. Keep the private key and seed strictly
                confidential — anyone with access to them can control this wallet.
            </p>
        </template>
        <template #content>
            <div class="space-y-4">
                <div class="w-full">
                    <FieldNameAndDescription name="Private seed" description="Random from which the private key is derived"/>
                    <Password
                        v-model="walletSeed"
                        :feedback="false"
                        toggleMask
                        class="w-full"
                        width="100%"
                        input-class="w-full"
                    />
                </div>
                <div class="flex cols gap-2">
                    <div>
                        <FieldNameAndDescription name="Scheme" description="Cryptographic scheme to use."/>
                        <Select
                            size="small"
                            v-model="signatureScheme"
                            :options="schemeOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="w-10rem"
                            @change="(event) => { walletStore.setSignatureSchemaType(event.value) }"
                        />
                    </div>
                    <div>
                        <FieldNameAndDescription name="Format" description="Format of the keys"/>
                        <Select
                            required
                            v-model="chosenKeyFormatOption"
                            :options="keyFormatOptions"
                            optionLabel="label"
                            checkmark
                            placeholder="Select a language"
                            size="small"
                        />
                    </div>

                </div>
                <Divider />
                <div class="flex items-center justify-between">
                    <p class="font-bold"> Displaying your keys in {{chosenKeyFormatName}} format</p>
                    <div class="flex flex-row items-center gap-2">
                        <div v-if="chosenKeyFormat !== KeyFormat.CMTS" class="flex flex-row items-center gap-2">
                            <p>Include private key</p>
                            <Checkbox v-model="shouldDisplayPrivateKeyInJwk" binary  label="Display private key" class="mr-2"/>
                        </div>
                        <SplitButton
                            label="Copy"
                            icon="pi pi-copy"
                            :model="copyMenuItems"
                            size="small"
                        />
                    </div>

                </div>

                <div v-if="chosenKeyFormat === KeyFormat.CMTS">


                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
                        <InputText v-model="pk" :disabled="true" class="w-full" />
                    </div>
                    <div class="w-full">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Private Key</label>
                        <Password
                            v-model="sk"
                            :feedback="false"
                            toggleMask
                            class="w-full"
                            input-class="w-full"
                        />
                    </div>
                </div>


                <div v-if="chosenKeyFormat === KeyFormat.JWK">
                    <code v-if="keyInJwk">
                        {{ JSON.stringify(keyInJwk, null, 2) }}
                    </code>
                    <div v-else>
                        JWK format is not available for this key.
                    </div>
                </div>
                <div v-if="chosenKeyFormat === KeyFormat.DID_JWK">
                    <div v-if="didJwkFormat">
                        <InputText v-model="didJwkFormat" :disabled="true" class="w-full" />
                    </div>
                </div>
            </div>
        </template>
    </Card>
</template>