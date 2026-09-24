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
</script>
<template>
    <!-- Organizations Card -->
    <Card>
        <template #title>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <i class="pi pi-building text-xl"></i>
                    <span>Organizations ({{ walletOrganizations.length }})</span>
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
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Legal entities registered on the Carmentis network. Each organization can run validator
                nodes and deploy applications.
            </p>
        </template>
        <template #content>
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
                    <Column field="name" header="name" sortable style="min-width: 150px"></Column>
                    <Column field="organizationVbId" header="Virtual Blockchain ID" sortable style="min-width: 150px"/>
                </DataTable>



                <!--div
                    v-for="org in organizations"
                    :key="org.id"
                    class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    @click="visitOrganization(org.id)"
                >
                    <div class="flex items-start justify-between">
                        <div class="space-y-2 flex-1">
                            <div class="flex items-center gap-3">
                                <div class="font-medium text-gray-900">
                                    {{ org.name }}
                                </div>
                                <div
                                    v-if="org.vbId"
                                    class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                                >
                                    <i class="pi pi-tag"></i>
                                    {{ org.vbId }}
                                </div>
                            </div>
                            <div class="text-sm text-gray-600 space-y-1">
                                <div class="flex items-center gap-4">
                                </div>
                            </div>
                        </div>
                        <i class="pi pi-chevron-right text-gray-400"></i>
                    </div>
                </div-->
            </div>



        </template>
    </Card>

    <!-- Organizations found online -->
    <Card v-if="foundOrganizations.data.value" class="mt-4">
        <template #title>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <i class="pi pi-building text-xl"></i>
                    <span>Found {{foundOrganizations.data.value.length}} organizations on-chain </span>
                </div>

            </div>
        </template>
        <template #content>
            <p>Click on an organization row to import it. Note: You can only import organizations that are not already in your wallet.</p>
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
                    <Column field="virtualBlockchainId" header="Virtual Blockchain ID" sortable style="min-width: 150px"/>
                    <Column>
                        <template #body>
                            <Button icon="pi pi-download" title="Import"/>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </template>
    </Card>

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