<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {computedAsync} from '@vueuse/core';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import {useToast} from 'primevue/usetoast';
import type {CredentialIssuance} from './CredentialIssuanceRequestType.ts';
import {parseCompactSdJwt, SdJwtParseError} from '../../../../composables/credentials/parseSdJwtToken.ts';
import {useWalletByPublicKey} from '../../../../composables/useWalletByPublicKey.ts';
import {useActivityRecorder} from '../../../../composables/useWalletActivity.ts';
import {activityEvents} from '../../../../types/activity.ts';
import {useWalletStore} from '../../../../stores/walletStore.ts';
import {JwkSignatureKeyExporter} from '../../../../utils/jwk-signature-key-exporter.ts';
import RpcRequestLayout from '../../RpcRequestLayout.vue';
import RpcWalletPicker from '../../RpcWalletPicker.vue';
import SkeletonBlock from '../../../ui/SkeletonBlock.vue';
import StatusBadge from '../../../ui/StatusBadge.vue';
import JsonBlock from '../../../ui/JsonBlock.vue';
import CredentialClaims from '../../../../views/home/wallet/credentials/CredentialClaims.vue';

const props = defineProps<{ params: CredentialIssuance }>();

const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const toast = useToast();
const {recordActivity} = useActivityRecorder();
const {chosenWallet, wallets} = useWalletByPublicKey(() => props.params.publicKey);
const chosenWalletStore = computed(() => chosenWallet.value ? useWalletStore(chosenWallet.value.id) : null);

// ---- the credential, decoded once; a token that cannot be read can never be added ----
type ParseResult = {ok: true; credential: Awaited<ReturnType<typeof parseCompactSdJwt>>} | {ok: false; error: string};

const parsed = computedAsync<ParseResult | null>(async () => {
    try {
        return {ok: true, credential: await parseCompactSdJwt(props.params.credential)};
    } catch (e) {
        console.error('Unreadable credential received:', e);
        return {ok: false, error: e instanceof SdJwtParseError ? e.message : 'The credential could not be read.'};
    }
}, null);

const payload = computed(() => (parsed.value?.ok ? parsed.value.credential.jwt.payload : null));
const issuer = computed(() => payload.value?.iss);

const name = ref('');
watch(payload, (p) => {
    if (p && !name.value) name.value = p.vct;
}, {immediate: true});

// ---- readable claims ----
function previewValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return `[ ${value.length} item${value.length !== 1 ? 's' : ''} ]`;
    if (typeof value === 'object') return `{ ${Object.keys(value as object).length} keys }`;
    const text = String(value);
    return text.length > 60 ? text.slice(0, 60) + '…' : text;
}

const claimEntries = computed(() => {
    if (!parsed.value?.ok) return [];
    return parsed.value.credential.disclosures
        .filter((d) => d.key !== undefined)
        .map((d) => ({
            id: d._digest,
            key: d.key as string,
            preview: previewValue(d.value),
            full: typeof d.value === 'object' && d.value !== null ? JSON.stringify(d.value, null, 2) : String(d.value),
            expandable: typeof d.value === 'object' && d.value !== null || String(d.value).length > 60,
        }));
});

// ---- holder check: a warning only, the user decides ----
const walletDid = computedAsync(async () => {
    const pk = chosenWalletStore.value?.walletPublicKey.value;
    if (!pk) return undefined;
    try {
        return await JwkSignatureKeyExporter.exportPublicKeyAsDidJwk(pk);
    } catch {
        return undefined; // this kind of key has no did:jwk: nothing to compare
    }
}, undefined);

const isForAnotherIdentity = computed(() => {
    const subject = payload.value?.sub;
    return !!subject && !!walletDid.value && subject !== walletDid.value;
});

const isAlreadyInWallet = computed(() =>
    !!chosenWalletStore.value?.walletCredentials.value.some((c) => c.sdjwt === props.params.credential.trim()),
);

// ---- approval ----
const isProcessing = ref(false);
const canAccept = computed(() => !!parsed.value?.ok && !!chosenWalletStore.value && !isProcessing.value);

async function accept() {
    if (!parsed.value?.ok || !chosenWalletStore.value || !chosenWallet.value) return;
    isProcessing.value = true;
    try {
        const credentialName = name.value.trim() || parsed.value.credential.jwt.payload.vct;
        if (!isAlreadyInWallet.value) {
            await chosenWalletStore.value.createSdJwtCredential(credentialName, props.params.credential.trim());
            void recordActivity(
                activityEvents.credentialReceived({credentialName, issuer: issuer.value}),
                chosenWallet.value.id,
            );
        }
        toast.add({severity: 'success', summary: 'Credential added', detail: `"${credentialName}" added to your wallet`, life: 3000});
        emit('done', {accepted: true});
    } catch (e) {
        console.error('Error adding the credential:', e);
        toast.add({severity: 'error', summary: 'Could not add the credential', detail: e instanceof Error ? e.message : undefined, life: 5000});
    } finally {
        isProcessing.value = false;
    }
}
</script>

<template>
    <RpcRequestLayout
        wide
        title="Add a credential"
        description="An application wants to add a credential to your wallet. Nothing is saved unless you accept."
        icon="pi-id-card"
        :requester="issuer ? { label: 'Issued by (as stated in the credential)', value: issuer } : undefined"
    >
        <SkeletonBlock v-if="!parsed" :lines="3" label="Reading the credential…" />

        <Message v-else-if="!parsed.ok" severity="error" :closable="false">
            This credential cannot be added. {{ parsed.error }}
        </Message>

        <template v-else>
            <RpcWalletPicker v-model="chosenWallet" :wallets="wallets" label="Add to wallet" />

            <div>
                <label for="credential-name" class="mb-1 block text-sm font-medium text-fg">Name</label>
                <InputText id="credential-name" v-model="name" fluid autocomplete="off" :disabled="isProcessing" />
            </div>

            <Message v-if="isForAnotherIdentity" severity="warn" :closable="false">
                This credential was issued to a different identity than the selected wallet. You can still add
                it, but you may not be able to use it with this wallet.
            </Message>
            <Message v-if="isAlreadyInWallet" severity="info" :closable="false">
                This credential is already in this wallet. Accepting will not add it twice.
            </Message>

            <div>
                <h3 class="mb-2 text-sm text-fg-muted">What this credential contains</h3>
                <CredentialClaims v-if="claimEntries.length > 0" :entries="claimEntries" tone="accent" />
                <p v-else class="text-sm text-fg-muted">No readable claims.</p>
            </div>

            <StatusBadge tone="neutral" icon="pi-verified" label="SD-JWT" />
            <JsonBlock title="Technical details" :value="{ credentialType: params.credentialType, issuer, subject: payload?.sub }" />
        </template>

        <template #actions>
            <Button label="Decline" severity="secondary" outlined :disabled="isProcessing" @click="emit('reject')" />
            <Button
                label="Add credential"
                icon="pi pi-plus"
                :loading="isProcessing"
                :disabled="!canAccept"
                @click="accept"
            />
        </template>
    </RpcRequestLayout>
</template>
