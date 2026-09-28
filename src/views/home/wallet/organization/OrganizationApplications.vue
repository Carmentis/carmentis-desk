<script setup lang="ts">
import Button from "primevue/button";
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useToast} from "primevue/usetoast";
import OrganizationApplicationCreationDialog from "./OrganizationApplicationCreationDialog.vue";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import DataTable, {DataTableRowClickEvent} from "primevue/datatable";
import Column from "primevue/column";
import TabPanel from "primevue/tabpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import Tabs from "primevue/tabs";
import TabPanels from "primevue/tabpanels";
import {useStorage} from "@vueuse/core";
import {useCurrentDate} from "../../../../stores/useCurrentDate.ts";
import {ApplicationDto, OrganizationDto} from "../../../../api/indexer/model";

const toast = useToast();
const router = useRouter();
const route = useRoute();

const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
const openCreateAppDialog = ref(false);
const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const {
    organizationApplications: applications,
    createApplication,
    importExistingApplication,
    deleteApplication: deleteApplicationById,
    useFoundApplicationsOnChain,
} = useCurrentOrganization();



async function deleteApplication(appId: number) {
    await deleteApplicationById(appId);
    toast.add({
        severity: 'success',
        summary: 'Application deleted',
        detail: 'Application deleted successfully',
        life: 3000,
    });
}

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

const now = useCurrentDate();
const foundApplicationsOnChain = useFoundApplicationsOnChain();
const onChainApplicationsCounter = computed(() => {
    if (foundApplicationsOnChain.isLoading.value) {
        return '.'.repeat(now.value.getSeconds() % 3 + 1);
    }

    if (foundApplicationsOnChain.error.value) {
        return ':(';
    }

    if (foundApplicationsOnChain.data.value) {
        return `(${foundApplicationsOnChain.data.value.length})`
    }

    return 0;
})
const activeTab = useStorage('activeApplicationTab', 'local', sessionStorage)
</script>
<template>
    <div
        v-if="isOrganizationFoundOnChain !== true"
        class="flex items-start gap-3 px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg"
    >
        <i class="pi pi-lock text-gray-500 mt-0.5 text-lg"></i>
        <div>
            <p class="text-sm font-medium text-gray-700">Feature locked</p>
            <p class="text-sm text-gray-500 mt-1">
                Application management is only available once the organization has
                been published on the Carmentis network.
            </p>
        </div>
    </div>
    <div v-else class="space-y-4">
        <!-- Applications Header -->
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
                Applications
            </h3>
            <div class="flex gap-2">
                <Button
                    @click="openCreateAppDialog = true"
                    label="Create App"
                    icon="pi pi-plus"
                    size="small"
                />
            </div>
        </div>


        <Tabs v-model:value="activeTab">
            <TabList>
                <Tab value="local">Local Applications ({{applications.length}})</Tab>
                <Tab value="on-chain">On-Chain Applications {{onChainApplicationsCounter}}</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="local">
                    <div class="mb-4">
                        <span class="font-bold">Below are displayed the applications associated with this organization, found locally.</span>
                        <div>
                            If an application is displayed here, then this application is stored in the local database.
                            If an application is displayed here but not in the on-chain applications, it means that
                            the application has been created locally but not published on the blockchain.
                        </div>
                    </div>

                    <!-- Applications Content -->
                    <div v-if="applications.length === 0" class="text-center py-8">
                        <div
                            class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3"
                        >
                            <i class="pi pi-box text-2xl text-gray-400"></i>
                        </div>
                        <p class="text-gray-500 text-sm mb-4">No application yet</p>
                    </div>
                    <div v-else class="space-y-3">
                        <DataTable
                            :value="applications"
                            stripedRows
                            showGridlines
                            responsiveLayout="scroll"
                            class="text-sm hover:cursor-pointer"
                            @rowClick=" (event: DataTableRowClickEvent<any>) => visitApplication(event.data.id)"
                        >
                            <Column field="name" header="name" sortable style="min-width: 150px"></Column>
                            <Column field="applicationVbId" header="Application ID" sortable style="min-width: 150px"/>
                        </DataTable>
                    </div>
                </TabPanel>
                <TabPanel value="on-chain">

                    <!-- Applications on-chain -->
                    <div class="mb-4">
                        <span class="font-bold">Below are displayed the applications associated with this organization found on-chain.</span>
                        <div>
                            If an application is displayed here but not in the local applications,
                            it means that the application has been created on the blockchain but not yet synchronized with the
                            local database. To import it, click on the application.
                        </div>
                    </div>
                    <DataTable
                        :value="foundApplicationsOnChain.data.value"
                        stripedRows
                        showGridlines
                        responsiveLayout="scroll"
                        class="text-sm hover:cursor-pointer"
                        @rowClick=" (event: DataTableRowClickEvent<any>) => importApplication(event.data)"
                    >
                        <Column field="name" header="name" sortable style="min-width: 150px"></Column>
                        <Column field="virtualBlockchainId" header="Application ID" sortable style="min-width: 150px"/>
                        <Column field="homepageUrl" header="Website" sortable style="min-width: 150px"/>
                        <Column field="description" header="Description" sortable style="min-width: 150px"/>
                    </DataTable>
                </TabPanel>
            </TabPanels>
        </Tabs>




    </div>

    <OrganizationApplicationCreationDialog v-model:showAppDialog="openCreateAppDialog" />
</template>