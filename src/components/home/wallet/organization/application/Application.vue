<script setup lang="ts">
import { computed, ref, watch, inject, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Breadcrumb from 'primevue/breadcrumb';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { useOnChainStore } from '../../../../../stores/onchain';
import { storeToRefs } from 'pinia';
import { useAsyncState } from '@vueuse/core';
import * as walletRepo from '../../../../../db/repositories/walletRepository';
import * as orgRepo from '../../../../../db/repositories/organizationRepository';
import * as appRepo from '../../../../../db/repositories/applicationRepository';
import { useToast } from 'primevue/usetoast';
import { createIndexerClient } from '../../../../../api/indexer/client.ts';
import { useQuery } from '@tanstack/vue-query';
import { useHasAccountOnChainQuery } from '../../../../../composables/useAccountBreakdown.ts';
import Message from "primevue/message";
import {useAsyncFn} from "../../../../../composables/useAsyncFn.ts";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const onchainStore = useOnChainStore();
const { isPublishingApplication } = storeToRefs(onchainStore);
const registerNavbarActions = inject<(actions: any[]) => void>('registerNavbarActions');

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const appId = computed(() => Number(route.params.appId));

const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const { state: organization } = useAsyncState(
    () => orgRepo.getOrganizationById(orgId.value),
    null,
    { immediate: true },
);

// fetch the application
const { data: application } = useQuery({
    queryKey: ['application', appId.value],
    queryFn: () => appRepo.getApplicationById(appId.value),
    enabled: !!appId.value,
})
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
    await appRepo.deleteApplicationById(appId.value);
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

const {execute: updateApplicationDetails, isLoading: isUpdating} = useAsyncFn(async () => {
    if (!appName.value.trim()) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Application name is required',
            life: 3000,
        });
        return;
    }

    await appRepo.updateApplication(appId.value, {
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

    if (!organization.value?.vbId) {
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
        walletId: walletId.value,
        orgId: orgId.value,
        appId: appId.value,
        name: appName.value.trim(),
        description: appDescription.value.trim(),
        website: appWebsite.value.trim(),
    });
}

// query used to identify if the application is found online (via the indexer)
const applicationVbId = computed(() =>
    typeof application.value?.vbId === 'string' ? application.value.vbId : undefined,
);
const walletIndexer = computed(() => wallet.value?.indexer);


