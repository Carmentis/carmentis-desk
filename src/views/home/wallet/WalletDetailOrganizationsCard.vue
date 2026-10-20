<script setup lang="ts">
import Button from "primevue/button";
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useToast} from "primevue/usetoast";
import InputText from "primevue/inputtext";
import {useCurrentWallet} from "../../../composables/useCurrentWallet.ts";
import {OrganizationDto} from "../../../api/indexer/model";
import ResponsiveDialog from "../../../components/ui/ResponsiveDialog.vue";
import SegmentedControl from "../../../components/ui/SegmentedControl.vue";
import StatusBadge from "../../../components/ui/StatusBadge.vue";
import CopyableValue from "../../../components/ui/CopyableValue.vue";
import EmptyState from "../../../components/ui/EmptyState.vue";
import ErrorState from "../../../components/ui/ErrorState.vue";
import SkeletonBlock from "../../../components/ui/SkeletonBlock.vue";
import FieldNameAndDescription from "../../../components/utils/FieldNameAndDescription.vue";
import type {SegmentedOption} from "../../../components/ui/types.ts";

const toast = useToast();
const router = useRouter();
const route = useRoute();

// organization management
const {walletOrganizations, createOrganization, importExistingOrganization, useFoundOrganizationsOnchain} = useCurrentWallet();
const walletId = computed(() => Number(route.params.walletId));
const showOrgDialog = ref(false);
const orgName = ref('');
const orgNameSubmitted = ref(false);
const isCreating = ref(false);

const foundOrganizations = useFoundOrganizationsOnchain();

function openCreateOrgDialog() {
    orgName.value = '';
    orgNameSubmitted.value = false;
    showOrgDialog.value = true;
}

const orgNameError = computed(() =>
    orgNameSubmitted.value && !orgName.value ? 'Enter a name for the organization.' : '',
);

async function submitOrgDialog() {
    orgNameSubmitted.value = true;
    if (orgNameError.value) return;

    isCreating.value = true;
    try {
        await createOrganization(orgName.value);

        toast.add({
            severity: 'success',
            summary: 'Organization created',
            detail: `Organization "${orgName.value}" created successfully`,
            life: 3000,
        });
        showOrgDialog.value = false;
    } finally {
        isCreating.value = false;
    }
}

function visitOrganization(orgId: number) {
    router.push(`/wallet/${walletId.value}/organization/${orgId}`);
}

async function importOrganization(
    existingOrganization: OrganizationDto
) {
    console.log("Importing organization", existingOrganization.name);
    await importExistingOrganization({
        name: existingOrganization.name,
        countryCode: existingOrganization.countryCode,
        website: existingOrganization.website,
        createdAt: new Date(),
        city: existingOrganization.city,
        organizationVbId: existingOrganization.virtualBlockchainId,
    });
    toast.add({
        severity: 'success',
        summary: 'Organization imported',
        detail: `Organization "${existingOrganization.name}" imported successfully`,
        life: 3000,
    });
}

// ---- presentation ----
type OrganizationsView = 'local' | 'on-chain';
const view = ref<OrganizationsView>('local');

const onChainCount = computed(() => {
    if (foundOrganizations.isLoading.value) return '';
    if (foundOrganizations.error.value) return ' (!)';
    return foundOrganizations.data.value ? ` (${foundOrganizations.data.value.length})` : '';
});
const viewOptions = computed<SegmentedOption<OrganizationsView>[]>(() => [
    { value: 'local', label: `On this device (${walletOrganizations.value.length})` },
    { value: 'on-chain', label: `On-chain${onChainCount.value}` },
]);

const place = (city?: string, countryCode?: string) => [city, countryCode].filter(Boolean).join(', ');

// A local organization is published once the same organization is found on-chain.
const onChainIds = computed(() => new Set(foundOrganizations.data.value?.map((o) => o.virtualBlockchainId) ?? []));
const isPublished = (vbId?: string) => !!vbId && onChainIds.value.has(vbId);
const canTellPublication = computed(() => !!foundOrganizations.data.value);

