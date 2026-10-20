<script setup lang="ts">
import { computed, reactive, ref, watch, inject, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import { useAsyncState } from '@vueuse/core';
import * as walletRepo from '../../../../db/repositories/walletRepository.ts';
import * as orgRepo from '../../../../db/repositories/organizationRepository.ts';
import { createIndexerClient } from '../../../../api/indexer/client.ts';
import { useToast } from 'primevue/usetoast';
import { useOnChainActions } from '../../../../composables/useOnChainActions.ts';
import { useQuery } from '@tanstack/vue-query';
import OrganizationDeletionDialog from "./OrganizationDeletionDialog.vue";
import OrganizationPublicationDialog from "./OrganizationPublicationDialog.vue";
import OrganizationStateCard from "./OrganizationStateCard.vue";
import FieldNameAndDescription from "../../../../components/utils/FieldNameAndDescription.vue";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import {useCurrentWallet} from "../../../../composables/useCurrentWallet.ts";
import {useNavigation} from "../../../../composables/useNavigation.ts";

const toast = useToast();
const nav = useNavigation();
const onChainStore = useOnChainActions();
const { isPublishingOrganization  } = onChainStore;

const { organization, organizationVbId, updateOrganization } = useCurrentOrganization();
const {walletId, indexer, useHasAccountOnChainQuery} = useCurrentWallet();
const hasAccountOnChain = useHasAccountOnChainQuery();


const goBack = () => {
    nav.goToWallet(walletId.value);
};




// Organization Details Form
const orgName = ref('');
const orgCountryCode = ref('');
const orgCity = ref('');
const orgWebsite = ref('');

const savedForm = reactive({ name: '', countryCode: '', city: '', website: '' });

const isFormDirty = computed(
    () =>
        orgName.value.trim() !== savedForm.name ||
        orgCountryCode.value.trim() !== savedForm.countryCode ||
        orgCity.value.trim() !== savedForm.city ||
        orgWebsite.value.trim() !== savedForm.website,
);

// Publish confirmation dialog
const showPublishConfirmDialog = ref(false);


// Initialize form values when organization loads
function initializeForm() {
    if (organization.value) {
        orgName.value = organization.value.name;
        orgCountryCode.value = organization.value.countryCode || '';
        orgCity.value = organization.value.city || '';
        orgWebsite.value = organization.value.website || '';
        savedForm.name = orgName.value;
        savedForm.countryCode = orgCountryCode.value;
        savedForm.city = orgCity.value;
        savedForm.website = orgWebsite.value;
    }
}

// Watch for organization changes to initialize form
watch(
    organization,
    () => {
        if (organization.value) {
            initializeForm();
        }
    },
    { immediate: true },
);

async function updateOrganizationLocally() {
    if (!orgName.value.trim()) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Organization name is required',
            life: 3000,
        });
        return;
    }

    await updateOrganization({
        name: orgName.value.trim(),
        countryCode: orgCountryCode.value.trim() || undefined,
        city: orgCity.value.trim() || undefined,
        website: orgWebsite.value.trim() || undefined,
    })


    savedForm.name = orgName.value.trim();
    savedForm.countryCode = orgCountryCode.value.trim();
    savedForm.city = orgCity.value.trim();
    savedForm.website = orgWebsite.value.trim();

    toast.add({
        severity: 'success',
        summary: 'Organization updated',
        detail: 'Organization details updated successfully',
        life: 3000,
    });
}



// fetch the organization online using the indexer
const { data: organizationFetchedOnline, isLoading: isFetchingOrganizationFromChain } = useQuery({
    enabled: computed(() => !!organizationVbId.value && !!indexer),
    queryKey: ['organization-online', organizationVbId],
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
        const vbId = organizationVbId.value;
        if (!vbId || !indexer.value) {
            console.log('Organization not found online: vbId or indexer is undefined');
            return undefined;
        }
        const foundsOrgs = await indexer.value.getOrganizations({ vb_id: vbId });
        if (foundsOrgs.items.length !== 1) return undefined;
        return foundsOrgs.items[0];
    }
})


// define some computed properties based on the fetched organization
const isOrganizationFoundOnChain = computed(() => !!organizationFetchedOnline.value);
const fetchedOrganizationName = computed(() => organizationFetchedOnline.value?.name ?? organization.value?.name ?? '');
const fetchedOrganizationCountryCode = computed(() => organizationFetchedOnline.value?.countryCode ?? organization.value?.countryCode ?? '');
const fetchedOrganizationCity = computed(() => organizationFetchedOnline.value?.city ?? organization.value?.city ?? '');
const fetchedOrganizationWebsite = computed(() => organizationFetchedOnline.value?.website ?? organization.value?.website ?? '');
const isNameDifferent = computed(() => isOrganizationFoundOnChain.value && orgName.value.trim() !== fetchedOrganizationName.value);
const isCountryCodeDifferent = computed(() => isOrganizationFoundOnChain.value &&  orgCountryCode.value.trim() !== fetchedOrganizationCountryCode.value);
const isCityDifferent = computed(() => isOrganizationFoundOnChain.value && orgCity.value.trim() !== fetchedOrganizationCity.value);
const isWebsiteDifferent = computed(() => isOrganizationFoundOnChain.value && orgWebsite.value.trim() !== fetchedOrganizationWebsite.value);
const showDeletionDialog = ref(false);


