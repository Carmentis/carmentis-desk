<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStorageStore, type CredentialEntity } from '../stores/storage';
import MenuBar from 'primevue/menubar';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type { MenuItem } from 'primevue/menuitem';
import CredentialCard from './credentials/CredentialCard.vue';
import {
    parseCompactSdJwt,
    SdJwtParseError,
} from '../composables/credentials/parseSdJwtToken';

const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
const toast = useToast();
const confirm = useConfirm();

const walletId = computed(() => Number(route.params.walletId));
const wallet = computed(() =>
    storageStore.organizations.find((w) => w.id === walletId.value),
);
const credentials = computed(() => wallet.value?.credentials ?? []);

// ---------------------------------------------------------------------------
// Add credential dialog
// ---------------------------------------------------------------------------
const showAddDialog = ref(false);
const addTab = ref<'json' | 'sd-jwt'>('json');

// JSON tab state
const credentialName = ref('');
const credentialData = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

// SD-JWT tab state
const sdJwtName = ref('');
const sdJwtToken = ref('');
const sdJwtParsing = ref(false);

function openAddDialog() {
    addTab.value = 'json';
    credentialName.value = '';
    credentialData.value = '';
    sdJwtName.value = '';
    sdJwtToken.value = '';
    showAddDialog.value = true;
}

// --- JSON tab helpers ---

function triggerFileInput() {
    fileInputRef.value?.click();
}

function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!credentialName.value) {
        credentialName.value = file.name.replace(/\.[^.]+$/, '');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
            JSON.parse(text);
            credentialData.value = text;
        } catch {
            toast.add({
                severity: 'error',
                summary: 'Invalid file',
                detail: 'The file does not contain valid JSON',
                life: 3000,
            });
        }
    };
    reader.readAsText(file);

    if (fileInputRef.value) fileInputRef.value.value = '';
}

async function submitJsonTab() {
    if (!credentialName.value) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Credential name is required',
            life: 3000,
        });
        return;
    }
    if (!credentialData.value) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Credential data is required',
            life: 3000,
        });
        return;
    }
    try {
        JSON.parse(credentialData.value);
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Credential data must be valid JSON',
            life: 3000,
        });
        return;
    }
    await storageStore.addCredential(walletId.value, {
        name: credentialName.value,
        data: credentialData.value,
    });
    toast.add({
        severity: 'success',
        summary: 'Credential added',
        detail: `"${credentialName.value}" added successfully`,
        life: 3000,
    });
    showAddDialog.value = false;
}

// --- SD-JWT tab helpers ---

async function submitSdJwtTab() {
    if (!sdJwtToken.value.trim()) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'SD-JWT token is required',
            life: 3000,
        });
        return;
    }

    sdJwtParsing.value = true;
    try {
        const parsed = await parseCompactSdJwt(sdJwtToken.value);

        const name = sdJwtName.value.trim() || parsed.jwt.payload.vct;
        const data = JSON.stringify(parsed);

        await storageStore.addCredential(walletId.value, { name, data });
        toast.add({
            severity: 'success',
            summary: 'Credential added',
            detail: `"${name}" added successfully`,
            life: 3000,
        });
        showAddDialog.value = false;
    } catch (err) {
        const detail =
            err instanceof SdJwtParseError
                ? err.message
                : 'An unexpected error occurred while parsing the token.';
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

function handleAddSubmit() {
    if (addTab.value === 'json') submitJsonTab();
    else submitSdJwtTab();
}

// ---------------------------------------------------------------------------
// Delete credential (confirmation owned here)
// ---------------------------------------------------------------------------
function requestDelete(credentialId: number) {
    const credential = credentials.value.find((c) => c.id === credentialId);
    if (!credential) return;
    confirm.require({
        message: `Are you sure you want to delete "${credential.name}"? This cannot be undone.`,
        header: 'Delete Credential',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancel',
        acceptLabel: 'Delete',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await storageStore.deleteCredentialById(
                walletId.value,
                credentialId,
            );
            toast.add({
                severity: 'success',
                summary: 'Credential deleted',
                life: 2000,
            });
        },
    });
}

// ---------------------------------------------------------------------------
// Browse credential (dialog owned here)
// ---------------------------------------------------------------------------
const showBrowseDialog = ref(false);
const browsingCredential = ref<CredentialEntity | null>(null);

const MAX_BROWSE_LENGTH = 100_000;

const prettyBrowseJson = computed(() => {
    if (!browsingCredential.value) return '';
    try {
        const parsed = JSON.parse(browsingCredential.value.data);
        const full = JSON.stringify(parsed, null, 2);
        return full.length > MAX_BROWSE_LENGTH
            ? full.slice(0, MAX_BROWSE_LENGTH) + '\n\n… (truncated)'
            : full;
    } catch {
        return browsingCredential.value.data;
    }
});

function requestBrowse(credentialId: number) {
    browsingCredential.value =
        credentials.value.find((c) => c.id === credentialId) ?? null;
    if (browsingCredential.value) showBrowseDialog.value = true;
}

// ---------------------------------------------------------------------------
// Menubar
// ---------------------------------------------------------------------------
const menuItems = computed<MenuItem[]>(() => [
    {
        label: 'Add Credential',
        icon: 'pi pi-plus',
        command: openAddDialog,
    },
]);
</script>

