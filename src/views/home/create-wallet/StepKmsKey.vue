<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import UiCard from '../../../components/ui/UiCard.vue';
import SkeletonBlock from '../../../components/ui/SkeletonBlock.vue';
import FieldNameAndDescription from '../../../components/utils/FieldNameAndDescription.vue';
import KmsParamsForm from './KmsParamsForm.vue';
import {useWalletCreationWizard} from '../../../composables/useWalletCreationWizard.ts';

const {
    walletName,
    kmsServers,
    kmsServerUrl,
    kmsPlugins,
    kmsPluginId,
    kmsPlugin,
    isLoadingPlugins,
    pluginsError,
    kmsLabel,
    loadPlugins,
    pluginIconUrl,
} = useWalletCreationWizard();
</script>

<template>
    <div class="space-y-4">
        <UiCard title="KMS server" subtitle="The server that generates and keeps the private key.">
            <Select
                v-model="kmsServerUrl"
                input-id="kms-server"
                aria-label="KMS server"
                :options="kmsServers"
                optionLabel="name"
                optionValue="url"
                fluid
            >
                <template #option="{ option }">
                    <div class="min-w-0">
                        <p class="truncate text-sm text-fg">{{ option.name }}</p>
                        <p class="truncate text-xs text-fg-muted">{{ option.url }}</p>
                    </div>
                </template>
            </Select>
        </UiCard>

        <UiCard title="Plugin" subtitle="How the KMS generates and protects the private key.">
            <SkeletonBlock v-if="isLoadingPlugins" :lines="2" />

            <Message v-else-if="pluginsError" severity="error" :closable="false">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <span>{{ pluginsError }}</span>
                    <Button label="Retry" icon="pi pi-refresh" size="small" severity="secondary" outlined @click="loadPlugins(true)" />
                </div>
            </Message>

            <div v-else role="radiogroup" aria-label="KMS plugin" class="grid gap-3 sm:grid-cols-2">
                <button
                    v-for="plugin in kmsPlugins"
                    :key="plugin.id"
                    type="button"
                    role="radio"
                    :aria-checked="kmsPluginId === plugin.id"
                    class="flex items-start gap-3 rounded-control border p-3 text-left transition-colors hover:border-accent/60"
                    :class="kmsPluginId === plugin.id ? 'border-accent ring-2 ring-accent/30' : 'border-line'"
                    @click="kmsPluginId = plugin.id"
                >
                    <img
                        v-if="kmsServerUrl && pluginIconUrl(kmsServerUrl, plugin)"
                        :src="pluginIconUrl(kmsServerUrl, plugin)"
                        alt=""
                        class="size-9 shrink-0 rounded object-contain"
                    />
                    <span v-else class="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <i class="pi pi-box" aria-hidden="true" />
                    </span>
                    <span class="min-w-0 flex-1">
                        <span class="flex flex-wrap items-center gap-2">
                            <span class="text-sm font-semibold text-fg">{{ plugin.name }}</span>
                            <span v-if="plugin.builtin" class="rounded-full bg-surface-muted px-2 text-xs text-fg-muted">Built-in</span>
                            <span v-if="plugin.version" class="text-xs text-fg-muted">v{{ plugin.version }}</span>
                        </span>
                        <span v-if="plugin.description" class="mt-0.5 block text-sm text-fg-muted">{{ plugin.description }}</span>
                    </span>
                </button>
            </div>
        </UiCard>

        <UiCard
            v-if="kmsPlugin && !isLoadingPlugins"
            title="Key parameters"
            :subtitle="`Options of the ${kmsPlugin.name} plugin. Keep the defaults if unsure.`"
        >
            <div class="space-y-4">
                <KmsParamsForm :key="kmsPlugin.id" />

                <div>
                    <FieldNameAndDescription
                        name="Label on the KMS"
                        description="Helps the KMS administrators identify this wallet. Defaults to the wallet name."
                        input-id="kms-label"
                    />
                    <InputText id="kms-label" v-model="kmsLabel" :placeholder="walletName" autocomplete="off" fluid />
                </div>
            </div>
        </UiCard>
    </div>
</template>
