<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import CredentialCard from './CredentialCard.vue';
import PageHeader from '../../../../components/ui/PageHeader.vue';
import ResponsiveDialog from '../../../../components/ui/ResponsiveDialog.vue';
import ConfirmActionDialog from '../../../../components/ui/ConfirmActionDialog.vue';
import EmptyState from '../../../../components/ui/EmptyState.vue';
import JsonBlock from '../../../../components/ui/JsonBlock.vue';
import FieldNameAndDescription from '../../../../components/utils/FieldNameAndDescription.vue';
import { parseCompactSdJwt, SdJwtParseError } from '../../../../composables/credentials/parseSdJwtToken.ts';
import {useCurrentWallet} from "../../../../composables/useCurrentWallet.ts";
import {VerifiableCredential} from "../../../../types/types.ts";

const router = useRouter();
const route = useRoute();
const {wallet, walletCredentials, createSdJwtCredential, deleteCredential} = useCurrentWallet()
const toast = useToast();

// Shown as a page of its own (bottom navigation) or as a tab of the wallet page.
const isStandalone = computed(() => route.name === 'wallet-credentials');

// ---------------------------------------------------------------------------
// Add credential dialog
// ---------------------------------------------------------------------------
const showAddDialog = ref(false);

const sdJwtName = ref('');
const sdJwtToken = ref('');
const sdJwtParsing = ref(false);

function openAddDialog() {
    sdJwtName.value = '';
    sdJwtToken.value = '';
    addSubmitted.value = false;
    showAddDialog.value = true;
}

const addSubmitted = ref(false);
const tokenError = computed(() =>
    addSubmitted.value && !sdJwtToken.value.trim() ? 'Paste the SD-JWT token of the credential.' : '',
);

async function handleAddSubmit() {
    addSubmitted.value = true;
    if (tokenError.value) return;

    sdJwtParsing.value = true;
    try {
        const token = sdJwtToken.value.trim();
        const parsed = await parseCompactSdJwt(token);

        /* TODO
        const sub = parsed.jwt.payload.sub as string | undefined;
        if (sub !== undefined) {
            const walletDid = await walletStore.getDidJwk(walletId.value);
            if (sub !== walletDid) {
                throw new SdJwtParseError(
                    `Credential subject does not match this wallet's identity.\n\nExpected: ${walletDid}\nFound: ${sub}`,
                );
            }
        }
         */

        const name = sdJwtName.value.trim() || parsed.jwt.payload.vct;
        await createSdJwtCredential(name, token)
        toast.add({
            severity: 'success',
            summary: 'Credential added',
            detail: `"${name}" added successfully`,
            life: 3000,
        });
        showAddDialog.value = false;
    } catch (err) {
		console.error(err);
        const detail =
            err instanceof SdJwtParseError ? err.message : 'An unexpected error occurred while parsing the token.';
        toast.add({
            severity: 'error',
            summary: 'Parse error',
            detail,
            life: 5000,
        });
    } finally {
        sdJwtParsing.value = false;
    }
}

// ---------------------------------------------------------------------------
// Delete credential (confirmation owned here)
// ---------------------------------------------------------------------------
const credentialToDelete = ref<VerifiableCredential | null>(null);
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

function requestDelete(credentialId: number) {
    const credential = walletCredentials.value.find((c) => c.id === credentialId);
    if (!credential) return;
    credentialToDelete.value = credential;
    showDeleteDialog.value = true;
}

async function confirmDelete() {
    if (!credentialToDelete.value) return;
    isDeleting.value = true;
    try {
        await deleteCredential(credentialToDelete.value.id);
        toast.add({
            severity: 'success',
            summary: 'Credential deleted',
            life: 2000,
        });
        showDeleteDialog.value = false;
    } finally {
        isDeleting.value = false;
    }
}

// ---------------------------------------------------------------------------
// Browse credential (dialog owned here)
// ---------------------------------------------------------------------------
const showBrowseDialog = ref(false);
const browsingCredential = ref<VerifiableCredential | null>(null);

const MAX_BROWSE_LENGTH = 100_000;

