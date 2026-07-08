<script setup lang="ts">
import { WalletSdJwtSigner } from '../../../../utils/WalletSdJwtSigner.ts';
import {computed, onMounted, ref, watch} from 'vue';
import type { CredentialPresentation } from './CredentialPresentationRequestType.ts';
import DropdownWalletSelection from '../../../home/wallet/DropdownWalletSelection.vue';
import { useStorageStore } from '../../../../stores/storage.ts';
import { storeToRefs } from 'pinia';
import { useAsyncState } from '@vueuse/core';
import * as credentialRepo from '../../../../db/repositories/credentialRepository';
import { DcqlQuery, DcqlQueryResult } from 'dcql';
import { SdJwtUtils } from '../../../../utils/SdJwtUtils.ts';
import { computedAsync } from '@vueuse/core';
import { convertSdJwtToDcqlCredential } from '../../../../utils/utils.ts';
import { parseSdJwtEnvelope } from '../../../../composables/credentials/useCredentialType.ts';
import { useToast } from 'primevue/usetoast';
import { useSessionStore } from '../../../../stores/sessionStore.ts';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import Dropdown from 'primevue/dropdown';
import {DeskLogger} from "../../../../utils/DeskLogger.ts";
import {WalletUtils} from "../../../../utils/WalletUtils.ts";

const logger = DeskLogger.getLogger().getChild('presentation');
const props = defineProps<{ params: CredentialPresentation }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const toast = useToast();
const sessionStore = useSessionStore();

const dcqlQuery = computed(() => {
    try {
        const query = props.params.query;
        if (DcqlQuery.parse(query)) {
            return query;
        }
        return null;
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.error(`An error occurred during the parsing of the DCQL query: ${e ?? 'Unknown error'}`);
        }
    }
});

const desiredClaims = computed(() => {
    const query = dcqlQuery.value;
    if (query === null || query === undefined) return [];
    const credentials = query.credentials;
    if (credentials.length !== 1) return [];
    const credential = credentials[0];
    const claims = credential.claims;
    if (!claims) return [];
    // @ts-ignore
    return claims.map((claim) => claim['path']).flat();
});

const store = useStorageStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);

const { state: credentialsInWallet, execute: fetchCredentials } = useAsyncState(
    async () => {
        const wallet = chosenWallet.value;
        if (!wallet) return [];
        logger.info(`Fetching credentials for wallet ${wallet.name}`);
        return credentialRepo.getCredentialsByWalletId(wallet.id)
    },
    [],
    { immediate: true },
);

