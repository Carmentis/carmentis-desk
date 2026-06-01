<script setup lang="ts">
import Card from 'primevue/card';
import Tabs from 'primevue/tabs';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Button from 'primevue/button';
import Logs from './Logs.vue';
import { useTheme } from '../../composables/useTheme';
import { ref, computed } from 'vue';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const { currentTheme, toggleTheme } = useTheme();

const confirm = useConfirm();
const toast = useToast();

const isSearchingForUpdate = ref(false);
const isDownloadingUpdate = ref(false);
const downloadingProgress = ref(0);

const updateButtonLabel = computed(() => {
    if (isSearchingForUpdate.value) return 'Searching...';
    if (isDownloadingUpdate.value) return `Downloading (${downloadingProgress.value}%)`;
    return 'Check for update';
});

async function checkForUpdate() {
    isSearchingForUpdate.value = true;
    try {
        const update = await check();
        if (update) {
            confirm.require({
                message: `Version ${update.version} is available. Update now?`,
                header: 'Update Available',
                icon: 'pi pi-exclamation-triangle',
                rejectLabel: 'Cancel',
                acceptLabel: 'Update',
                acceptClass: 'p-button-success',
                accept: async () => {
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
                },
            });
        } else {
            toast.add({ severity: 'info', summary: 'Up to date', detail: 'No update available.', life: 3000 });
        }
    } finally {
        isSearchingForUpdate.value = false;
    }
}
</script>

<template>
    <div class="space-y-4">
        <h1 class="text-2xl font-semibold text-surface-900">Settings</h1>

        <Tabs value="general">
            <TabList>
                <Tab value="general">
                    <i class="pi pi-sliders-h mr-2"></i>
                    General
                </Tab>
                <Tab value="logs">
                    <i class="pi pi-list mr-2"></i>
                    Logs
                </Tab>
            </TabList>

            <TabPanels>
                <!-- General -->
                <TabPanel value="general">
                    <div class="flex flex-col gap-4 pt-2">
                        <Card>
                            <template #content>
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-semibold text-surface-800">Theme</p>
                                        <p class="text-xs text-surface-500 mt-0.5">
                                            Currently using {{ currentTheme }} mode
                                        </p>
                                    </div>
                                    <Button
                                        :icon="currentTheme === 'light' ? 'pi pi-moon' : 'pi pi-sun'"
                                        :label="currentTheme === 'light' ? 'Dark Mode' : 'Light Mode'"
                                        outlined
                                        size="small"
                                        @click="toggleTheme"
                                    />
                                </div>
                            </template>
                        </Card>

                        <Card>
                            <template #content>
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-semibold text-surface-800">Application Update</p>
                                        <p class="text-xs text-surface-500 mt-0.5">Check for the latest version</p>
                                    </div>
                                    <Button
                                        icon="pi pi-refresh"
                                        :label="updateButtonLabel"
                                        outlined
                                        size="small"
                                        :loading="isSearchingForUpdate || isDownloadingUpdate"
                                        @click="checkForUpdate"
                                    />
                                </div>
                            </template>
                        </Card>
                    </div>
                </TabPanel>

                <!-- Logs -->
                <TabPanel value="logs">
                    <Logs />
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>