const prettyBrowseJson = computed(() => {
    if (!browsingCredential.value) return '';
    try {
        const parsed = JSON.parse(browsingCredential.value.sdjwt);
        const full = JSON.stringify(parsed, null, 2);
        return full.length > MAX_BROWSE_LENGTH ? full.slice(0, MAX_BROWSE_LENGTH) + '\n\n… (truncated)' : full;
    } catch {
        return browsingCredential.value.sdjwt;
    }
});

function requestBrowse(credentialId: number) {
    browsingCredential.value = walletCredentials.value.find((c) => c.id === credentialId) ?? null;
    if (browsingCredential.value) showBrowseDialog.value = true;
}

watch(showBrowseDialog, (open) => {
    if (!open) browsingCredential.value = null;
});
</script>

<template>
    <div v-if="wallet" class="space-y-4">
        <PageHeader v-if="isStandalone" title="Credentials" :subtitle="wallet.name" />

        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 v-if="!isStandalone" class="text-lg font-semibold text-fg">Credentials</h2>
            <span v-else />
            <Button @click="openAddDialog" label="Add credential" icon="pi pi-plus" />
        </div>

        <!-- Empty state -->
        <div v-if="walletCredentials.length === 0" class="rounded-card border border-line bg-surface shadow-card">
            <EmptyState
                icon="pi-id-card"
                title="No credentials yet"
                description="Credentials issued to you are stored here and can be presented when a service asks for them."
            >
                <Button @click="openAddDialog" label="Add credential" icon="pi pi-plus" />
            </EmptyState>
        </div>

        <!-- Credentials grid -->
        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CredentialCard
                v-for="credential in walletCredentials"
                :key="credential.id"
                :credential="credential"
                @delete="requestDelete"
                @browse="requestBrowse"
            />
        </div>

        <!-- Add Credential Dialog -->
        <ResponsiveDialog v-model:visible="showAddDialog" header="Add SD-JWT credential" size="lg" :closable="!sdJwtParsing">
            <form id="add-credential-form" class="space-y-5" novalidate @submit.prevent="handleAddSubmit">
                <div>
                    <FieldNameAndDescription
                        name="Name (optional)"
                        description="Defaults to the credential type."
                        input-id="sd-jwt-name"
                    />
                    <InputText
                        id="sd-jwt-name"
                        v-model="sdJwtName"
                        fluid
                        autocomplete="off"
                        placeholder="e.g. Employee badge"
                    />
                </div>
                <div>
                    <FieldNameAndDescription
                        name="SD-JWT token"
                        description="The compact token you received from the issuer."
                        input-id="sd-jwt-token"
                        required
                    />
                    <Textarea
                        id="sd-jwt-token"
                        v-model="sdJwtToken"
                        fluid
                        autocomplete="off"
                        spellcheck="false"
                        class="font-mono text-xs"
                        rows="8"
                        placeholder="eyJ…~WyJ…~"
                        :invalid="!!tokenError"
                        :aria-invalid="!!tokenError"
                        aria-describedby="sd-jwt-token-error"
                    />
                    <p v-if="tokenError" id="sd-jwt-token-error" class="mt-1 text-sm text-danger">{{ tokenError }}</p>
                </div>
            </form>

            <template #footer>
                <Button label="Cancel" severity="secondary" outlined :disabled="sdJwtParsing" @click="showAddDialog = false" />
                <Button type="submit" form="add-credential-form" label="Add" icon="pi pi-check" :loading="sdJwtParsing" />
            </template>
        </ResponsiveDialog>

        <!-- Browse Credential Dialog -->
        <ResponsiveDialog v-model:visible="showBrowseDialog" :header="browsingCredential?.name ?? 'Credential'" size="lg">
            <JsonBlock title="Credential content" :value="prettyBrowseJson" default-open />
            <template #footer>
                <Button label="Close" severity="secondary" outlined @click="showBrowseDialog = false" />
            </template>
        </ResponsiveDialog>

        <ConfirmActionDialog
            v-model:visible="showDeleteDialog"
            title="Delete credential"
            :item-name="credentialToDelete?.name ?? ''"
            :loading="isDeleting"
            @confirm="confirmDelete"
        />
    </div>

    <!-- Not Found State -->
    <div v-else class="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
            icon="pi-exclamation-triangle"
            title="Wallet not found"
            description="The wallet you are looking for does not exist."
        >
            <Button @click="router.push('/')" label="Back to wallets" icon="pi pi-home" />
        </EmptyState>
    </div>
</template>
