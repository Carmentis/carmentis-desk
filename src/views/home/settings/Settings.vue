<script setup lang="ts">
import Button from 'primevue/button';
import Logs from './Logs.vue';
import { useTheme } from '../../../composables/useTheme.ts';
import { ref, computed, shallowRef } from 'vue';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useToast } from 'primevue/usetoast';
import Oid4vp from "./oid4vp.vue";
import {useAppStore} from "../../../stores/appStore.ts";
import ToggleSwitch from 'primevue/toggleswitch';
import PageHeader from '../../../components/ui/PageHeader.vue';
import UiCard from '../../../components/ui/UiCard.vue';
import SectionTabs from '../../../components/ui/SectionTabs.vue';
import ResponsiveDialog from '../../../components/ui/ResponsiveDialog.vue';
import Message from 'primevue/message';
import { useAppMenuActions } from '../../../composables/useAppMenuActions.ts';
import type { TabItem } from '../../../components/ui/types.ts';

const { hasDeveloperRole, hasNodeHolderRole, setNodeHolderRoleToUser, setDeveloperRoleToUser } = useAppStore();
const { currentTheme, toggleTheme } = useTheme();



const toast = useToast();

const isSearchingForUpdate = ref(false);
const isDownloadingUpdate = ref(false);
const downloadingProgress = ref(0);

const updateButtonLabel = computed(() => {
    if (isSearchingForUpdate.value) return 'Searching...';
    if (isDownloadingUpdate.value) return `Downloading (${downloadingProgress.value}%)`;
    return 'Check for update';
});

// The update found by the check, waiting for the user's confirmation.
// A shallowRef: the update is a class instance with private fields, which a reactive proxy would break.
const pendingUpdate = shallowRef<Update | null>(null);
const showUpdateDialog = ref(false);

// Updating restarts the application: the user is asked to export the data first.
const { exportData } = useAppMenuActions();
const isExporting = ref(false);

async function exportBeforeUpdate() {
    isExporting.value = true;
    try {
        await exportData();
    } finally {
        isExporting.value = false;
    }
}

async function checkForUpdate() {
    isSearchingForUpdate.value = true;
    try {
        const update = await check();
        if (update) {
            pendingUpdate.value = update;
            showUpdateDialog.value = true;
        } else {
            toast.add({ severity: 'info', summary: 'Up to date', detail: 'No update available.', life: 3000 });
        }
    } finally {
        isSearchingForUpdate.value = false;
    }
}

async function installUpdate() {
    const update = pendingUpdate.value;
    if (!update) return;
    showUpdateDialog.value = false;
    let downloaded = 0;
    let contentLength = 0;
    isDownloadingUpdate.value = true;
    await update.downloadAndInstall((event) => {
        switch (event.event) {
            case 'Started':
                contentLength = event.data.contentLength ?? 0;
                break;
            case 'Progress':
                downloaded += event.data.chunkLength;
                downloadingProgress.value = Math.round((downloaded / contentLength) * 100);
                break;
        }
    });
    isDownloadingUpdate.value = false;
    downloadingProgress.value = 0;
    await relaunch();
}

// ---- presentation ----
const tab = ref('general');
const tabs = computed<TabItem[]>(() => [
    { value: 'general', label: 'General', icon: 'pi-sliders-h' },
    { value: 'logs', label: 'Logs', icon: 'pi-list', hidden: !hasDeveloperRole.value },
    { value: 'developer', label: 'Developer', icon: 'pi-code', hidden: !hasDeveloperRole.value },
]);
</script>

<template>
    <div class="space-y-6">
        <PageHeader title="Settings" />

        <SectionTabs v-model="tab" :tabs="tabs" ariaLabel="Settings sections" persist-key="settingsTab">
            <template #default="{ active }">
                <!-- General -->
                <div v-if="active === 'general'" class="mx-auto max-w-2xl space-y-4">
                    <UiCard title="User roles" subtitle="Adapt the application to your needs.">
                        <ul class="divide-y divide-line">
                            <li class="flex min-h-11 items-center justify-between gap-4 py-3 first:pt-0">
                                <label for="role-developer" class="min-w-0 flex-1">
                                    <span class="block text-sm font-medium text-fg">Developer</span>
                                    <span class="block text-sm text-fg-muted">
                                        Manage applications and publish custom data on-chain.
                                    </span>
                                </label>
                                <ToggleSwitch
                                    input-id="role-developer"
                                    :model-value="hasDeveloperRole"
                                    @update:model-value="(value: boolean) => setDeveloperRoleToUser(value)"
                                />
                            </li>
                            <li class="flex min-h-11 items-center justify-between gap-4 py-3 last:pb-0">
                                <label for="role-node-holder" class="min-w-0 flex-1">
                                    <span class="block text-sm font-medium text-fg">Node holder</span>
                                    <span class="block text-sm text-fg-muted">
                                        You run a node, or you want to set one up.
                                    </span>
                                </label>
                                <ToggleSwitch
                                    input-id="role-node-holder"
                                    :model-value="hasNodeHolderRole"
                                    @update:model-value="(value: boolean) => setNodeHolderRoleToUser(value)"
                                />
                            </li>
                        </ul>
                    </UiCard>

                    <UiCard title="Appearance">
                        <div class="flex min-h-11 items-center justify-between gap-4">
                            <label for="dark-mode" class="min-w-0 flex-1">
                                <span class="block text-sm font-medium text-fg">Dark mode</span>
                                <span class="block text-sm text-fg-muted">Currently using {{ currentTheme }} mode.</span>
                            </label>
                            <ToggleSwitch
                                input-id="dark-mode"
                                :model-value="currentTheme === 'dark'"
                                @update:model-value="toggleTheme"
                            />
                        </div>
                    </UiCard>

                    <UiCard title="Application update">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <p class="text-sm text-fg-muted">
                                Check whether a newer version is available. Export your data before updating.
                            </p>
                            <Button
                                icon="pi pi-refresh"
                                :label="updateButtonLabel"
                                severity="secondary"
                                outlined
                                :loading="isSearchingForUpdate || isDownloadingUpdate"
                                @click="checkForUpdate"
                            />
                        </div>
                    </UiCard>
                </div>

                <!-- Logs -->
                <Logs v-else-if="active === 'logs'" />

                <!-- Developer -->
                <oid4vp v-else-if="active === 'developer'" />
            </template>
        </SectionTabs>

        <ResponsiveDialog v-model:visible="showUpdateDialog" header="Update available">
            <div class="space-y-4">
                <p class="text-sm text-fg">
                    Version <strong>{{ pendingUpdate?.version }}</strong> is available. The application restarts once
                    the update is installed.
                </p>

                <Message severity="warn" :closable="false">
                    <p class="font-semibold">Export your data before updating.</p>
                    <p class="mt-1">
                        Keep a copy of your wallets, organizations and keys, in case something goes wrong during the
                        update. The export file contains your private keys and is not encrypted: store it somewhere safe.
                    </p>
                </Message>

                <Button
                    label="Export data"
                    icon="pi pi-download"
                    severity="secondary"
                    outlined
                    :loading="isExporting"
                    @click="exportBeforeUpdate"
                />
            </div>

            <template #footer>
                <Button label="Cancel" severity="secondary" outlined @click="showUpdateDialog = false" />
                <Button label="Update" icon="pi pi-refresh" @click="installUpdate" />
            </template>
        </ResponsiveDialog>
    </div>
</template>
