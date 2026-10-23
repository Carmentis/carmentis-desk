
<script setup lang="ts">
import "reflect-metadata";
import {computed, ref, watch} from "vue";
import Button from "primevue/button";
import Textarea from 'primevue/textarea';
import {computedAsync} from "@vueuse/core";
import {useToast} from "primevue/usetoast";
import {CertificatesChain} from "../../../../utils/CertificatesChain.ts";
import {Certificate} from "../../../../utils/Certificate.ts";
import {WalletUtils} from "../../../../utils/WalletUtils.ts";
import {UnsecuredJWT, jwtVerify, decodeJwt} from "jose";
import {JwkSignatureKeyExporter} from "../../../../utils/jwk-signature-key-exporter.ts";
import {importJWK} from "jose";
import {useRoute} from "vue-router";
import { useOnChainActions } from "../../../../composables/useOnChainActions.ts";
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
import {useOrganizationSections} from "../../../../composables/useOrganizationSections.ts";
import Message from 'primevue/message';
import OrganizationSectionsList from "./OrganizationSectionsList.vue";
import ResponsiveDialog from "../../../../components/ui/ResponsiveDialog.vue";
import StatusBadge from "../../../../components/ui/StatusBadge.vue";
import EmptyState from "../../../../components/ui/EmptyState.vue";

// define toast and route
const logger = DeskLogger.getLogger().getChild("organization")
const toast = useToast();
const route = useRoute();
const onChainStore = useOnChainActions();
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
watch(showOpenDialog, (open) => {
    if (!open) resetDialog();
});


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

const resetDialog = () => {
    certificatesList.value = [];
    certificatesChain.value = [];
    certificateInput.value = "";
    selectedStoreCertThumbprint.value = null;
};

// Closing is locked while the publication is in flight.
const isAnchoringCertificate = onChainStore.isPublishingCustomJson;

const canPublish = computed(() =>
    certificatesList.value.length > 0 && isValidChain.value?.status === 'valid' && !isAnchoringCertificate.value
);

const anchorCertificate = async () => {
    if (!walletId.value) throw new Error("No wallet id defined");

    try {

        // Per RFC 7517 §4.7, x5c is an array of standard base64 (not base64url) DER certificates,
        // leaf first, without PEM armor.
        const x5c = await Promise.all(
            certificatesChain.value.map(async (pem) => (await Certificate.importFromPem(pem)).getBase64EncodedDer())
        );

        // Publish the certificate chain as custom data
        const customData: CustomSection = {
            type: SectionType.CUSTOM,
            __certificate__: {
                type: "X5C",
                x5c,
            }
        }

        // Success and error toasts are already emitted by the on-chain actions.
        const published = await onChainStore.publishCustomJson({
            orgId: orgId.value,
            json: customData,
        });
        if (!published) return;

        showOpenDialog.value = false;
        resetDialog();
        await refetchCertificateSections();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error anchoring certificate:", error);
        toast.add({ severity: 'error', summary: "Anchoring failed", detail: errorMessage, life: 5000 });
    }
};

// Load anchored certificates from on-chain
const {
    rows: certificateSections,
    isLoading: isLoadingCertificateSections,
    sync,
    refetch: refetchCertificateSections,
} = useOrganizationSections({
    queryKey: 'organization-x509-certificate-sections',
    isOrganizationFoundOnChain,
    accept: (section) => !!section.__certificate__,
});

</script>

