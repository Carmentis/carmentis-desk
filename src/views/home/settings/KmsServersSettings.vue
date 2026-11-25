<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useToast} from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import UiCard from '../../../components/ui/UiCard.vue';
import EmptyState from '../../../components/ui/EmptyState.vue';
import ConfirmActionDialog from '../../../components/ui/ConfirmActionDialog.vue';
import FieldNameAndDescription from '../../../components/utils/FieldNameAndDescription.vue';
import {describeKmsError, useKmsStore} from '../../../stores/useKmsStore.ts';
import type {KmsServer} from '../../../types/types.ts';

const toast = useToast();
const kmsStore = useKmsStore();
const {servers} = storeToRefs(kmsStore);

// ---- add ----
const name = ref('');
const url = ref('');
const isAdding = ref(false);
const canAdd = computed(() => url.value.trim() !== '' && !isAdding.value);

async function addServer() {
    isAdding.value = true;
    try {
        const pluginCount = await kmsStore.addServer(name.value, url.value);
        toast.add({
            severity: 'success',
            summary: 'KMS added',
            detail: `${pluginCount} plugin${pluginCount === 1 ? '' : 's'} available to create wallets.`,
            life: 4000,
        });
        name.value = '';
        url.value = '';
    } catch (e) {
        toast.add({severity: 'error', summary: 'KMS not added', detail: describeKmsError(e), life: 6000});
    } finally {
        isAdding.value = false;
    }
}

// ---- status of each server (number of plugins usable by Desk, or unreachable) ----
const pluginCounts = ref<Record<number, number | 'error' | undefined>>({});
watch(servers, (list) => {
    for (const server of list) {
        if (pluginCounts.value[server.id] !== undefined) continue;
        kmsStore.fetchPlugins(server.url)
            .then(plugins => pluginCounts.value[server.id] = plugins.length)
            .catch(() => pluginCounts.value[server.id] = 'error');
    }
}, {immediate: true});

function statusOf(server: KmsServer): string {
    const count = pluginCounts.value[server.id];
    if (count === undefined) return 'Checking…';
    if (count === 'error') return 'Unreachable';
    return `${count} plugin${count === 1 ? '' : 's'}`;
}

// ---- remove ----
const serverToRemove = ref<KmsServer | null>(null);
const showRemoveDialog = computed({
    get: () => serverToRemove.value !== null,
    set: (open: boolean) => { if (!open) serverToRemove.value = null; },
});

async function removeServer() {
    if (!serverToRemove.value) return;
    await kmsStore.removeServer(serverToRemove.value.id);
    serverToRemove.value = null;
}
</script>

<template>
    <div class="mx-auto max-w-2xl space-y-4">
        <UiCard
            title="KMS servers"
            subtitle="Carmentis KMS servers that can hold the private key of your wallets."
            :padded="servers.length === 0"
        >
            <EmptyState
                v-if="servers.length === 0"
                icon="pi-server"
                title="No KMS configured"
                description="Add a KMS below to create wallets whose private key never leaves the server."
            />
            <ul v-else class="divide-y divide-line">
                <li
                    v-for="server in servers"
                    :key="server.id"
                    class="flex min-h-11 items-center justify-between gap-4 px-4 py-3 sm:px-6"
                >
                    <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-fg">{{ server.name }}</p>
                        <p class="break-all text-sm text-fg-muted">{{ server.url }}</p>
                    </div>
                    <span
                        class="shrink-0 text-xs"
                        :class="pluginCounts[server.id] === 'error' ? 'text-danger' : 'text-fg-muted'"
                    >
                        {{ statusOf(server) }}
                    </span>
                    <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        rounded
                        :aria-label="`Remove ${server.name}`"
                        @click="serverToRemove = server"
                    />
                </li>
            </ul>
        </UiCard>

        <UiCard title="Add a KMS">
            <form class="space-y-4" novalidate @submit.prevent="addServer">
                <div>
                    <FieldNameAndDescription name="URL" input-id="kms-url" required />
                    <InputText
                        id="kms-url"
                        v-model="url"
                        fluid
                        autocomplete="off"
                        spellcheck="false"
                        placeholder="https://kms.example.com"
                    />
                </div>
                <div>
                    <FieldNameAndDescription
                        name="Name"
                        description="Only you see this name. Defaults to the host of the URL."
                        input-id="kms-name"
                    />
                    <InputText id="kms-name" v-model="name" fluid autocomplete="off" placeholder="e.g. Company KMS" />
                </div>
                <div class="flex justify-end">
                    <Button type="submit" label="Add" icon="pi pi-plus" :loading="isAdding" :disabled="!canAdd" />
                </div>
            </form>
        </UiCard>

        <ConfirmActionDialog
            v-model:visible="showRemoveDialog"
            title="Remove KMS"
            action="remove"
            confirm-label="Remove"
            :item-name="serverToRemove?.name ?? ''"
            message="No wallet is deleted: wallets already created on this KMS keep working. You won't be able to create new wallets on it."
            @confirm="removeServer"
        />
    </div>
</template>
