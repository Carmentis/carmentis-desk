
<script setup lang="ts">
import "reflect-metadata";
import {computed, ref, watch} from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import StepPanels from 'primevue/steppanels';
import Step from 'primevue/step';
import StepPanel from 'primevue/steppanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import {computedAsync} from "@vueuse/core";
import {useToast} from "primevue/usetoast";
import {CertificatesChain} from "../../../../utils/CertificatesChain.ts";
import {Certificate} from "../../../../utils/Certificate.ts";
import {WalletUtils} from "../../../../utils/WalletUtils.ts";
import {UnsecuredJWT, jwtVerify, decodeJwt} from "jose";
import {JwkSignatureKeyExporter} from "../../../../utils/jwk-signature-key-exporter.ts";
import {importJWK} from "jose";
import {useClipboard} from "../../../../composables/useClipboard.ts";
import {useRoute} from "vue-router";
import {useOnChainStore} from "../../../../stores/onchain.ts";
import {storeToRefs} from "pinia";
import * as orgRepo from "../../../../db/repositories/organizationRepository.ts";
import {CustomSection, SectionType, Hash, ProviderFactory} from "@cmts-dev/carmentis-sdk-core";
import {useAsyncState} from "@vueuse/core";
import {useQuery} from "@tanstack/vue-query";
import * as walletRepo from "../../../../db/repositories/walletRepository.ts";
import {DeskLogger} from "../../../../utils/DeskLogger.ts";
import {
    isCertificateStoreAvailable,
    listCertificates,
    getCertificateChainPem,
    signData,
    type CertificateInfo,
} from "../../../../utils/signing.ts";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import {useCurrentWallet} from "../../../../composables/useCurrentWallet.ts";

// define toast, clipboard and route
const logger = DeskLogger.getLogger().getChild("organization")
const clipboard = useClipboard();
const toast = useToast();
const route = useRoute();
const onChainStore = useOnChainStore();
const isSigningWithStore = ref(false);

const walletId =  computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

// Dialog model
const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');

// chain of certificates
const certificatesChain = ref<string[]>([]);
const certificatesList = ref<Array<{pem: string; cn: string; keyType: string}>>([]);

// Platform check; the certificate store selector only makes sense on Windows for now.
const canUseCertificateStore = computedAsync(async () => {
    return await isCertificateStoreAvailable();
}, false);

// Default to visible; collapse automatically once we know the store is usable.
const showManualEntry = ref(true);

watch(canUseCertificateStore, (available) => {
    if (available) refreshStoreCertificates();
    showManualEntry.value = !available;
}, { immediate: true });

// Certificates available in the OS store (if available).
const storeCertificates = ref<CertificateInfo[]>([]);
const isLoadingStoreCertificates = ref(false);

const refreshStoreCertificates = async () => {
    if (!canUseCertificateStore.value) return;
    try {
        isLoadingStoreCertificates.value = true;
        storeCertificates.value = await listCertificates();
    } catch (error) {
        console.error("Error listing certificates:", error);
        toast.add({ severity: 'error', summary: "Error", detail: "Failed to list certificates from store.", life: 3000 });
    } finally {
        isLoadingStoreCertificates.value = false;
    }
};

// Tracks which store certificate (if any) is driving the current chain,
// so step 2 knows whether it can offer in-app signing.
const selectedStoreCertThumbprint = ref<string | null>(null);

// Shared logic for adding a single PEM to the chain, used by both the
// manual textarea flow and the store selection flow.
const pushCertificateToChain = async (pem: string): Promise<string> => {
    const cert = await Certificate.importFromPem(pem);
    const cn = cert.getCN();
    certificatesList.value.push({ pem, cn, keyType: cert.getKeyType() });
    certificatesChain.value.push(pem);
    return cn;
};


const isValidChain = computedAsync(async () => {
    if (certificatesChain.value.length === 0) return null;
    return CertificatesChain.verifyX509Chain(certificatesChain.value);
});


// form state
const certificateInput = ref("");
const isLoadingCert = ref(false);

// dialog opening state
const showOpenDialog = ref(false);


const addCertificate = async () => {
    const pem = certificateInput.value.trim();
    if (!pem) {
        toast.add({ summary: "Empty input", detail: "Please paste a certificate in PEM format", life: 3000 });
        return;
    }

    try {
        isLoadingCert.value = true;
        const cn = await pushCertificateToChain(pem);
        certificateInput.value = "";
        toast.add({ summary: "Success", detail: `Certificate added: ${cn}`, life: 3000 });
    } catch (error) {
        console.error("Error importing certificate:", error);
        toast.add({ severity: 'error', summary: "Error", detail: "Failed to parse certificate. Ensure it's in valid PEM format.", life: 3000 });
    } finally {
        isLoadingCert.value = false;
    }
};

