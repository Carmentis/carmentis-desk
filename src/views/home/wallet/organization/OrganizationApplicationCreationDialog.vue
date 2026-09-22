<script setup lang="ts">
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import {computed, ref} from "vue";
import * as appRepo from "../../../../db/repositories/applicationRepository.ts";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import {useAsyncState} from "@vueuse/core";
import {ApplicationEntity} from "../../../../stores/storage.ts";

const toast = useToast();
const showAppDialog = defineModel<boolean>('showAppDialog');
const appName = ref('');
const route = useRoute();
const router = useRouter();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const { execute: fetchApplications } = useAsyncState(
    () => appRepo.getApplicationsByOrgId(orgId.value),
    [] as ApplicationEntity[],
    { immediate: true },
);


async function submitAppDialog() {
    if (!appName.value) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Application name is required',
            life: 3000,
        });
        return;
    }
    const createdAppId = await appRepo.insertApplication(orgId.value, {
        name: appName.value,
    });
    await fetchApplications();
    toast.add({
        severity: 'success',
        summary: 'Application created',
        detail: `Application "${appName.value}" created successfully`,
        life: 3000,
    });
    showAppDialog.value = false;

    visitApplication(createdAppId);
}

function visitApplication(appId: number) {
    router.push(`/wallet/${walletId.value}/organization/${orgId.value}/application/${appId}`);
}
</script>

<template>
    <!-- Application Dialog -->
    <Dialog
        v-model:visible="showAppDialog"
        header="Create Application"
        modal
        class="w-full max-w-md"
    >
        <div class="space-y-4">
            <div>
                <label for="app-name" class="block text-sm font-medium text-gray-700 mb-2">
                    Application Name
                    <span class="text-red-500">*</span>
                </label>
                <InputText
                    id="app-name"
                    v-model="appName"
                    placeholder="Enter application name"
                    class="w-full"
                />
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="showAppDialog = false" severity="secondary" outlined />
                <Button
                    label="Create"
                    @click="submitAppDialog"
                    icon="pi pi-check"
                />
            </div>
        </template>
    </Dialog>
</template>