<template>
    <div>
        <div v-if="wallet">
            <div class="space-y-4">
                <MenuBar :model="menuItems" />

                <!-- Hidden file input for JSON upload -->
                <input
                    ref="fileInputRef"
                    type="file"
                    accept=".json,application/json"
                    class="hidden"
                    @change="handleFileUpload"
                />

                <!-- Empty state -->
                <div v-if="credentials.length === 0" class="text-center py-12">
                    <div
                        class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3"
                    >
                        <i class="pi pi-id-card text-2xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-sm mb-4">No credentials yet</p>
                    <Button
                        @click="openAddDialog"
                        label="Add Credential"
                        icon="pi pi-plus"
                        size="small"
                    />
                </div>

                <!-- Credentials grid -->
                <div
                    v-else
                    class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                    <CredentialCard
                        v-for="credential in credentials"
                        :key="credential.id"
                        :credential="credential"
                        @delete="requestDelete"
                        @browse="requestBrowse"
                    />
                </div>
            </div>

            <!-- Add Credential Dialog -->
            <Dialog
                v-model:visible="showAddDialog"
                header="Add Credential"
                modal
                class="w-full max-w-lg"
            >
                <Tabs v-model:value="addTab">
                    <TabList>
                        <Tab value="json">
                            <i class="pi pi-file mr-2" />
                            JSON
                        </Tab>
                        <Tab value="sd-jwt">
                            <i class="pi pi-shield mr-2" />
                            SD-JWT Token
                        </Tab>
                    </TabList>

                    <TabPanels>
                        <!-- JSON tab -->
                        <TabPanel value="json">
                            <div class="space-y-4 pt-4">
                                <div>
                                    <label
                                        for="credential-name"
                                        class="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Name
                                        <span class="text-red-500">*</span>
                                    </label>
                                    <InputText
                                        id="credential-name"
                                        v-model="credentialName"
                                        placeholder="Enter credential name"
                                        class="w-full"
                                    />
                                </div>
                                <div>
                                    <div
                                        class="flex items-center justify-between mb-2"
                                    >
                                        <label
                                            for="credential-data"
                                            class="block text-sm font-medium text-gray-700"
                                        >
                                            JSON Data
                                            <span class="text-red-500">*</span>
                                        </label>
                                        <Button
                                            label="Upload file"
                                            icon="pi pi-upload"
                                            size="small"
                                            severity="secondary"
                                            outlined
                                            @click="triggerFileInput"
                                        />
                                    </div>
                                    <Textarea
                                        id="credential-data"
                                        v-model="credentialData"
                                        placeholder='{"key": "value"}'
                                        class="w-full font-mono text-sm"
                                        rows="10"
                                    />
                                </div>
                            </div>
                        </TabPanel>

                        <!-- SD-JWT Token tab -->
                        <TabPanel value="sd-jwt">
                            <div class="space-y-4 pt-4">
                                <div>
                                    <label
                                        for="sd-jwt-name"
                                        class="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Name
                                        <span class="text-gray-400 font-normal">
                                            (optional — defaults to credential
                                            type)
                                        </span>
                                    </label>
                                    <InputText
                                        id="sd-jwt-name"
                                        v-model="sdJwtName"
                                        placeholder="Leave blank to use credential type (vct)"
                                        class="w-full"
                                    />
                                </div>
                                <div>
                                    <label
                                        for="sd-jwt-token"
                                        class="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Compact SD-JWT-VC Token
                                        <span class="text-red-500">*</span>
                                    </label>
                                    <Textarea
                                        id="sd-jwt-token"
                                        v-model="sdJwtToken"
                                        placeholder="eyJ...eyJ...~WyJ...~WyJ...~"
                                        class="w-full font-mono text-xs"
                                        rows="8"
                                    />
                                    <p class="text-xs text-gray-400 mt-1">
                                        Format:
                                        <code class="bg-gray-100 px-1 rounded">
                                            header.payload.signature~disclosure1~disclosure2~
                                        </code>
                                    </p>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            label="Cancel"
                            @click="showAddDialog = false"
                            severity="secondary"
                            outlined
                        />
                        <Button
                            label="Add"
                            icon="pi pi-check"
                            :loading="sdJwtParsing"
                            @click="handleAddSubmit"
                        />
                    </div>
                </template>
            </Dialog>

            <!-- Browse Credential Dialog -->
            <Dialog
                v-model:visible="showBrowseDialog"
                :header="browsingCredential?.name ?? 'Credential'"
                modal
                class="w-full max-w-2xl"
                @after-hide="browsingCredential = null"
            >
                <pre
                    class="text-xs font-mono bg-gray-50 rounded p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all"
                    >{{ prettyBrowseJson }}</pre
                >
                <template #footer>
                    <div class="flex justify-end">
                        <Button
                            label="Close"
                            @click="showBrowseDialog = false"
                            severity="secondary"
                            outlined
                        />
                    </div>
                </template>
            </Dialog>
        </div>

        <!-- Not Found State -->
        <div v-else class="text-center py-12 px-4">
            <div
                class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4"
            >
                <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
                Wallet Not Found
            </h1>
            <p class="text-gray-500 mb-6">
                The wallet you're looking for doesn't exist.
            </p>
            <Button
                @click="router.push('/')"
                label="Back to Home"
                icon="pi pi-home"
            />
        </div>
    </div>
</template>
