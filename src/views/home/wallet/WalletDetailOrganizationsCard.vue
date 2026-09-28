<script setup lang="ts">
import Card from "primevue/card";
import Button from "primevue/button";
import {useAsyncState} from "@vueuse/core";
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useToast} from "primevue/usetoast";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import DataTable, {DataTableRowClickEvent} from "primevue/datatable";
import Column from "primevue/column";
import {useCurrentWallet} from "../../../composables/useCurrentWallet.ts";
import {OrganizationDto} from "../../../api/indexer/model";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import Tabs from "primevue/tabs";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import {useCurrentDate} from "../../../stores/useCurrentDate.ts";

const toast = useToast();
const router = useRouter();
const route = useRoute();

// organization management
const {walletOrganizations, createOrganization, importExistingOrganization, useFoundOrganizationsOnchain} = useCurrentWallet();
const walletId = computed(() => Number(route.params.walletId));
const showOrgDialog = ref(false);
const orgName = ref('');
const orgVbId = ref('');

const foundOrganizations = useFoundOrganizationsOnchain();

function openCreateOrgDialog() {
    orgName.value = '';
    orgVbId.value = '';
    showOrgDialog.value = true;
}

async function submitOrgDialog() {
    if (!orgName.value) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Organization name is required',
            life: 3000,
        });
        return;
    }

    await createOrganization(orgName.value);

    toast.add({
        severity: 'success',
        summary: 'Organization created',
        detail: `Organization "${orgName.value}" created successfully`,
        life: 3000,
    });
    showOrgDialog.value = false;
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
        summary: 'Organization created',
        detail: `Organization "${orgName.value}" created successfully`,
        life: 3000,
    });
}


const activeTab = ref("local");
const now = useCurrentDate();
const onChainOrganizationsCounter = computed(() => {
    if (foundOrganizations.isLoading.value) {
        return '.'.repeat(now.value.getSeconds() % 3 + 1);
    }

    if (foundOrganizations.error.value) {
        return ':(';
    }

    if (foundOrganizations.data.value) {
        return `(${foundOrganizations.data.value.length})`
    }

    return 0;
})
</script>
<template>

    <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
            <i class="pi pi-building text-xl"></i>
            <span>Organizations </span>
        </div>
        <div class="flex flex-wrap gap-2">
            <Button
                @click="openCreateOrgDialog"
                label="Create Org"
                icon="pi pi-plus"
                size="small"
            />

        </div>
    </div>

    <Tabs v-model:value="activeTab">
        <TabList>
            <Tab value="local">Local Organizations ({{ walletOrganizations.length }})</Tab>
            <Tab value="on-chain">On-Chain Organizations {{onChainOrganizationsCounter}}</Tab>
        </TabList>
        <TabPanels>
            <TabPanel value="local">
                <div class="mb-4">
                    <span class="font-bold">Below are displayed the organizations associated with this wallet, found locally.</span>
                    <div>
                        If an organization is displayed here, then this organization is stored in the local database.
                        If an organization is displayed here but not in the on-chain organization, it means that
                        the organization has been created locally but not published on the blockchain.
                    </div>
                </div>

                <div v-if="walletOrganizations.length === 0" class="text-center py-8">
                    <div
                        class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3"
                    >
                        <i class="pi pi-building text-2xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-sm mb-4">No organizations yet</p>
                    <div class="flex gap-2 justify-center">
                        <Button
                            @click="openCreateOrgDialog"
                            label="Create Organization"
                            icon="pi pi-plus"
                            size="small"
                        />
                    </div>
                </div>
                <div v-else class="space-y-3">
                    <DataTable
                        :value="walletOrganizations"
                        stripedRows
                        showGridlines
                        :paginator="walletOrganizations.length > 10"
                        :rows="10"
                        :rowsPerPageOptions="[5, 10, 20, 50]"
                        responsiveLayout="scroll"
                        class="text-sm hover:cursor-pointer"
                        @rowClick=" (event: DataTableRowClickEvent<any>) => visitOrganization(event.data.id)"
                    >
                        <Column field="name" header="name" sortable style="min-width: 150px"/>
                        <Column field="city" header="City" sortable/>
                        <Column field="countryCode" header="Country Code" sortable/>
                        <Column field="website" header="Website" sortable/>
                        <Column field="organizationVbId" header="Organization ID" sortable style="min-width: 150px"/>
                    </DataTable>
                </div>



            </TabPanel>

            <TabPanel value="on-chain">
                <!-- Applications on-chain -->
                <div class="mb-4">
                    <span class="font-bold">Below are displayed the organizations associated with this wallet found on-chain.</span>
                    <div>
                        If an organization is displayed here but not in the local organization,
                        it means that the organization has been created on the blockchain but not yet synchronized with the
                        local database. To import it, click on the organization.
                    </div>
                </div>
                <div>
                    <DataTable
                        :value="foundOrganizations.data.value"
                        stripedRows
                        showGridlines
                        responsiveLayout="scroll"
                        class="text-sm hover:cursor-pointer"
                        @rowClick=" (event: DataTableRowClickEvent<any>) => importOrganization(event.data)"
                    >
                        <Column field="name" header="name" sortable style="min-width: 150px"></Column>
                        <Column field="city" header="City" sortable/>
                        <Column field="countryCode" header="Country Code" sortable/>
                        <Column field="website" header="Website" sortable/>
                        <Column field="virtualBlockchainId" header="Organization ID" sortable style="min-width: 150px"/>
                        <Column>
                            <template #body>
                                <Button icon="pi pi-download" title="Import"/>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </TabPanel>
        </TabPanels>
    </Tabs>

    <!-- Organization Dialog -->
    <Dialog
        v-model:visible="showOrgDialog"
        :header="'Create Organization'"
        modal
        class="w-full max-w-md"
    >
        <div class="space-y-4">
            <div>
                <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name
                    <span class="text-red-500">*</span>
                </label>
                <InputText
                    id="org-name"
                    v-model="orgName"
                    placeholder="Enter organization name"
                    class="w-full"
                />
            </div>

        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="showOrgDialog = false" severity="secondary" outlined />
                <Button
                    :label="'Create'"
                    @click="submitOrgDialog"
                    icon="pi pi-check"
                />
            </div>
        </template>
    </Dialog>
</template>