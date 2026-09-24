<script setup lang="ts">
import Button from "primevue/button";
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useToast} from "primevue/usetoast";
import OrganizationApplicationCreationDialog from "./OrganizationApplicationCreationDialog.vue";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import DataTable, {DataTableRowClickEvent} from "primevue/datatable";
import Column from "primevue/column";

const toast = useToast();
const router = useRouter();
const route = useRoute();

const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
const openCreateAppDialog = ref(false);
const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const {organizationApplications: applications, createApplication, deleteApplication: deleteApplicationById} = useCurrentOrganization();

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
                Applications ({{ applications.length }})
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
    </div>

    <OrganizationApplicationCreationDialog v-model:showAppDialog="openCreateAppDialog" />
</template>