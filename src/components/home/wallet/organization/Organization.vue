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
import * as nodeRepo from '../../../../db/repositories/nodeRepository';
import * as appRepo from '../../../../db/repositories/applicationRepository';
import { computedAsync } from '@vueuse/core';
import {
    CarmentisError,
    CryptoEncoderFactory,
    EncoderFactory,
    Hash,
    LockType,
    ProviderFactory,
    SectionType,
    SeedEncoder,
    SignatureSchemeId,
    Utils,
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
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

const { state: organization, execute: fetchOrg } = useAsyncState(
    () => orgRepo.getOrganizationById(orgId.value),
    null,
    { immediate: true },
);


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

// Delete confirmation dialog
const showDeleteConfirmDialog = ref(false);


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

const { data: isOrganizationFoundOnChain, isLoading: isFetchingOrganizationFromChain } = useQuery({
    enabled: computed(() => !!organizationVbId.value && !!walletIndexer.value),
    queryKey: ['organization-on-chain', organizationVbId, walletIndexer],
    refetchInterval: 2000,
    queryFn: async () => {
        const vbId = organizationVbId.value;
        const indexer = walletIndexer.value;
        if (!vbId || !indexer) return false;
        try {
            const result = await createIndexerClient(indexer).getOrganizations({ vb_id: vbId });
            return result.items.length > 0;
        } catch (e) {
            console.error(`Organization not found online: ${e}`);
            return false;
        }
    },
});

const showDeletionDialog = ref(false);
const showOrganizationPublicationDialog = ref(false);

const hasAccountOnChain = useHasAccountOnChainQuery(walletId.value);

const items = [
    {
        label: 'Delete',
        icon: 'pi pi-trash',
        severity: 'danger',
        command: () => (showDeleteConfirmDialog.value = true),
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
                <Card>
                    <template #title>
                        <div class="flex items-center gap-2">
                            <i class="pi pi-info-circle text-xl"></i>
                            <span>Organization State</span>
                        </div>
                    </template>
                    <template #subtitle>
                        On-chain status of this organization and its associated nodes and applications.
                    </template>
                    <template #content>
                        <div v-if="organization.vbId">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Blockchain ID</label>
                            <code class="bg-gray-100 px-3 py-2 rounded text-sm block">
                                {{ organization.vbId }}
                            </code>

                            <div
                                v-if="isOrganizationFoundOnChain === true"
                                class="mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <i class="pi pi-check-circle text-green-600"></i>
                                <span class="text-sm text-green-800">Organization confirmed on-chain</span>
                            </div>
                            <div
                                v-else-if="isOrganizationFoundOnChain === false"
                                class="mt-4 flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg"
                            >
                                <i class="pi pi-exclamation-triangle text-amber-600 mt-0.5"></i>
                                <span class="text-sm text-amber-800">
                                    Organization not found on-chain. This may be due to network transaction processing
                                    delays.
                                </span>
                            </div>
                            <div
                                v-else-if="isFetchingOrganizationFromChain"
                                class="mt-4 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg"
                            >
                                <i class="pi pi-spin pi-spinner text-blue-600"></i>
                                <span class="text-sm text-blue-800">Checking on-chain status...</span>
                            </div>
                        </div>
                        <div v-else class="text-center py-4">
                            <i class="pi pi-exclamation-circle text-3xl text-amber-500 mb-2"></i>
                            <p class="text-gray-600 text-sm">
                                Publish first your organization on-chain to show information.
                            </p>
                        </div>

                        <!-- Nodes, Applications & Custom Data Tabs -->
                        <div class="mt-6">
                            <Tabs value="0">
                                <TabList>
                                    <Tab value="0">Nodes</Tab>
                                    <Tab value="1">Applications</Tab>
                                    <Tab value="2">Custom Data</Tab>
                                </TabList>
                                <TabPanels>
                                    <TabPanel value="0">
                                        <OrganizationNodes v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"/>
                                    </TabPanel>

                                    <TabPanel value="1">
                                        <OrganizationApplications v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"/>
                                    </TabPanel>
                                    <TabPanel value="2">
                                        <OrganizationCustomData v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"/>
                                    </TabPanel>
                                </TabPanels>
                            </Tabs>
                        </div>
                    </template>
                </Card>

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
                                <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
                                    Name
                                    <span class="text-red-500">*</span>
                                </label>
                                <InputText
                                    id="org-name"
                                    v-model="orgName"
                                    placeholder="Organization name"
                                    class="w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label for="org-country-code" class="block text-sm font-medium text-gray-700 mb-2">
                                    Country Code
                                </label>
                                <InputText
                                    id="org-country-code"
                                    v-model="orgCountryCode"
                                    placeholder="e.g., US, FR, DE"
                                    class="w-full"
                                />
                            </div>
                            <div>
                                <label for="org-city" class="block text-sm font-medium text-gray-700 mb-2">City</label>
                                <InputText id="org-city" v-model="orgCity" placeholder="City name" class="w-full" />
                            </div>
                            <div>
                                <label for="org-website" class="block text-sm font-medium text-gray-700 mb-2">
                                    Website
                                </label>
                                <InputText
                                    id="org-website"
                                    v-model="orgWebsite"
                                    placeholder="https://..."
                                    class="w-full"
                                />
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