const localIds = computed(() => new Set(walletOrganizations.value.map((o) => o.organizationVbId).filter(Boolean)));
</script>
<template>
    <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-fg">Organizations</h2>
            <Button @click="openCreateOrgDialog" label="New organization" icon="pi pi-plus" />
        </div>

        <SegmentedControl v-model="view" :options="viewOptions" ariaLabel="Where to look for organizations" />

        <!-- On this device -->
        <template v-if="view === 'local'">
            <p class="text-sm text-fg-muted">
                Organizations stored on this device. A draft has not been published on the blockchain yet.
            </p>

            <div v-if="walletOrganizations.length === 0" class="rounded-card border border-line bg-surface shadow-card">
                <EmptyState
                    icon="pi-building"
                    title="No organizations yet"
                    description="Create an organization to publish nodes and applications."
                >
                    <Button @click="openCreateOrgDialog" label="New organization" icon="pi pi-plus" />
                </EmptyState>
            </div>

            <ul v-else class="grid gap-3 lg:grid-cols-2">
                <li
                    v-for="org in walletOrganizations"
                    :key="org.id"
                    class="min-w-0 space-y-2 rounded-card border border-line bg-surface p-4 shadow-card"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="truncate font-semibold text-fg">{{ org.name }}</p>
                            <p v-if="place(org.city, org.countryCode)" class="truncate text-sm text-fg-muted">
                                {{ place(org.city, org.countryCode) }}
                            </p>
                        </div>
                        <Button label="Open" icon="pi pi-arrow-right" icon-pos="right" severity="secondary" outlined size="small" @click="visitOrganization(org.id)" />
                    </div>
                    <StatusBadge
                        v-if="canTellPublication"
                        :tone="isPublished(org.organizationVbId) ? 'success' : 'warning'"
                        :label="isPublished(org.organizationVbId) ? 'Published' : 'Draft'"
                        :icon="isPublished(org.organizationVbId) ? 'pi-check-circle' : 'pi-file-edit'"
                    />
                    <p v-if="org.website" class="truncate text-sm text-fg-muted">{{ org.website }}</p>
                    <CopyableValue v-if="org.organizationVbId" :value="org.organizationVbId" label="organization ID" :head="10" :tail="8" />
                </li>
            </ul>
        </template>

        <!-- On-chain -->
        <template v-else>
            <p class="text-sm text-fg-muted">
                Organizations linked to this wallet on the blockchain. Import one to manage it here.
            </p>

            <SkeletonBlock v-if="foundOrganizations.isLoading.value" :lines="3" height-class="h-16" />

            <div v-else-if="foundOrganizations.error.value" class="rounded-card border border-line bg-surface shadow-card">
                <ErrorState
                    title="Could not search the blockchain"
                    :message="foundOrganizations.error.value.message"
                    retryable
                    @retry="foundOrganizations.refetch()"
                />
            </div>

            <div v-else-if="!foundOrganizations.data.value?.length" class="rounded-card border border-line bg-surface shadow-card">
                <EmptyState
                    icon="pi-building"
                    title="No organization found on-chain"
                    description="Organizations you publish with this wallet will appear here."
                />
            </div>

            <ul v-else class="grid gap-3 lg:grid-cols-2">
                <li
                    v-for="org in foundOrganizations.data.value"
                    :key="org.virtualBlockchainId"
                    class="min-w-0 space-y-2 rounded-card border border-line bg-surface p-4 shadow-card"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="truncate font-semibold text-fg">{{ org.name }}</p>
                            <p v-if="place(org.city, org.countryCode)" class="truncate text-sm text-fg-muted">
                                {{ place(org.city, org.countryCode) }}
                            </p>
                        </div>
                        <Button label="Import" icon="pi pi-download" severity="secondary" outlined size="small" @click="importOrganization(org)" />
                    </div>
                    <StatusBadge
                        :tone="localIds.has(org.virtualBlockchainId) ? 'success' : 'info'"
                        :label="localIds.has(org.virtualBlockchainId) ? 'In this wallet' : 'Not imported'"
                        :icon="localIds.has(org.virtualBlockchainId) ? 'pi-check-circle' : 'pi-cloud-download'"
                    />
                    <p v-if="org.website" class="truncate text-sm text-fg-muted">{{ org.website }}</p>
                    <CopyableValue :value="org.virtualBlockchainId" label="organization ID" :head="10" :tail="8" />
                </li>
            </ul>
        </template>
    </div>

    <!-- Organization Dialog -->
    <ResponsiveDialog v-model:visible="showOrgDialog" header="New organization" :closable="!isCreating">
        <form id="create-org-form" novalidate @submit.prevent="submitOrgDialog">
            <FieldNameAndDescription
                name="Organization name"
                input-id="org-name"
                required
            />
            <InputText
                id="org-name"
                v-model="orgName"
                fluid
                autocomplete="organization"
                placeholder="e.g. Acme Corp"
                :invalid="!!orgNameError"
                :aria-invalid="!!orgNameError"
                aria-describedby="org-name-error"
            />
            <p v-if="orgNameError" id="org-name-error" class="mt-1 text-sm text-danger">{{ orgNameError }}</p>
        </form>
        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="isCreating" @click="showOrgDialog = false" />
            <Button type="submit" form="create-org-form" label="Create" icon="pi pi-check" :loading="isCreating" />
        </template>
    </ResponsiveDialog>
</template>
