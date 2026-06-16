<script setup lang="ts">
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import {useRoute, useRouter} from "vue-router";
import {useOnChainStore} from "../../../../stores/onchain.ts";
import {computed} from "vue";
import {storeToRefs} from "pinia";

const showPublishConfirmDialog = defineModel<boolean>('showPublishConfirmDialog');
const orgName = defineModel<string>('orgName');
const orgCountryCode = defineModel<string>('orgCountryCode');
const orgCity = defineModel<string>('orgCity');
const orgWebsite = defineModel<string>('orgWebsite');
const emits = defineEmits(['updateOrganizationDetails'])

const route = useRoute();
const onChainStore = useOnChainStore();
const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const { isPublishingOrganization } = storeToRefs(onChainStore);


async function confirmPublishOrganization() {
    showPublishConfirmDialog.value = false;
    // update organization details locally
    await emits('updateOrganizationDetails');

    // publish information on-chain
    await onChainStore.publishOrganization({
        walletId: walletId.value,
        orgId: orgId.value,
        organizationName: orgName.value!!.trim(),
        countryCode: orgCountryCode.value!!.trim(),
        city: orgCity.value!!.trim(),
        website: orgWebsite.value!!.trim(),
    });
}
</script>
<template>
    <!-- Publish Confirmation Dialog -->
    <Dialog
        v-model:visible="showPublishConfirmDialog"
        header="Publish Organization"
        modal
        class="w-full max-w-md"
    >
        <div class="space-y-4">
            <p class="text-gray-600">Are you sure you want to publish this organization on-chain?</p>
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div class="flex gap-2">
                    <i class="pi pi-info-circle text-amber-600 mt-0.5"></i>
                    <p class="text-sm text-amber-800">
                        This action will create a virtual blockchain for your organization and cannot be undone.
                    </p>
                </div>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button
                    label="Cancel"
                    @click="showPublishConfirmDialog = false"
                    severity="secondary"
                    outlined
                />
                <Button
                    label="Confirm Publish"
                    @click="confirmPublishOrganization"
                    icon="pi pi-cloud-upload"
                    :loading="isPublishingOrganization"
                />
            </div>
        </template>
    </Dialog>
</template>