<script setup lang="ts">
import { computed, reactive, ref, watch, inject, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import MenuBar from 'primevue/menubar';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { NodeEntity, ApplicationEntity } from '../../../../stores/storage';
import { useAsyncState } from '@vueuse/core';
import * as walletRepo from '../../../../db/repositories/walletRepository';
import * as orgRepo from '../../../../db/repositories/organizationRepository';
import Message from 'primevue/message';
import { createIndexerClient } from '../../../../api/indexer/client.ts';
import { useToast } from 'primevue/usetoast';
import { useOnChainStore } from '../../../../stores/onchain.ts';
import { useSessionStore } from '../../../../stores/sessionStore.ts';
import { storeToRefs } from 'pinia';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import { useQuery } from '@tanstack/vue-query';
import { useHasAccountOnChainQuery } from '../../../../composables/useAccountBreakdown.ts';
import OrganizationApplicationCreationDialog from "./OrganizationApplicationCreationDialog.vue";
import OrganizationDeletionDialog from "./OrganizationDeletionDialog.vue";
import OrganizationApplications from "./OrganizationApplications.vue";
import OrganizationNodes from "./OrganizationNodes.vue";
import OrganizationCustomData from "./OrganizationCustomData.vue";
import OrganizationPublicationDialog from "./OrganizationPublicationDialog.vue";
import OrganizationStateCard from "./OrganizationStateCard.vue";
import FieldNameAndDescription from "../../../utils/FieldNameAndDescription.vue";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const onChainStore = useOnChainStore();
const { isPublishingOrganization  } = storeToRefs(onChainStore);

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

// we search for the organization
const {data: organization, refetch: fetchOrg} = useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
        const org = await orgRepo.getOrganizationById(orgId.value);
        if (!org) {
            throw new Error('Organization not found');
        }
        return org;
    },
    refetchIntervalInBackground: true,
    refetchInterval: 500,
    enabled: !!orgId.value,
})


const goBack = () => {
    router.push(`/wallet/${walletId.value}`);
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

async function updateOrganizationDetails() {
    if (!orgName.value.trim()) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Organization name is required',
            life: 3000,
        });
        return;
    }

    await orgRepo.updateOrganization(orgId.value, {
        name: orgName.value.trim(),
        countryCode: orgCountryCode.value.trim() || undefined,
        city: orgCity.value.trim() || undefined,
        website: orgWebsite.value.trim() || undefined,
    });
    await fetchOrg();

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


// query used to identify if the organization is found online (via the indexer)
const organizationVbId = computed(() =>
    typeof organization.value?.vbId === 'string' ? organization.value.vbId : undefined,
);
const walletIndexer = computed(() => wallet.value?.indexer);

// fetch the organization online using the indexer
const { data: organizationFetchedOnline, isLoading: isFetchingOrganizationFromChain } = useQuery({
    enabled: computed(() => !!organizationVbId.value && !!walletIndexer.value),
    queryKey: ['organization-online', organizationVbId, walletIndexer],
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
        const vbId = organizationVbId.value;
        const indexer = walletIndexer.value;
        if (!vbId || !indexer) {
            console.log('Organization not found online: vbId or indexer is undefined');
            return undefined;
        }
        const foundsOrgs = await createIndexerClient(indexer).getOrganizations({ vb_id: vbId });
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
const isNameDifferent = computed(() => orgName.value.trim() !== fetchedOrganizationName.value);
const isCountryCodeDifferent = computed(() => orgCountryCode.value.trim() !== fetchedOrganizationCountryCode.value);
const isCityDifferent = computed(() => orgCity.value.trim() !== fetchedOrganizationCity.value);
const isWebsiteDifferent = computed(() => orgWebsite.value.trim() !== fetchedOrganizationWebsite.value);


const showDeletionDialog = ref(false);

const hasAccountOnChain = useHasAccountOnChainQuery(walletId.value);

const items = [
    {
        label: 'Delete',
        icon: 'pi pi-trash',
        severity: 'danger',
        command: () => (showDeletionDialog.value = true),
        outlined: true,
    },
];
</script>

<template>
    <div class="space-y-6">
        <div v-if="wallet && organization">
            <div class="mb-4">
                <MenuBar :model="items" />
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
                        <form @submit.prevent="updateOrganizationDetails" class="space-y-4">
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
                                    :disabled="isPublishingOrganization || !hasAccountOnChain"
                                    severity="secondary"
                                    :hidden="!hasAccountOnChain"
                                />
                                <Button type="submit" label="Update Details" icon="pi pi-check" :disabled="!isFormDirty" />
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