watch(chosenWallet, () => fetchCredentials());
watch([props], async () => {
    // if the public key is not indicated in the parameter, then skip it
    const indicatedPublicKey = props.params.publicKey;
    if (!indicatedPublicKey) return;

    // start by loading all wallet seeds
    logger.info(`Selecting the correct wallet based on the provide public key: ${indicatedPublicKey}`);
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

const sdJwtCredentials = computedAsync(async () => {
    try {
        // extract credentials from credential objects
        const rawCredentials = credentialsInWallet.value.map((credential) => credential.data);
        logger.info(`Found ${rawCredentials.length} credentials in this wallet`)

        // performing checks
        const checks = await Promise.all(rawCredentials.map((credential) => SdJwtUtils.isSdJwt(credential)));
        const wellFormedCredentials = rawCredentials.filter((_, index) => checks[index]);

        const encodedCredentials = [];
        for (const credential of wellFormedCredentials) {
            const parsedSdjwt = await SdJwtUtils.parseSdJWt(credential);
            const encodedSdjwt = await SdJwtUtils.encodeSdJwt(parsedSdjwt);
            encodedCredentials.push(encodedSdjwt);
        }

        logger.info(`Found ${encodedCredentials.length} well-formed encoded credentials`)
        return encodedCredentials;
    } catch (e) {
        console.error(e);
        return [];
    }
});

const querySatisfactionResult = computedAsync<DcqlQueryResult | null>(async () => {
    const credentials = sdJwtCredentials.value;
    const query = dcqlQuery.value;
    if (credentials === undefined || query === undefined) {
        logger.debug(`Missing credentials or query: Aborting query`)
        return null;
    }


    logger.debug(`Querying with ${credentials.length} credentials with query: {query}`, { query })
    // @ts-ignore
    const parsedQuery = DcqlQuery.parse(query);
    DcqlQuery.validate(parsedQuery);

    const dcqlFriendlyCredentials = await Promise.all(
        credentials.map((credential) => convertSdJwtToDcqlCredential(credential)),
    );
    logger.debug(`Succesfully converted ${credentials.length} credentials to DCQL-friendly format`)
    const queryResult = DcqlQuery.query(parsedQuery, dcqlFriendlyCredentials);
    logger.info("Query result: {queryResult}", { queryResult })
    return queryResult;
});

const canBeSatisfied = computed(() => {
    return querySatisfactionResult.value?.can_be_satisfied ?? false;
});

const satisfyingCredentials = computed((): string[] => {
    const query = dcqlQuery.value;
    const queryResult = querySatisfactionResult.value;
    if (queryResult === undefined || queryResult === null || query == null) return [];

    const sdjwts = sdJwtCredentials.value;
    if (!sdjwts) return [];

    const entries = query.credentials.map((cr) => cr.id);
    if (entries.length !== 1) {
        console.warn('Only one DCQL credential request is currently supported');
        return [];
    }

    const entry = entries[0];
    const matches = queryResult.credential_matches[entry];
    if (!matches?.valid_credentials) return [];

    return matches.valid_credentials.map((vc) => sdjwts[vc.input_credential_index]).filter(Boolean);
});

const selectedCredentialIndex = ref(0);

watch(satisfyingCredentials, () => {
    selectedCredentialIndex.value = 0;
});

const selectedCredential = computed(() => satisfyingCredentials.value[selectedCredentialIndex.value] ?? null);

const selectedCredentialEnvelope = computedAsync(async () => {
    const credential = selectedCredential.value;
    if (!credential) return null;
    return parseSdJwtEnvelope(credential);
});

const revealedClaims = computed(() => {
    const envelope = selectedCredentialEnvelope.value;
    if (!envelope) return [];
    const desired = new Set(desiredClaims.value.map(String));
    return envelope.disclosures
        .filter((d) => d.key !== undefined && (desired.size === 0 || desired.has(d.key!)))
        .map((d) => ({ key: d.key!, value: d.value }));
});

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object') {
        if (Array.isArray(v)) return `[${(v as unknown[]).length} items]`;
        return `{${Object.keys(v as object).length} keys}`;
    }
    const str = String(v);
    return str.length > 80 ? str.slice(0, 80) + '…' : str;
}

const isPresenting = ref(false);

