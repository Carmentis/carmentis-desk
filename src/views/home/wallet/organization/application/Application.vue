<script setup lang="ts">
import { computed, ref, watch, inject, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { useOnChainActions } from '../../../../../composables/useOnChainActions.ts';
import { useTimeoutFn } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { useQuery } from '@tanstack/vue-query';
import Message from "primevue/message";
import {useAsyncFn} from "../../../../../composables/useAsyncFn.ts";
import {useCurrentApplication} from "../../../../../composables/useCurrentApplication.ts";
import {useCurrentWallet} from "../../../../../composables/useCurrentWallet.ts";
import {useCurrentOrganization} from "../../../../../composables/useCurrentOrganization.ts";
import {usePublicationStatus} from "../../../../../composables/usePublicationStatus.ts";
import FieldNameAndDescription from "../../../../../components/utils/FieldNameAndDescription.vue";
import PageHeader from "../../../../../components/ui/PageHeader.vue";
import UiCard from "../../../../../components/ui/UiCard.vue";
import StatusBadge from "../../../../../components/ui/StatusBadge.vue";
import CopyableValue from "../../../../../components/ui/CopyableValue.vue";
import StickyActionBar from "../../../../../components/ui/StickyActionBar.vue";
import ConfirmActionDialog from "../../../../../components/ui/ConfirmActionDialog.vue";
import EmptyState from "../../../../../components/ui/EmptyState.vue";
import SkeletonBlock from "../../../../../components/ui/SkeletonBlock.vue";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const onchainStore = useOnChainActions();
const { isPublishingApplication } = onchainStore;
const registerNavbarActions = inject<(actions: any[]) => void>('registerNavbarActions');

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const appId = computed(() => Number(route.params.appId));


const {wallet, indexer: walletIndexer} = useCurrentWallet();
const {organization, deleteApplication: deleteApplicationById} = useCurrentOrganization();
const {application, updateApplication} = useCurrentApplication();
const storedApplicationName = computed(() => application.value?.name ?? '');
const storedApplicationDescription = computed(() => application.value?.description ?? '');
const storedApplicationWebsite = computed(() => application.value?.website ?? '');

const goBack = () => {
    router.push(`/wallet/${walletId.value}/organization/${orgId.value}`);
};

// Application Details Form
const appName = ref('');
const appDescription = ref('');
const appWebsite = ref('');
const isFormDirty = computed(() =>
    !!application.value && (
        appName.value !== storedApplicationName.value ||
        appDescription.value !== storedApplicationDescription.value ||
        appWebsite.value !== storedApplicationWebsite.value
    )
);


// Initialize form values when application loads
function initializeForm() {
    if (application.value) {
        appName.value = application.value.name;
        appDescription.value = application.value.description || '';
        appWebsite.value = application.value.website || '';
    }
}


// Publish confirmation dialog
const showPublishConfirmDialog = ref(false);

// Delete confirmation dialog
const showDeleteConfirmDialog = ref(false);

async function confirmDeleteApplication() {
    showDeleteConfirmDialog.value = false;
    await deleteApplicationById(appId.value);
    toast.add({
        severity: 'success',
        summary: 'Application deleted',
        detail: 'Application deleted successfully',
        life: 3000,
    });
    goBack();
}



// Watch for application changes to initialize form
watch(
    application,
    () => {
        if (application.value) {
            initializeForm();
        }
    },
    { immediate: true },
);

// inline validation, shown once the user tried to save
const submitted = ref(false);
const nameError = computed(() => submitted.value && !appName.value.trim() ? 'Enter the name of the application.' : '');

const {execute: updateApplicationDetails, isLoading: isUpdating} = useAsyncFn(async () => {
    if (!application.value) return;
    submitted.value = true;
    if (nameError.value) return;

    await updateApplication({
        ...application.value,
        name: appName.value.trim(),
        description: appDescription.value.trim() || undefined,
        website: appWebsite.value.trim() || undefined,
    });

    toast.add({
        severity: 'success',
        summary: 'Application updated',
        detail: 'Application details updated successfully',
        life: 3000,
    });
})


async function confirmPublishApplication() {
    showPublishConfirmDialog.value = false;

    if (!organization.value?.organizationVbId) {
        toast.add({
            severity: 'error',
            summary: 'Organization not published',
            detail: 'Organization must be published before publishing applications',
            life: 3000,
        });
        return;
    }

    // update application details locally
    await updateApplicationDetails();

    // update application details on-chain
    await onchainStore.publishApplication({
        orgId: orgId.value,
        appId: appId.value,
        name: appName.value.trim(),
        description: appDescription.value.trim(),
        website: appWebsite.value.trim(),
    });
}

// query used to identify if the application is found online (via the indexer)
const applicationVbId = computed(() =>
    typeof application.value?.applicationVbId === 'string' ? application.value.applicationVbId : undefined,
);


const { data: applicationFoundOnChain, isLoading: isFetchingApplicationFromChain } = useQuery({
    enabled: computed(() => !!applicationVbId.value && !!walletIndexer.value),
    queryKey: ['application-on-chain', applicationVbId, walletIndexer],
    queryFn: async () => {
        const vbId = applicationVbId.value;
        const indexer = walletIndexer.value;
        if (!vbId || !indexer) return undefined;
        try {
            const foundApplicationsOnChain = await walletIndexer.value.getApplications({ vb_id: vbId });
            if (foundApplicationsOnChain.items.length !== 1) return undefined;
            return foundApplicationsOnChain.items[0];
        } catch (e) {
            console.error(`Application not found online: ${e}`);
            return undefined;
        }
    },
})

const {useHasAccountOnChainQuery} = useCurrentWallet();
const isApplicationFoundOnChain = computed(() => !!applicationFoundOnChain.value);
const fetchedApplicationName = computed(() => applicationFoundOnChain.value?.name);
const fetchedApplicationDescription = computed(() => applicationFoundOnChain.value?.description);
const fetchedApplicationWebsite = computed(() => applicationFoundOnChain.value?.homepageUrl);
const isNameDifferentFromForm = computed(() => isApplicationFoundOnChain.value && fetchedApplicationName.value !== appName.value);
const isDescriptionDifferentFromForm = computed(() => isApplicationFoundOnChain.value && fetchedApplicationDescription.value !== appDescription.value);
const isWebsiteDifferentFromForm = computed(() => isApplicationFoundOnChain.value && fetchedApplicationWebsite.value !== appWebsite.value);
const hasAccountOnChain = useHasAccountOnChainQuery();

// ---- presentation ----
const publication = usePublicationStatus('application', {
    hasVbId: computed(() => !!application.value?.applicationVbId),
    isChecking: isFetchingApplicationFromChain,
    isFound: isApplicationFoundOnChain,
});

// The application arrives asynchronously and a missing one looks the same as a loading one:
// show a skeleton for a moment before concluding that it does not exist.
const hasWaited = ref(false);
useTimeoutFn(() => hasWaited.value = true, 1000);

// Register navbar actions
onMounted(() => {
    if (registerNavbarActions) {
        registerNavbarActions([
            {
                label: 'Update',
                icon: 'pi pi-check',
                command: updateApplicationDetails,
                outlined: true,
            },
            {
                label: 'Publish',
                icon: 'pi pi-cloud-upload',
                command: () => (showPublishConfirmDialog.value = true),
                severity: 'secondary',
                outlined: true,
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                severity: 'danger',
                command: () => (showDeleteConfirmDialog.value = true),
                outlined: true,
            },
        ]);
    }
});
</script>

<template>
    <div v-if="application" class="space-y-6">
        <PageHeader :title="application.name" :back-to="`/wallet/${walletId}/organization/${orgId}`">
            <template #meta>
                <StatusBadge :tone="publication.tone" :label="publication.label" :icon="publication.icon" />
            </template>
        </PageHeader>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <UiCard title="Identity">
                <dl class="space-y-4">
                    <div>
                        <dt class="text-sm text-fg-muted">Status</dt>
                        <dd class="mt-1 space-y-1">
                            <StatusBadge :tone="publication.tone" :label="publication.label" :icon="publication.icon" />
                            <p class="text-sm text-fg-muted">{{ publication.hint }}</p>
                        </dd>
                    </div>
                    <div v-if="application.applicationVbId">
                        <dt class="text-sm text-fg-muted">Application ID</dt>
                        <dd>
                            <CopyableValue
                                :value="application.applicationVbId"
                                label="application ID"
                                :head="12"
                                :tail="10"
                            />
                        </dd>
                    </div>
                </dl>
            </UiCard>

            <form novalidate class="space-y-4" @submit.prevent="updateApplicationDetails">
                <UiCard title="Edit your application">
                    <template v-if="isFormDirty" #header-actions>
                        <StatusBadge tone="warning" label="Unsaved changes" icon="pi-exclamation-circle" />
                    </template>

                    <div class="space-y-5">
                        <div>
                            <FieldNameAndDescription name="Name" input-id="app-name" required />
                            <InputText
                                id="app-name"
                                v-model="appName"
                                fluid
                                autocomplete="off"
                                placeholder="e.g. Customer portal"
                                :invalid="!!nameError"
                                :aria-invalid="!!nameError"
                                aria-describedby="app-name-error"
                            />
                            <p v-if="nameError" id="app-name-error" class="mt-1 text-sm text-danger">{{ nameError }}</p>
                            <Message v-if="isNameDifferentFromForm" class="mt-2" severity="info" size="small">
                                The name published on the blockchain is different: {{ fetchedApplicationName }}
                            </Message>
                        </div>
                        <div>
                            <FieldNameAndDescription name="Description" input-id="app-description" />
                            <Textarea
                                id="app-description"
                                v-model="appDescription"
                                fluid
                                rows="3"
                                placeholder="What does this application do?"
                            />
                            <Message v-if="isDescriptionDifferentFromForm" class="mt-2" severity="info" size="small">
                                The description published on the blockchain is different.
                            </Message>
                        </div>
                        <div>
                            <FieldNameAndDescription name="Website" input-id="app-website" />
                            <InputText
                                id="app-website"
                                v-model="appWebsite"
                                fluid
                                inputmode="url"
                                autocomplete="url"
                                autocapitalize="off"
                                spellcheck="false"
                                placeholder="https://example.com"
                            />
                            <Message v-if="isWebsiteDifferentFromForm" class="mt-2" severity="info" size="small">
                                The website published on the blockchain is different: {{ fetchedApplicationWebsite }}
                            </Message>
                        </div>
                    </div>
                </UiCard>

                <UiCard title="Danger zone" variant="danger">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <p class="max-w-md text-sm text-fg-muted">
                            Deleting this application removes it from this device. This cannot be undone.
                        </p>
                        <Button
                            type="button"
                            label="Delete application"
                            icon="pi pi-trash"
                            severity="danger"
                            outlined
                            @click="showDeleteConfirmDialog = true"
                        />
                    </div>
                </UiCard>

                <StickyActionBar v-if="isFormDirty || hasAccountOnChain">
                    <template v-if="isFormDirty">
                        <Button type="button" label="Discard changes" severity="secondary" outlined @click="initializeForm" />
                        <Button type="submit" label="Save details" icon="pi pi-check" :loading="isUpdating" :disabled="isUpdating" />
                    </template>
                    <Button
                        v-else
                        type="button"
                        label="Publish"
                        icon="pi pi-cloud-upload"
                        :loading="isPublishingApplication"
                        :disabled="isPublishingApplication"
                        @click="showPublishConfirmDialog = true"
                    />
                </StickyActionBar>
            </form>
        </div>

        <ConfirmActionDialog
            v-model:visible="showPublishConfirmDialog"
            title="Publish application"
            action="publish"
            tone="primary"
            confirm-label="Publish"
            :item-name="appName"
            message="This creates a virtual blockchain for your application on-chain and cannot be undone."
            @confirm="confirmPublishApplication"
        />

        <ConfirmActionDialog
            v-model:visible="showDeleteConfirmDialog"
            title="Delete application"
            :item-name="application.name"
            @confirm="confirmDeleteApplication"
        />
    </div>

    <SkeletonBlock v-else-if="!hasWaited" :lines="4" />

    <!-- Not Found State -->
    <EmptyState
        v-else
        framed
        icon="pi-exclamation-triangle"
        title="Application not found"
        description="The application you are looking for does not exist."
    >
        <Button label="Back to organization" icon="pi pi-arrow-left" @click="goBack" />
    </EmptyState>
</template>