const removeCertificate = (index: number) => {
    certificatesList.value.splice(index, 1);
    certificatesChain.value.splice(index, 1);
    // If the chain no longer matches a store selection, drop the flag so
    // step 2 falls back to the manual signing path.
    selectedStoreCertThumbprint.value = null;
};

// Step 3: Anchor Certificate
const isAnchoringCertificate = ref(false);
const hasAnchoredCertificate = ref(false);

const anchorCertificate = async () => {
    if (!walletId.value) throw new Error("No wallet id defined");

    try {
        isAnchoringCertificate.value = true;

        // Publish the certificate chain and signed JWT as custom data
        const customData: CustomSection = {
            type: SectionType.CUSTOM,
            __certificate__: {
                x5c: certificatesChain.value,
            }
        }

        await onChainStore.publishCustomJson({
            orgId: orgId.value,
            json: customData,
        });

        hasAnchoredCertificate.value = true;
        await refetchCertificateSections();
        toast.add({ severity: 'success', summary: "Success", detail: "Certificate chain anchored on-chain", life: 3000 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error anchoring certificate:", error);
        toast.add({ severity: 'error', summary: "Anchoring failed", detail: errorMessage, life: 3000 });
    } finally {
        isAnchoringCertificate.value = false;
    }
};

// Load anchored certificates from on-chain
const {organization} = useCurrentOrganization();
const {walletProvider} = useCurrentWallet();

interface CertificateSectionRow {
    height: number;
    hash: string;
    issuer?: string;
    data: Record<string, unknown>;
}

const selectedCertificateSection = ref<CertificateSectionRow | null>(null);
const showCertificateSectionDialog = ref(false);

const {
    data: certificateSections,
    isLoading: isLoadingCertificateSections,
    refetch: refetchCertificateSections,
} = useQuery({
    queryKey: ['organization-x509-certificate-sections', orgId],
    enabled: computed(() => isOrganizationFoundOnChain.value === true),
    queryFn: async (): Promise<CertificateSectionRow[]> => {
        if (!organization.value?.organizationVbId || !walletProvider.value) {
            console.error("Some depend", organization.value, walletProvider.value)
            logger.warning("Some dependencies are not defined: aborting certificate searching")
            return [];
        };
        const provider = walletProvider.value;
        const orgVB = await provider.loadOrganizationVirtualBlockchain(Hash.from(organization.value.organizationVbId));
        const vbHeight = orgVB.getHeight();
        const rows: CertificateSectionRow[] = [];
        for (let height = 1; height <= vbHeight; height++) {
            logger.info(`Processing microblock ${height} of ${vbHeight}`)
            const mb = await orgVB.getMicroblock(height);
            const customSecs = mb.getSectionsByType(SectionType.CUSTOM);
            for (const sec of customSecs) {
                const data = sec as Record<string, unknown>;
                if (data.__certificate__) {
                    rows.push({ height, hash: mb.getHash().encode(), data });
                }
            }
        }
        return rows;
    },
});


</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">Publish X509 Certificate</h2>
            <p class="text-sm text-gray-600 mb-4">
                Publish an X509 certificate to cryptographically prove your organization's identity on the Carmentis network.
            </p>
        </div>

        <!-- Lock message if organization not on-chain -->
        <div
            v-if="isOrganizationFoundOnChain !== true"
            class="flex items-start gap-3 px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg"
        >
            <i class="pi pi-lock text-gray-500 mt-0.5 text-lg"></i>
            <div>
                <p class="text-sm font-medium text-gray-700">Feature locked</p>
                <p class="text-sm text-gray-500 mt-1">
                    Certificate management is only available once the organization has been published on the Carmentis network.
                </p>
            </div>
        </div>

        <!-- Anchored Certificates Section -->
        <div v-if="isOrganizationFoundOnChain === true" class="space-y-4">
            <div class="flex justify-between items-center">
                <p class="text-gray-900">
                    Below are listed anchored x509 certificates.
                </p>
            </div>

            <!-- Certificates Table -->
            <DataTable
                :value="certificateSections ?? []"
                :loading="isLoadingCertificateSections"
                size="small"
                striped-rows
                :rows="5"
                paginator
                :rows-per-page-options="[5, 10]"
                @row-click="(e) => { selectedCertificateSection = e.data; showCertificateSectionDialog = true; }"
                row-hover
                class="cursor-pointer"
            >
                <template #empty>
                    <div class="text-center py-4 text-gray-500 text-sm">
                        No certificates anchored yet. Click "Publish New Certificate" to get started.
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
                            @click.stop="() => {
                                selectedCertificateSection = row;
                                showCertificateSectionDialog = true
                            }"
                        />
                    </template>
                </Column>
            </DataTable>

            <div class="flex justify-end">
                <Button
                    label="Publish New Certificate"
                    icon="pi pi-plus"
                    size="small"
                    @click="showOpenDialog = true"
                />
            </div>
        </div>

        <!-- Attach button for when organization is not on-chain -->
        <Button
            v-if="isOrganizationFoundOnChain !== true"
            label="Attach x509 Certificates"
            icon="pi pi-lock"
            @click="showOpenDialog = true"
            disabled
        />
    </div>

    <Dialog
        v-model:visible="showOpenDialog"
        header="Attach x509 Certificates"
        modal
        class="w-full max-w-4xl"
    >
        <div class="flex justify-center">
            <div class="space-y-6 py-6">
                <!-- Certificate Input -->
                <div>
                    <!-- Manual PEM entry -->
                    <div v-if="showManualEntry" class="mt-4">
                        <label class="block text-sm font-medium text-gray-900 mb-2">
                            Add a certificate in PEM format
                        </label>
                        <textarea
                            v-model="certificateInput"
                            placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                            class="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <Button
                            label="Add Certificate"
                            icon="pi pi-plus"
                            :loading="isLoadingCert"
                            class="mt-3"
                            @click="addCertificate"
                        />
                    </div>
                </div>

                <!-- Chain Validation Status -->
                <div v-if="certificatesList.length > 0">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-sm font-medium text-gray-700">Chain Validation:</span>
                        <Tag
                            v-if="isValidChain?.status === 'valid'"
                            value="Valid chain"
                            severity="success"
                            icon="pi pi-check"
                        />
                        <Tag
                            v-else-if="isValidChain?.status === 'incomplete'"
                            value="Chain incomplete (root not provided)"
                            severity="warn"
                            icon="pi pi-exclamation-triangle"
                        />
                        <Tag v-else-if="isValidChain?.status === 'invalid'"
                             :value="isValidChain.reason"
                             severity="danger"
                             icon="pi pi-times"
                        />
                        <Tag
                            v-else
                            value="Checking..."
                            severity="info"
                            icon="pi pi-spin pi-spinner"
                        />
                    </div>

                    <!-- Certificates Table -->
                    <DataTable
                        :value="certificatesList"
                        class="w-full"
                        striped-rows
                    >
                        <Column field="cn" header="Common Name (CN)" />
                        <Column field="keyType" header="Key Type" />
                        <Column header="Actions" style="width: 10rem">
                            <template #body="{ index }">
                                <Button
                                    icon="pi pi-trash"
                                    severity="danger"
                                    text
                                    rounded
                                    @click="removeCertificate(index)"
                                />
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>


        </div>

        <Button @click="anchorCertificate" :disabled="certificatesList.length === 0 || isValidChain?.status !== 'valid'">Publish</Button>
    </Dialog>

    <!-- Certificate Section Detail Dialog -->
    <Dialog
        v-model:visible="showCertificateSectionDialog"
        header="Certificate Details"
        modal
        class="w-full max-w-2xl"
    >
        <div v-if="selectedCertificateSection" class="space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="font-medium text-gray-600">Height</span>
                    <p class="mt-1 text-gray-900">{{ selectedCertificateSection.height }}</p>
                </div>
                <div>
                    <span class="font-medium text-gray-600">Microblock Hash</span>
                    <code class="mt-1 block text-xs bg-gray-100 px-2 py-1 rounded break-all">
                        {{ selectedCertificateSection.hash }}
                    </code>
                </div>
            </div>
            <div>
                <span class="font-medium text-gray-600 text-sm">Certificate Data</span>
                <pre class="mt-1 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-auto max-h-96">{{ JSON.stringify(selectedCertificateSection.data, null, 2) }}</pre>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end">
                <Button label="Close" @click="showCertificateSectionDialog = false" severity="secondary" />
            </div>
        </template>
    </Dialog>
</template>