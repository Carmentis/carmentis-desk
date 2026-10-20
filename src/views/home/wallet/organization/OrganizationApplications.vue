<script setup lang="ts">
import Button from "primevue/button";
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useToast} from "primevue/usetoast";
import OrganizationApplicationCreationDialog from "./OrganizationApplicationCreationDialog.vue";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import {ApplicationDto} from "../../../../api/indexer/model";
import SegmentedControl from "../../../../components/ui/SegmentedControl.vue";
import StatusBadge from "../../../../components/ui/StatusBadge.vue";
import CopyableValue from "../../../../components/ui/CopyableValue.vue";
import EmptyState from "../../../../components/ui/EmptyState.vue";
import ErrorState from "../../../../components/ui/ErrorState.vue";
import SkeletonBlock from "../../../../components/ui/SkeletonBlock.vue";
import type {SegmentedOption} from "../../../../components/ui/types.ts";

const toast = useToast();
const router = useRouter();
const route = useRoute();

const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
const openCreateAppDialog = ref(false);
const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const {
    organizationApplications: applications,
    importExistingApplication,
    useFoundApplicationsOnChain,
} = useCurrentOrganization();

function visitApplication(appId: number) {
    router.push(`/wallet/${walletId.value}/organization/${orgId.value}/application/${appId}`);
}

async function importApplication(existingApplication: ApplicationDto) {
    try {
        await importExistingApplication({
            applicationVbId: existingApplication.virtualBlockchainId,
            name: existingApplication.name,
            website: existingApplication.homepageUrl,
            description: existingApplication.description,
            createdAt: new Date(),
        });
        toast.add({
            severity: 'success',
            summary: 'Application imported',
            detail: 'Application imported successfully',
            life: 3000,
        });
    } catch (e) {
        toast.add({
            severity: 'error',
            summary: 'Application import failed',
            detail: e instanceof Error ? e.message : 'Unknown error',
            life: 3000,
        });
    }
}

// ---- presentation: Local / On-chain is a filter, not another row of tabs ----
type ApplicationsView = 'local' | 'on-chain';
const view = ref<ApplicationsView>('local');
const foundApplicationsOnChain = useFoundApplicationsOnChain();

const onChainCount = computed(() => {
    if (foundApplicationsOnChain.isLoading.value) return '';
    if (foundApplicationsOnChain.error.value) return ' (!)';
    return foundApplicationsOnChain.data.value ? ` (${foundApplicationsOnChain.data.value.length})` : '';
});
const viewOptions = computed<SegmentedOption<ApplicationsView>[]>(() => [
    { value: 'local', label: `On this device (${applications.value.length})` },
    { value: 'on-chain', label: `On-chain${onChainCount.value}` },
]);

// A local application is published once the same application is found on-chain.
const onChainIds = computed(() => new Set(foundApplicationsOnChain.data.value?.map((a) => a.virtualBlockchainId) ?? []));
const isPublished = (vbId?: string) => !!vbId && onChainIds.value.has(vbId);
const canTellPublication = computed(() => !!foundApplicationsOnChain.data.value);
const localIds = computed(() => new Set(applications.value.map((a) => a.applicationVbId).filter(Boolean)));
</script>
<template>
    <EmptyState
        v-if="isOrganizationFoundOnChain !== true"
        framed
        icon="pi-lock"
        title="Publish your organization first"
        description="Application management is only available once the organization has been published on the Carmentis network."
    />

    <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-fg">Applications</h2>
            <Button @click="openCreateAppDialog = true" label="New application" icon="pi pi-plus" />
        </div>

        <SegmentedControl v-model="view" :options="viewOptions" ariaLabel="Where to look for applications" />

        <!-- On this device -->
        <template v-if="view === 'local'">
            <p class="text-sm text-fg-muted">
                Applications stored on this device. A draft has not been published on the blockchain yet.
            </p>

            <EmptyState
                v-if="applications.length === 0"
                framed
                icon="pi-box"
                title="No application yet"
                description="Create an application to start publishing data with your organization."
            >
                <Button @click="openCreateAppDialog = true" label="New application" icon="pi pi-plus" />
            </EmptyState>

            <ul v-else class="grid gap-3 lg:grid-cols-2">
                <li
                    v-for="app in applications"
                    :key="app.id"
                    class="min-w-0 space-y-2 rounded-card border border-line bg-surface p-4 shadow-card"
                >
                    <div class="flex items-start justify-between gap-3">
                        <p class="min-w-0 truncate font-semibold text-fg">{{ app.name }}</p>
                        <Button label="Open" icon="pi pi-arrow-right" icon-pos="right" severity="secondary" outlined size="small" @click="visitApplication(app.id)" />
                    </div>
                    <StatusBadge
                        v-if="canTellPublication"
                        :tone="isPublished(app.applicationVbId) ? 'success' : 'warning'"
                        :label="isPublished(app.applicationVbId) ? 'Published' : 'Draft'"
                        :icon="isPublished(app.applicationVbId) ? 'pi-check-circle' : 'pi-file-edit'"
                    />
                    <CopyableValue v-if="app.applicationVbId" :value="app.applicationVbId" label="application ID" :head="10" :tail="8" />
                </li>
            </ul>
        </template>

        <!-- On-chain -->
        <template v-else>
            <p class="text-sm text-fg-muted">
                Applications of this organization found on the blockchain. Import one to manage it here.
            </p>

            <SkeletonBlock v-if="foundApplicationsOnChain.isLoading.value" :lines="3" height-class="h-16" />

            <ErrorState
                v-else-if="foundApplicationsOnChain.error.value"
                title="Could not search the blockchain"
                :message="foundApplicationsOnChain.error.value.message"
                retryable
                @retry="foundApplicationsOnChain.refetch()"
            />

            <EmptyState
                v-else-if="!foundApplicationsOnChain.data.value?.length"
                framed
                icon="pi-box"
                title="No application found on-chain"
                description="Applications you publish for this organization will appear here."
            />

            <ul v-else class="grid gap-3 lg:grid-cols-2">
                <li
                    v-for="app in foundApplicationsOnChain.data.value"
                    :key="app.virtualBlockchainId"
                    class="min-w-0 space-y-2 rounded-card border border-line bg-surface p-4 shadow-card"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="truncate font-semibold text-fg">{{ app.name }}</p>
                            <p v-if="app.homepageUrl" class="truncate text-sm text-fg-muted">{{ app.homepageUrl }}</p>
                        </div>
                        <Button label="Import" icon="pi pi-download" severity="secondary" outlined size="small" @click="importApplication(app)" />
                    </div>
                    <StatusBadge
                        :tone="localIds.has(app.virtualBlockchainId) ? 'success' : 'info'"
                        :label="localIds.has(app.virtualBlockchainId) ? 'On this device' : 'Not imported'"
                        :icon="localIds.has(app.virtualBlockchainId) ? 'pi-check-circle' : 'pi-cloud-download'"
                    />
                    <p v-if="app.description" class="line-clamp-2 text-sm text-fg-muted">{{ app.description }}</p>
                    <CopyableValue :value="app.virtualBlockchainId" label="application ID" :head="10" :tail="8" />
                </li>
            </ul>
        </template>
    </div>

    <OrganizationApplicationCreationDialog v-model:showAppDialog="openCreateAppDialog" />
</template>