const { data: applicationFoundOnChain, isLoading: isFetchingApplicationFromChain } = useQuery({
    enabled: computed(() => !!applicationVbId.value && !!walletIndexer.value),
    queryKey: ['application-on-chain', applicationVbId, walletIndexer],
    queryFn: async () => {
        const vbId = applicationVbId.value;
        const indexer = walletIndexer.value;
        if (!vbId || !indexer) return undefined;
        try {
            const foundApplicationsOnChain = await createIndexerClient(indexer).getApplications({ vb_id: vbId });
            if (foundApplicationsOnChain.items.length !== 1) return undefined;
            return foundApplicationsOnChain.items[0];
        } catch (e) {
            console.error(`Application not found online: ${e}`);
            return undefined;
        }
    },
})
const isApplicationFoundOnChain = computed(() => !!applicationFoundOnChain.value);
const fetchedApplicationName = computed(() => applicationFoundOnChain.value?.name);
const fetchedApplicationDescription = computed(() => applicationFoundOnChain.value?.description);
const fetchedApplicationWebsite = computed(() => applicationFoundOnChain.value?.homepageUrl);
const isNameDifferentFromForm = computed(() => isApplicationFoundOnChain.value && fetchedApplicationName.value !== appName.value);
const isDescriptionDifferentFromForm = computed(() => isApplicationFoundOnChain.value && fetchedApplicationDescription.value !== appDescription.value);
const isWebsiteDifferentFromForm = computed(() => isApplicationFoundOnChain.value && fetchedApplicationWebsite.value !== appWebsite.value);
const hasAccountOnChain = useHasAccountOnChainQuery(walletId.value);

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
    <div class="space-y-6">
        <div v-if="wallet && organization && application">
            <!-- Application Header -->
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-900">Application - {{ application.name }}</h2>
                <Button
                    @click="showDeleteConfirmDialog = true"
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    rounded
                    size="large"
                />
            </div>

            <!-- Application Cards Side-by-Side -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                <!-- Application Info Card -->
                <Card>
                    <template #title>
                        <div class="flex items-center gap-2">
                            <i class="pi pi-info-circle text-xl"></i>
                            <span>Application Info</span>
                        </div>
                    </template>
                    <template #content>
                        <div v-if="application.vbId" class="space-y-4">
                            <!-- Virtual Blockchain ID -->
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="pi pi-tag text-gray-600 text-sm"></i>
                                    <label class="text-sm font-semibold text-gray-700">Virtual Blockchain ID</label>
                                </div>
                                <p class="text-gray-700 text-sm leading-relaxed">
                                    {{ application.vbId }}
                                </p>
                            </div>

                            <!-- On-Chain Status -->
                            <div
                                v-if="isApplicationFoundOnChain === true"
                                class="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <i class="pi pi-check-circle text-green-600 text-lg"></i>
                                <span class="text-sm text-green-800 font-medium">Application confirmed on-chain</span>
                            </div>
                            <div
                                v-else-if="isApplicationFoundOnChain === false"
                                class="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg"
                            >
                                <i class="pi pi-exclamation-triangle text-amber-600 text-lg flex-shrink-0 mt-0.5"></i>
                                <span class="text-sm text-amber-800">
                                    Application not found on-chain. This may be due to network transaction processing delays.
                                </span>
                            </div>
                            <div
                                v-else-if="isFetchingApplicationFromChain"
                                class="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg"
                            >
                                <i class="pi pi-spin pi-spinner text-blue-600 text-lg"></i>
                                <span class="text-sm text-blue-800 font-medium">Checking on-chain status...</span>
                            </div>



                            <!-- Website -->
                            <div v-if="application.website" class="bg-gray-50 rounded-lg p-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="pi pi-globe text-gray-600 text-sm"></i>
                                    <label class="text-sm font-semibold text-gray-700">Website</label>
                                </div>
                                <a
                                    :href="application.website"
                                    target="_blank"
                                    class="text-blue-600 hover:text-blue-700 text-sm break-all flex items-center gap-1"
                                >
                                    {{ application.website }}
                                    <i class="pi pi-external-link text-xs"></i>
                                </a>
                            </div>

                            <!-- Description -->
                            <div v-if="application.description" class="bg-gray-50 rounded-lg p-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="pi pi-align-left text-gray-600 text-sm"></i>
                                    <label class="text-sm font-semibold text-gray-700">Description</label>
                                </div>
                                <p class="text-gray-700 text-sm leading-relaxed">
                                    {{ application.description }}
                                </p>
                            </div>


                        </div>
                        <div v-else class="text-center py-8">
                            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                                <i class="pi pi-exclamation-circle text-2xl text-amber-600"></i>
                            </div>
                            <p class="text-gray-600 text-sm">
                                Publish your application on-chain to see information.
                            </p>
                        </div>
                    </template>
                </Card>

                <!-- Application Details Form Card -->
                <Card>
                    <template #title>
                        <div class="flex items-center gap-2">
                            <i class="pi pi-pencil text-xl"></i>
                            <span>Application Details</span>
                        </div>
                    </template>
                    <template #content>
                        <form @submit.prevent="updateApplicationDetails" class="space-y-4">
                            <div>
                                <label for="app-name" class="block text-sm font-medium text-gray-700 mb-2">
                                    Name
                                    <span class="text-red-500">*</span>
                                </label>
                                <InputText
                                    id="app-name"
                                    v-model="appName"
                                    placeholder="Application name"
                                    class="w-full"
                                    required
                                />
                                <Message class="my-2" v-if="isNameDifferentFromForm"> This application has a different name online: {{ fetchedApplicationName }} </Message>

                            </div>
                            <div>
                                <label for="app-description" class="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <Textarea
                                    id="app-description"
                                    v-model="appDescription"
                                    placeholder="Application description"
                                    class="w-full"
                                    rows="3"
                                />
                                <Message class="my-2" v-if="isDescriptionDifferentFromForm"> This application has a different description online. </Message>

                            </div>
                            <div>
                                <label for="app-website" class="block text-sm font-medium text-gray-700 mb-2">
                                    Website
                                </label>
                                <InputText
                                    id="app-website"
                                    v-model="appWebsite"
                                    placeholder="https://..."
                                    class="w-full"
                                />
                                <Message class="my-2" v-if="isWebsiteDifferentFromForm"> This application has a different website online: {{ fetchedApplicationWebsite }} </Message>
                            </div>
                            <div class="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    label="Publish"
                                    icon="pi pi-cloud-upload"
                                    @click="showPublishConfirmDialog = true"
                                    :loading="isPublishingApplication"
                                    :disabled="isPublishingApplication || !hasAccountOnChain"
                                    severity="secondary"
                                    :hidden="!hasAccountOnChain"
                                    v-if="!isFormDirty"
                                />
                                <Button type="submit" label="Update Details" icon="pi pi-check" v-if="isFormDirty" :disabled="isUpdating" :loading="isUpdating" />
                            </div>
                        </form>
                    </template>
                </Card>
            </div>

            <!-- Publish Confirmation Dialog -->
            <Dialog
                v-model:visible="showPublishConfirmDialog"
                header="Publish Application"
                modal
                class="w-full max-w-md"
            >
                <div class="space-y-4">
                    <p class="text-gray-600">Are you sure you want to publish this application on-chain?</p>
                    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div class="flex gap-2">
                            <i class="pi pi-info-circle text-amber-600 mt-0.5"></i>
                            <p class="text-sm text-amber-800">
                                This action will create a virtual blockchain for your application and cannot be undone.
                            </p>
                        </div>
                    </div>
                </div>
                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            label="Cancel"
                            @click="showPublishConfirmDialog = false"
                            severity="secondary"
                            outlined
                        />
                        <Button
                            label="Confirm Publish"
                            @click="confirmPublishApplication"
                            icon="pi pi-cloud-upload"
                            :loading="isPublishingApplication"
                        />
                    </div>
                </template>
            </Dialog>

            <!-- Delete Confirmation Dialog -->
            <Dialog v-model:visible="showDeleteConfirmDialog" header="Delete Application" modal class="w-full max-w-md">
                <div class="space-y-4">
                    <p class="text-gray-600">
                        Are you sure you want to delete the application "{{ application.name }}"?
                    </p>
                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div class="flex gap-2">
                            <i class="pi pi-exclamation-triangle text-red-600 mt-0.5"></i>
                            <p class="text-sm text-red-800">This action cannot be undone.</p>
                        </div>
                    </div>
                </div>
                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button label="Cancel" @click="showDeleteConfirmDialog = false" severity="secondary" outlined />
                        <Button label="Delete" @click="confirmDeleteApplication" icon="pi pi-trash" severity="danger" />
                    </div>
                </template>
            </Dialog>
        </div>

        <!-- Not Found State -->
        <div v-else class="text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h1>
            <p class="text-gray-500 mb-6">The application you're looking for doesn't exist.</p>
            <Button @click="goBack" label="Back to Organization" icon="pi pi-arrow-left" />
        </div>
    </div>
</template>
