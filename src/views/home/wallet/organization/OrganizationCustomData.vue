<script setup lang="ts">
import DataTable from "primevue/datatable";
import Button from "primevue/button";
import Column from "primevue/column";
import {computed, ref} from "vue";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import {storeToRefs} from "pinia";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import {useOnChainStore} from "../../../../stores/onchain.ts";
import {useSessionStore} from "../../../../stores/sessionStore.ts";
import {useQuery} from "@tanstack/vue-query";
import {Hash, ProviderFactory, SectionType} from "@cmts-dev/carmentis-sdk-core";
import {useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../../db/repositories/walletRepository.ts";
import * as orgRepo from "../../../../db/repositories/organizationRepository.ts";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const onChainStore = useOnChainStore();
const sessionStore = useSessionStore();
const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
const { isPublishingCustomJson } = storeToRefs(onChainStore);

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

// Custom JSON publishing dialog
const showPublishCustomJsonDialog = ref(false);
const customJsonInput = ref('{\n  \n}');

const customJsonError = computed(() => {
    try {
        JSON.parse(customJsonInput.value);
        return '';
    } catch (e: unknown) {
        return e instanceof SyntaxError ? e.message : 'Invalid JSON';
    }
});

async function publishCustomJson() {
    if (customJsonError.value) return;
    await onChainStore.publishCustomJson({
        walletId: walletId.value,
        orgId: orgId.value,
        json: JSON.parse(customJsonInput.value),
    });
    showPublishCustomJsonDialog.value = false;
    await refetchCustomSections();
}
// Custom sections list
interface CustomSectionRow {
    height: number;
    hash: string;
    data: Record<string, unknown>;
}

const selectedCustomSection = ref<CustomSectionRow | null>(null);
const showCustomSectionDialog = ref(false);


function openCustomSectionDialog(row: CustomSectionRow) {
    selectedCustomSection.value = row;
    showCustomSectionDialog.value = true;
}

const {
    data: customSections,
    isLoading: isLoadingCustomSections,
    refetch: refetchCustomSections,
} = useQuery({
    queryKey: ['organization-custom-sections', orgId],
    enabled: computed(() => isOrganizationFoundOnChain.value === true),
    queryFn: async (): Promise<CustomSectionRow[]> => {
        if (!organization.value?.vbId || !wallet.value) return [];
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
        const orgVB = await provider.loadOrganizationVirtualBlockchain(Hash.from(organization.value.vbId));
        const hashes = orgVB.getAllMicroblockHashes();
        const rows: CustomSectionRow[] = [];
        for (let i = 0; i < hashes.length; i++) {
            const height = i + 1;
            const mb = await orgVB.getMicroblock(height);
            const customSecs = mb.getSectionsByType(SectionType.CUSTOM);
            if (customSecs.length > 0) {
                const { type: _type, ...data } = customSecs[0] as Record<string, unknown>;
                rows.push({ height, hash: hashes[i].encode(), data });
            }
        }
        return rows;
    },
});

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
                Custom on-chain data is only available once the organization has
                been published on the Carmentis network.
            </p>
        </div>
    </div>
    <div v-else class="space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
                Custom Sections On-Chain
            </h3>
            <Button
                label="Publish Custom Data"
                icon="pi pi-file-edit"
                size="small"
                @click="showPublishCustomJsonDialog = true"
            />
        </div>
        <DataTable
            :value="customSections ?? []"
            :loading="isLoadingCustomSections"
            size="small"
            striped-rows
            :rows="5"
            paginator
            :rows-per-page-options="[5, 10]"
            @row-click="(e) => openCustomSectionDialog(e.data)"
            row-hover
            class="cursor-pointer"
        >
            <template #empty>
                <div class="text-center py-4 text-gray-500 text-sm">
                    No custom sections found on-chain.
                </div>
            </template>
            <Column field="height" header="Height" style="width: 5rem" />
            <Column field="hash" header="Microblock Hash">
                <template #body="{ data: row }">
                    <code class="text-xs bg-gray-100 px-1 py-0.5 rounded truncate block max-w-xs">
                        {{ row.hash }}
                    </code>
                </template>
            </Column>
            <Column header="Action" style="width: 6rem">
                <template #body="{ data: row }">
                    <Button
                        icon="pi pi-eye"
                        label="View"
                        size="small"
                        text
                        @click.stop="openCustomSectionDialog(row)"
                    />
                </template>
            </Column>
        </DataTable>
    </div>


    <!-- Publish Custom Data Dialog -->
    <Dialog
        v-model:visible="showPublishCustomJsonDialog"
        header="Publish Custom Data"
        modal
        class="w-full max-w-2xl"
    >
        <div
            v-if="isOrganizationFoundOnChain !== true"
            class="flex items-start gap-3 px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg"
        >
            <i class="pi pi-lock text-gray-500 mt-0.5 text-lg"></i>
            <div>
                <p class="text-sm font-medium text-gray-700">Feature locked</p>
                <p class="text-sm text-gray-500 mt-1">
                    Publishing custom data is only available once the organization has been published on the
                    Carmentis network.
                </p>
            </div>
        </div>
        <template v-else>
            <p class="text-sm text-gray-500 mb-4">
                Publish a custom JSON payload on-chain as a new microblock section for this organization's
                virtual blockchain.
            </p>
            <div class="space-y-3">
                        <Textarea
                            v-model="customJsonInput"
                            rows="10"
                            class="w-full font-mono text-sm"
                            :class="{ 'border-red-400': customJsonError }"
                            placeholder='{ "key": "value" }'
                        />
                <div
                    v-if="customJsonError"
                    class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700"
                >
                    <i class="pi pi-exclamation-circle"></i>
                    {{ customJsonError }}
                </div>
            </div>
        </template>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button
                    label="Cancel"
                    @click="showPublishCustomJsonDialog = false"
                    severity="secondary"
                    outlined
                />
                <Button
                    v-if="isOrganizationFoundOnChain === true"
                    label="Publish On-Chain"
                    icon="pi pi-cloud-upload"
                    :loading="isPublishingCustomJson"
                    :disabled="isPublishingCustomJson || !!customJsonError"
                    @click="publishCustomJson"
                />
            </div>
        </template>
    </Dialog>

    <!-- Custom Section Detail Dialog -->
    <Dialog
        v-model:visible="showCustomSectionDialog"
        header="Custom Section"
        modal
        class="w-full max-w-2xl"
    >
        <div v-if="selectedCustomSection" class="space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="font-medium text-gray-600">Height</span>
                    <p class="mt-1 text-gray-900">{{ selectedCustomSection.height }}</p>
                </div>
                <div>
                    <span class="font-medium text-gray-600">Microblock Hash</span>
                    <code class="mt-1 block text-xs bg-gray-100 px-2 py-1 rounded break-all">
                        {{ selectedCustomSection.hash }}
                    </code>
                </div>
            </div>
            <div>
                <span class="font-medium text-gray-600 text-sm">Custom Data</span>
                <pre class="mt-1 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-auto max-h-96">{{ JSON.stringify(selectedCustomSection.data, null, 2) }}</pre>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end">
                <Button label="Close" @click="showCustomSectionDialog = false" severity="secondary" />
            </div>
        </template>
    </Dialog>
</template>