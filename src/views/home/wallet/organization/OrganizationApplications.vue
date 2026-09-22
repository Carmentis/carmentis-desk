<script setup lang="ts">
import Button from "primevue/button";
import {useQuery} from "@tanstack/vue-query";
import {computed, ref} from "vue";
import {createIndexerClient} from "../../../../api/indexer/client.ts";
import {useAsyncState} from "@vueuse/core";
import * as orgRepo from "../../../../db/repositories/organizationRepository.ts";
import {useRoute, useRouter} from "vue-router";
import * as walletRepo from "../../../../db/repositories/walletRepository.ts";
import * as appRepo from "../../../../db/repositories/applicationRepository.ts";
import {ApplicationEntity} from "../../../../stores/storage.ts";
import {useToast} from "primevue/usetoast";
import OrganizationApplicationCreationDialog from "./OrganizationApplicationCreationDialog.vue";

const toast = useToast();
const router = useRouter();
const route = useRoute();

const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
const openCreateAppDialog = ref(false);
const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const { state: applications, execute: fetchApplications } = useAsyncState(
    () => appRepo.getApplicationsByOrgId(orgId.value),
    [] as ApplicationEntity[],
    { immediate: true },
);


async function deleteApplication(appId: number) {
    await appRepo.deleteApplicationById(appId);
    await fetchApplications();
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
            <p class="text-gray-500 text-sm mb-4">No applications configured yet</p>
            <div class="flex gap-2 justify-center">
                <Button
                    @click="openCreateAppDialog = true"
                    label="Create Application"
                    icon="pi pi-plus"
                    size="small"
                />

            </div>
        </div>
        <div v-else class="space-y-3">
            <div
                v-for="app in applications"
                :key="app.id"
                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                @click="visitApplication(app.id)"
            >
                <div class="flex items-start justify-between">
                    <div class="space-y-2 flex-1">
                        <div class="font-medium text-gray-900">
                            {{ app.name }}
                        </div>
                        <div
                            v-if="app.vbId"
                            class="text-xs text-gray-500 flex items-center gap-2"
                        >
                            <i class="pi pi-tag"></i>
                            <code class="bg-gray-100 px-2 py-0.5 rounded">
                                {{ app.vbId }}
                            </code>
                        </div>
                    </div>
                    <Button
                        @click.stop="deleteApplication(app.id)"
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        rounded
                        size="small"
                    />
                </div>
            </div>
        </div>
    </div>

    <OrganizationApplicationCreationDialog v-model:showAppDialog="openCreateAppDialog" />
</template>