</script>

<template>
    <div class="space-y-6">
        <div v-if="organization">
            <!-- Organization Header -->
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-900">Organization - {{ organization.name }}</h2>
                <div class="flex gap-2">
                    <Button
                        variant="outlined"
                        @click="goBack"
                    >Back to wallet</Button>
                    <Button
                        variant="outlined"
                        @click="showDeletionDialog = true"
                        severity="danger"
                    >Delete</Button>
                </div>
            </div>

            <!-- Organization Cards Side-by-Side -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                <!-- Organization State Card -->
                <OrganizationStateCard
                    v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"
                />

                <!-- Organization Details Form Card -->
                <Card>
                    <template #title>
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <i class="pi pi-pencil text-xl"></i>
                                <span>Organization Details</span>
                            </div>
                            <Tag v-if="isFormDirty" icon="pi pi-exclamation-circle" value="Unsaved changes" severity="warn" />
                        </div>
                    </template>
                    <template #content>
                        <p class="text-sm text-gray-500 mb-4">
                            These details describe your organization publicly on the Carmentis network. Keeping them
                            accurate helps partners and users identify and trust your organization when verifying
                            credentials or interacting with your applications.
                        </p>
                        <form @submit.prevent="updateOrganizationLocally" class="space-y-4">
                            <div>
                                <FieldNameAndDescription name="Organization name" description="Name of your organization" required/>
                                <InputText
                                    id="org-name"
                                    v-model="orgName"
                                    placeholder="Organization name"
                                    class="w-full"
                                    required
                                />
                                <Message class="my-2" v-if="isNameDifferent"> This organization has a different name online: {{ fetchedOrganizationName }} </Message>
                            </div>
                            <div>
                                <FieldNameAndDescription name="Country code" description="Coutry code where your organization is located" required/>
                                <InputText
                                    id="org-country-code"
                                    v-model="orgCountryCode"
                                    placeholder="e.g., US, FR, DE"
                                    class="w-full"
                                    required
                                />
                                <Message class="my-2" v-if="isCountryCodeDifferent"> This organization has a different country code online: {{ fetchedOrganizationCountryCode }} </Message>
                            </div>
                            <div>
                                <FieldNameAndDescription name="City" description="City where your organization is located"/>
                                <InputText id="org-city" v-model="orgCity" placeholder="City name" class="w-full" />
                                <Message class="my-2" v-if="isCityDifferent"> This organization has a city online: {{ fetchedOrganizationCity }} </Message>

                            </div>
                            <div>
                                <FieldNameAndDescription name="Website" description="Website of your organization"/>
                                <InputText
                                    id="org-website"
                                    v-model="orgWebsite"
                                    placeholder="https://..."
                                    class="w-full"
                                />
                                <Message class="my-2" v-if="isWebsiteDifferent"> This organization has a different website online: {{ fetchedOrganizationWebsite }} </Message>
                            </div>
                            <div class="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    label="Publish"
                                    icon="pi pi-cloud-upload"
                                    @click="showPublishConfirmDialog = true"
                                    :loading="isPublishingOrganization"
                                    v-if="hasAccountOnChain && !isFormDirty"
                                    :disabled="isPublishingOrganization"
                                    severity="secondary"
                                    :hidden="!hasAccountOnChain"
                                />
                                <Button
                                    type="submit"
                                    label="Update Details"
                                    icon="pi pi-check"
                                    v-if="isFormDirty"
                                    @click="updateOrganizationLocally"
                                />
                            </div>
                        </form>
                    </template>
                </Card>
            </div>


            <OrganizationPublicationDialog
                v-model:show-publish-confirm-dialog="showPublishConfirmDialog"
                v-model:org-name="orgName"
                v-model:org-city="orgCity"
                v-model:org-country-code="orgCountryCode"
                v-model:org-website="orgWebsite"
            />
            <OrganizationDeletionDialog v-model:show-deletion-dialog="showDeletionDialog"/>

        </div>

        <!-- Not Found State -->
        <div v-else class="text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Organization Not Found</h1>
            <p class="text-gray-500 mb-6">The organization you're looking for doesn't exist.</p>
            <Button @click="goBack" label="Back to Wallet" icon="pi pi-arrow-left" />
        </div>
    </div>
</template>
