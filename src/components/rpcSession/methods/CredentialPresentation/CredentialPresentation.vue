<script setup lang="ts">
import { WalletSdJwtSigner } from '../../../../utils/WalletSdJwtSigner.ts';
import {computed, onMounted, ref, watch} from 'vue';
import type { CredentialPresentation } from './CredentialPresentationRequestType.ts';
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
import Button from 'primevue/button';
import Message from 'primevue/message';
import Select from 'primevue/select';
import RpcRequestLayout from '../../RpcRequestLayout.vue';
import RpcWalletPicker from '../../RpcWalletPicker.vue';
import StatusBadge from '../../../ui/StatusBadge.vue';
import JsonBlock from '../../../ui/JsonBlock.vue';
import CredentialClaims from '../../../../views/home/wallet/credentials/CredentialClaims.vue';
import {DeskLogger} from "../../../../utils/DeskLogger.ts";
import {WalletUtils} from "../../../../utils/WalletUtils.ts";
import {useAppStore} from "../../../../stores/appStore.ts";
import {useWalletStore} from "../../../../stores/walletStore.ts";
import {VerifiableCredential} from "../../../../types/types.ts";

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


const {wallets} = useAppStore();
const chosenWallet = ref(wallets.value[0]);
const chosenWalletStore = computed(() => chosenWallet.value ? useWalletStore(chosenWallet.value.id) : null)
const credentialsInWallet = computed(() => {
    if (chosenWalletStore.value) {
        const {walletCredentials: credentials} = chosenWalletStore.value;
        return credentials.value;
    } else {
        return [
        ];
    }
})
/*
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

 */

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
    if (!credentialsInWallet.value)
        return [];
    try {
        // extract credentials from credential objects
        const credentials = credentialsInWallet.value;
        const rawCredentials = credentials.map((credential) => credential.sdjwt);
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

// Claims as displayed: long values are truncated and can be expanded.
const revealedClaimEntries = computed(() =>
    revealedClaims.value.map((claim) => ({
        id: claim.key,
        key: claim.key,
        preview: formatValue(claim.value),
        full: typeof claim.value === 'object' && claim.value !== null
            ? JSON.stringify(claim.value, null, 2)
            : String(claim.value ?? 'null'),
        expandable: typeof claim.value === 'string' && claim.value.length > 80,
    })),
);

const isPresenting = ref(false);

async function handlePresent() {
    const credential = selectedCredential.value;
    if (!credential) return;
    if (!chosenWalletStore.value) return;
    const {walletPrivateKey: sk} = chosenWalletStore.value;
    if (!sk.value) return;

    isPresenting.value = true;
    try {
        const sdjwt = await WalletSdJwtSigner.createFromPrivateKey(sk.value);

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
    <RpcRequestLayout
        wide
        title="Presentation request"
        description="An application asks you to present a credential."
        icon="pi-send"
        :requester="{ label: 'Requested by', value: params.audience }"
    >
        <RpcWalletPicker v-model="chosenWallet" :wallets="wallets" label="Wallet to present from" />

        <!-- What is asked -->
        <section>
            <h2 class="mb-2 text-sm font-medium text-fg">Requested claims</h2>
            <div v-if="desiredClaims.length > 0" class="flex flex-wrap gap-2">
                <StatusBadge v-for="claim in desiredClaims" :key="String(claim)" tone="info" icon="pi-key" :label="String(claim)" />
            </div>
            <p v-else class="text-sm text-fg-muted">No specific claims requested: all claims will be disclosed.</p>
            <div class="mt-3">
                <StatusBadge v-if="canBeSatisfied" tone="success" label="Satisfiable" />
                <StatusBadge v-else tone="danger" label="Cannot be satisfied" />
            </div>
        </section>

        <!-- What would be shared -->
        <section>
            <div class="mb-2 flex items-center justify-between gap-2">
                <h2 class="text-sm font-medium text-fg">Credential</h2>
                <StatusBadge
                    v-if="satisfyingCredentials.length > 1"
                    tone="neutral"
                    icon="pi-clone"
                    :label="`${satisfyingCredentials.length} matches`"
                />
            </div>

            <div v-if="satisfyingCredentials.length > 0" class="space-y-4">
                <!-- Credential selector (only when multiple matches) -->
                <div v-if="satisfyingCredentials.length > 1">
                    <label for="rpc-credential" class="mb-1 block text-sm text-fg-muted">Select a credential</label>
                    <Select
                        v-model="selectedCredentialIndex"
                        input-id="rpc-credential"
                        :options="satisfyingCredentials.map((_, idx) => idx)"
                        fluid
                    >
                        <template #value="{ value }">
                            <span class="font-mono text-xs">Credential {{ value + 1 }}: {{ satisfyingCredentials[value]?.slice(0, 40) }}…</span>
                        </template>
                        <template #option="{ option }">
                            <span class="break-all font-mono text-xs">Credential {{ option + 1 }}: {{ satisfyingCredentials[option]?.slice(0, 40) }}…</span>
                        </template>
                    </Select>
                </div>

                <StatusBadge tone="neutral" icon="pi-verified" label="SD-JWT VC" />

                <div>
                    <h3 class="mb-2 text-sm text-fg-muted">Claims that will be shared</h3>
                    <CredentialClaims v-if="revealedClaimEntries.length > 0" :entries="revealedClaimEntries" tone="accent" />
                    <p v-else-if="desiredClaims.length === 0" class="text-sm text-fg-muted">All claims will be disclosed.</p>
                    <p v-else class="flex items-center gap-2 text-sm text-fg-muted" role="status">
                        <i class="pi pi-spin pi-spinner text-xs" aria-hidden="true" />
                        Loading claim values…
                    </p>
                </div>
            </div>
            <Message v-else severity="warn" :closable="false">
                No matching credential found in this wallet.
            </Message>
        </section>

        <JsonBlock title="Technical details" :value="{ audience: params.audience, nonce: params.nonce }" />

        <template #actions>
            <Button label="Reject" severity="secondary" outlined :disabled="isPresenting" @click="emit('reject')" />
            <Button
                label="Present"
                icon="pi pi-send"
                :loading="isPresenting"
                :disabled="!canBeSatisfied || !selectedCredential || !chosenWalletStore"
                @click="handlePresent"
            />
        </template>
    </RpcRequestLayout>
</template>