async function handlePresent() {
    const credential = selectedCredential.value;
    if (!credential) return;

    isPresenting.value = true;
    try {
        const wallet = chosenWallet.value;
        const seed = await sessionStore.getWalletSeed(wallet.id);
        const schemeId = wallet.schemeId;
        const sdjwt = await WalletSdJwtSigner.createSdJwtInstanceFromSeed(seed, schemeId);

        const claims: Record<string, boolean> = {};
        for (const claim of desiredClaims.value) {
            claims[String(claim)] = true;
        }

        const vp = await sdjwt.present(credential, claims, {
            kb: {
                payload: {
                    nonce: props.params.nonce,
                    iat: Math.floor(Date.now() / 1000),
                    aud: props.params.audience,
                },
            },
        });

        toast.add({
            severity: 'success',
            summary: 'Presentation successful',
            detail: 'The credential has been presented',
            life: 3000,
        });
        emit('done', { vp_token: vp });
    } catch (e) {
        console.error('Error presenting credential:', e);
    } finally {
        isPresenting.value = false;
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Wallet selector -->
        <div class="flex items-center gap-3">
            <span class="text-sm font-semibold">Wallet</span>
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
                            <div class="font-semibold">{{ slotProps.option.name }}</div>
                            <div class="text-xs text-surface-500">
                                {{ slotProps.option.nodeEndpoint }}
                            </div>
                        </div>
                    </div>
                </template>
            </Dropdown>
        </div>

        <!-- Two cards side by side -->
        <div class="flex gap-4">
            <!-- Left card: Presentation request -->
            <Card class="flex-1">
                <template #header>
                    <div class="flex items-center gap-2 px-4 pt-4">
                        <i class="pi pi-send text-primary"></i>
                        <span class="font-bold text-lg">Presentation Request</span>
                    </div>
                </template>
                <template #content>
                    <div class="flex flex-col gap-4">
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Audience</p>
                            <p class="font-mono text-sm mt-1">{{ params.audience }}</p>
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Nonce</p>
                            <p class="font-mono text-sm mt-1">{{ params.nonce }}</p>
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Requested Claims</p>
                            <div v-if="desiredClaims.length > 0" class="flex flex-wrap gap-2 mt-2">
                                <Tag
                                    v-for="claim in desiredClaims"
                                    :key="String(claim)"
                                    :value="String(claim)"
                                    severity="info"
                                    icon="pi pi-key"
                                />
                            </div>
                            <p v-else class="text-sm text-gray-400 mt-1">No specific claims requested</p>
                        </div>
                    </div>
                </template>
                <template #footer>
                    <Tag
                        v-if="canBeSatisfied"
                        value="Satisfiable"
                        severity="success"
                        icon="pi pi-check-circle"
                    />
                    <Tag
                        v-else
                        value="Cannot be satisfied"
                        severity="danger"
                        icon="pi pi-times-circle"
                    />
                </template>
            </Card>

            <!-- Right card: Matching credential(s) -->
            <Card class="flex-1">
                <template #header>
                    <div class="flex items-center gap-2 px-4 pt-4">
                        <i class="pi pi-id-card text-primary"></i>
                        <span class="font-bold text-lg">Credential</span>
                        <Tag
                            v-if="satisfyingCredentials.length > 1"
                            :value="`${satisfyingCredentials.length} matches`"
                            severity="secondary"
                            class="ml-auto"
                        />
                    </div>
                </template>
                <template #content>
                    <div v-if="satisfyingCredentials.length > 0" class="flex flex-col gap-4">
                        <!-- Credential selector (only when multiple matches) -->
                        <div v-if="satisfyingCredentials.length > 1">
                            <p class="text-xs font-semibold uppercase text-gray-400">Select a credential</p>
                            <Dropdown
                                v-model="selectedCredentialIndex"
                                :options="satisfyingCredentials.map((_, idx) => idx)"
                                class="w-full mt-2"
                            >
                                <template #value="{ value }">
                                    <span class="font-mono text-xs text-gray-600">
                                        {{ satisfyingCredentials[value]?.slice(0, 60) }}…
                                    </span>
                                </template>
                                <template #option="{ option }">
                                    <span class="font-mono text-xs text-gray-600 break-all">
                                        {{ satisfyingCredentials[option]?.slice(0, 60) }}…
                                    </span>
                                </template>
                            </Dropdown>
                        </div>

                        <!-- Type -->
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Type</p>
                            <div class="mt-2">
                                <Tag value="SD-JWT VC" severity="info" icon="pi pi-verified" />
                            </div>
                        </div>

                        <!-- Disclosed claims with values -->
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Disclosed Claims</p>
                            <div v-if="revealedClaims.length > 0" class="flex flex-col gap-1 mt-2">
                                <div
                                    v-for="claim in revealedClaims"
                                    :key="claim.key"
                                    class="flex items-center gap-3 rounded border border-gray-100 bg-gray-50 px-3 py-2"
                                >
                                    <span class="font-mono text-xs font-semibold text-blue-600 shrink-0">{{ claim.key }}</span>
                                    <span class="text-gray-300 text-xs">:</span>
                                    <span class="font-mono text-sm text-gray-700 truncate">{{ formatValue(claim.value) }}</span>
                                </div>
                            </div>
                            <p v-else-if="desiredClaims.length === 0" class="text-sm text-gray-400 mt-1">All claims will be disclosed</p>
                            <p v-else class="text-sm text-gray-400 mt-1 flex items-center gap-1">
                                <i class="pi pi-spin pi-spinner text-xs"></i>
                                Loading claim values…
                            </p>
                        </div>
                    </div>
                    <Message v-else severity="warn" :closable="false">
                        No matching credential found in this wallet.
                    </Message>
                </template>
                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            label="Reject"
                            severity="secondary"
                            outlined
                            icon="pi pi-times"
                            @click="emit('reject')"
                        />
                        <Button
                            label="Present"
                            icon="pi pi-send"
                            :loading="isPresenting"
                            :disabled="!canBeSatisfied || !selectedCredential"
                            @click="handlePresent"
                        />
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
