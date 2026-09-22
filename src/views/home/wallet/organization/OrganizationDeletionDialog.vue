<script setup lang="ts">
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import {computed, ref} from "vue";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import * as orgRepo from "../../../../db/repositories/organizationRepository.ts";
import {useAsyncState} from "@vueuse/core";


const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

const toast = useToast();
const showDeletionDialog = defineModel<boolean>('showDeletionDialog');
const route = useRoute();
const router = useRouter();


const { state: organization } = useAsyncState(
    () => orgRepo.getOrganizationById(orgId.value),
    null,
    { immediate: true },
);

async function confirmDeleteOrganization() {
    showDeletionDialog.value = false;
    await orgRepo.deleteOrganizationById(orgId.value);
    toast.add({
        severity: 'success',
        summary: 'Organization deleted',
        detail: 'Organization deleted successfully',
        life: 3000,
    });
    visitWallet()
}


function visitWallet() {
    router.push(`/wallet/${walletId.value}`);
}
</script>
<template>
    <!-- Delete Confirmation Dialog -->
    <Dialog
        v-model:visible="showDeletionDialog"
        header="Delete Organization"
        modal
        class="w-full max-w-md"
    >
        <div class="space-y-4">
            <p class="text-gray-600" v-if="organization">
                Are you sure you want to delete the organization "{{ organization.name }}"?
            </p>
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                <div class="flex gap-2">
                    <i class="pi pi-exclamation-triangle text-red-600 mt-0.5"></i>
                    <p class="text-sm text-red-800">
                        This action will delete the organization and all its nodes. This cannot be undone.
                    </p>
                </div>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="showDeletionDialog = false" severity="secondary" outlined />
                <Button
                    label="Delete"
                    @click="confirmDeleteOrganization"
                    icon="pi pi-trash"
                    severity="danger"
                />
            </div>
        </template>
    </Dialog>
</template>