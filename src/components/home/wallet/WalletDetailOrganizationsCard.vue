<script setup lang="ts">
import Card from "primevue/card";
import Button from "primevue/button";
import {useAsyncState} from "@vueuse/core";
import * as orgRepo from "../../../db/repositories/organizationRepository.ts";
import {computed, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useToast} from "primevue/usetoast";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";

const toast = useToast();
const router = useRouter();
const route = useRoute();

// organization management
const walletId = computed(() => Number(route.params.walletId));
const showOrgDialog = ref(false);
const orgDialogMode = ref<'create' | 'import'>('create');
const orgName = ref('');
const orgVbId = ref('');

const { state: organizations, execute: fetchOrgs } = useAsyncState(
    () => orgRepo.getOrganizationsByWalletId(walletId.value),
    [],
    { immediate: true },
);

function openCreateOrgDialog() {
    orgDialogMode.value = 'create';
    orgName.value = '';
    orgVbId.value = '';
    showOrgDialog.value = true;
}

function openImportOrgDialog() {
    orgDialogMode.value = 'import';
    orgName.value = '';
    orgVbId.value = '';
    showOrgDialog.value = true;
}

async function submitOrgDialog() {
    if (orgDialogMode.value === 'create') {
        if (!orgName.value) {
            toast.add({
                severity: 'error',
                summary: 'Validation error',
                detail: 'Organization name is required',
                life: 3000,
            });
            return;
        }
        await orgRepo.insertOrganization(walletId.value, {
            name: orgName.value,
            city: '',
            countryCode: '',
            website: '',
        });
        await fetchOrgs();
        toast.add({
            severity: 'success',
            summary: 'Organization created',
            detail: `Organization "${orgName.value}" created successfully`,
            life: 3000,
        });
    } else {
        if (!orgVbId.value) {
            toast.add({
                severity: 'error',
                summary: 'Validation error',
                detail: 'VB ID is required for import',
                life: 3000,
            });
            return;
        }
        if (!orgName.value) {
            toast.add({
                severity: 'error',
                summary: 'Validation error',
                detail: 'Organization name is required for import',
                life: 3000,
            });
            return;
        }
        await orgRepo.insertOrganization(walletId.value, {
            name: orgName.value,
            vbId: orgVbId.value,
        });
        await fetchOrgs();
        toast.add({
            severity: 'success',
            summary: 'Organization imported',
            detail: 'Organization imported successfully',
            life: 3000,
        });
    }
    showOrgDialog.value = false;
}

function visitOrganization(orgId: number) {
    router.push(`/wallet/${walletId.value}/organization/${orgId}`);
}

</script>
<template>
    <!-- Organizations Card -->
    <Card>
        <template #title>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <i class="pi pi-building text-xl"></i>
                    <span>Organizations ({{ organizations.length }})</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <Button
                        @click="openCreateOrgDialog"
                        label="Create Org"
                        icon="pi pi-plus"
                        size="small"
                    />
                    <Button
                        @click="openImportOrgDialog"
                        label="Import Org"
                        icon="pi pi-download"
                        size="small"
                        outlined
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
            <div v-if="organizations.length === 0" class="text-center py-8">
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
                    <Button
                        @click="openImportOrgDialog"
                        label="Import Organization"
                        icon="pi pi-download"
                        size="small"
                        outlined
                    />
                </div>
            </div>
            <div v-else class="space-y-3">
                <div
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
                </div>
            </div>
        </template>
    </Card>

    <!-- Organization Dialog -->
    <Dialog
        v-model:visible="showOrgDialog"
        :header="orgDialogMode === 'create' ? 'Create Organization' : 'Import Organization'"
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
            <div v-if="orgDialogMode === 'import'">
                <label for="org-vbid" class="block text-sm font-medium text-gray-700 mb-2">
                    Virtual Blockchain ID
                    <span class="text-red-500">*</span>
                </label>
                <InputText id="org-vbid" v-model="orgVbId" placeholder="Enter VB ID" class="w-full" />
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="showOrgDialog = false" severity="secondary" outlined />
                <Button
                    :label="orgDialogMode === 'create' ? 'Create' : 'Import'"
                    @click="submitOrgDialog"
                    icon="pi pi-check"
                />
            </div>
        </template>
    </Dialog>
</template>