<template>
    <EmptyState
        v-if="isOrganizationFoundOnChain !== true"
        framed
        icon="pi-lock"
        title="Publish your organization first"
        description="Certificate management is only available once the organization has been published on the Carmentis network."
    />

    <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="text-lg font-semibold text-fg">X509 certificates</h2>
                <p class="text-sm text-fg-muted">
                    Publish an X509 certificate chain to prove your organization's identity on the Carmentis network.
                </p>
            </div>
            <Button label="Publish certificate" icon="pi pi-plus" @click="showOpenDialog = true" />
        </div>

        <OrganizationSectionsList
            :rows="certificateSections"
            :is-loading="isLoadingCertificateSections"
            :sync="sync"
            empty-title="No certificate published yet"
            empty-description="Publish a certificate chain to prove your organization's identity."
            detail-title="Certificate"
        >
            <Button label="Publish certificate" icon="pi pi-plus" @click="showOpenDialog = true" />
        </OrganizationSectionsList>
    </div>

    <ResponsiveDialog
        v-model:visible="showOpenDialog"
        header="Publish X509 certificate"
        size="lg"
        :closable="!isAnchoringCertificate"
    >
        <div class="space-y-6">
            <p class="text-sm text-fg-muted">
                Add your certificate chain, leaf certificate first. Once the chain is valid, it is anchored
                on-chain in your organization's virtual blockchain.
            </p>

            <!-- Certificate Input -->
            <section v-if="showManualEntry" class="space-y-2">
                <label for="x509-pem-input" class="block text-sm font-medium text-fg">
                    Certificate (PEM format)
                </label>
                <Textarea
                    id="x509-pem-input"
                    v-model="certificateInput"
                    :disabled="isAnchoringCertificate"
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    rows="6"
                    fluid
                    auto-resize
                    spellcheck="false"
                    autocomplete="off"
                    class="font-mono text-sm"
                />
                <div class="flex justify-end">
                    <Button
                        label="Add to chain"
                        icon="pi pi-plus"
                        severity="secondary"
                        outlined
                        :loading="isLoadingCert"
                        :disabled="!certificateInput.trim() || isAnchoringCertificate"
                        @click="addCertificate"
                    />
                </div>
            </section>

            <!-- Empty state -->
            <EmptyState
                v-if="certificatesList.length === 0"
                icon="pi-file"
                title="No certificate in the chain yet"
                description="Paste a certificate above to start building the chain."
            />

            <!-- Chain -->
            <section v-else class="space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h3 class="text-sm font-semibold text-fg">Certificate chain ({{ certificatesList.length }})</h3>
                    <StatusBadge
                        v-if="isValidChain?.status === 'valid'"
                        tone="success"
                        label="Valid chain"
                    />
                    <StatusBadge
                        v-else-if="isValidChain?.status === 'incomplete'"
                        tone="warning"
                        label="Chain incomplete (root not provided)"
                    />
                    <StatusBadge
                        v-else-if="isValidChain?.status === 'invalid'"
                        tone="danger"
                        :label="isValidChain.reason"
                    />
                    <StatusBadge v-else tone="neutral" label="Checking…" icon="pi-spin pi-spinner" />
                </div>

                <ol class="space-y-2">
                    <li
                        v-for="(cert, index) in certificatesList"
                        :key="index"
                        class="flex items-center gap-3 rounded-control border border-line px-3 py-2"
                    >
                        <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-fg-muted">
                            {{ index + 1 }}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-medium text-fg">{{ cert.cn }}</span>
                            <span class="block text-xs text-fg-muted">Key type: {{ cert.keyType }}</span>
                        </span>
                        <Button
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            rounded
                            :aria-label="`Remove certificate ${cert.cn}`"
                            :disabled="isAnchoringCertificate"
                            @click="removeCertificate(index)"
                        />
                    </li>
                </ol>

                <Message v-if="isValidChain?.status === 'incomplete'" severity="warn" size="small">
                    Publishing requires a complete chain. Add the missing issuer certificate(s).
                </Message>
            </section>

            <Message v-if="isAnchoringCertificate" severity="info" size="small" icon="pi pi-spin pi-spinner">
                Publishing on-chain, please keep this window open…
            </Message>
        </div>

        <template #footer>
            <Button
                label="Cancel"
                severity="secondary"
                outlined
                :disabled="isAnchoringCertificate"
                @click="showOpenDialog = false"
            />
            <Button
                :label="isAnchoringCertificate ? 'Publishing…' : 'Publish'"
                icon="pi pi-upload"
                :loading="isAnchoringCertificate"
                :disabled="!canPublish"
                @click="anchorCertificate"
            />
        </template>
    </ResponsiveDialog>
</template>
