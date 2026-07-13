<!--
This component displays the certification procedure to
authenticate a carmentis public key using an external key.

The procedure starts by asking a chain of x509 certificates.
From this chain, we construct an unsigned jwt and we expect the same jwt, this time
signed by the external key.
-->
<script setup lang="ts">
import "reflect-metadata";
import {computed, ref} from "vue";
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


// define toast, clipboard and route
const logger = DeskLogger.getLogger().getChild("organization")
const clipboard = useClipboard();
const toast = useToast();
const route = useRoute();
const onChainStore = useOnChainStore();
const { isPublishingCustomJson } = storeToRefs(onChainStore);

const walletId =  computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const encodedWalletPublicKey = computedAsync(async () => {
    const pk = await WalletUtils.getPublicKeyFromWalletId(walletId.value);
    return WalletUtils.encodePublicKey(pk);
})

// Dialog model
const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');

// chain of certificates
const certificatesChain = ref<string[]>([]);
const certificatesList = ref<Array<{pem: string; cn: string; keyType: string}>>([]);
const isValidChain = computedAsync(async () => {
    if (certificatesChain.value.length === 0) return null;
    return CertificatesChain.verifyX509Chain(certificatesChain.value)
})

// public key of the first certificate
const publicKeyJwk = computedAsync(async () => {
    if (certificatesChain.value.length === 0) return null;
    const cert = await Certificate.importFromPem(certificatesChain.value[0]);
    return await cert.getPublicKeyToJwkWithChain(certificatesChain.value);
});

// formatted public key of the first certificate
const formattedPublicKeyJwk = computed(() => {
    if (publicKeyJwk.value === null) return null;
    return JSON.stringify(publicKeyJwk.value, null, 2);
})

// did of the public key of the first certificate
const didIssuer = computed(() => {
    if (!publicKeyJwk.value) return undefined;
    return JwkSignatureKeyExporter.exportJwkAsDidJwk(publicKeyJwk.value);
})

// form state
const certificateInput = ref("");
const isLoadingCert = ref(false);

// compute the unsigned jwt
const unsignedJwt = computedAsync(async () => {
    if (certificatesChain.value.length === 0) return null;
    if (!didIssuer.value) return null;
    const cert = await Certificate.importFromPem(certificatesChain.value[0]);
    const unsignedPayload = {
        iss: didIssuer.value,
        sub: encodedWalletPublicKey.value,
        iat: Math.floor(Date.now() / 1000),
        exp: cert.getNotAfter(),
    };
    return new UnsecuredJWT(unsignedPayload)
        .setIssuedAt()
        .encode();
});

// dialog opening state
const showOpenDialog = ref(false);

// JWT signature verification
const signedJwtInput = ref("");
const isVerifyingSignature = ref(false);
const signatureVerificationResult = ref<{valid: boolean; error?: string} | null>(null);
const signedJwtPayload = computedAsync(async () => {
    if (signedJwtInput.value.trim() === "") return {};
    return signedJwtInput.value;
})

const decodeBase64Url = (str: string): string => {
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    switch (output.length % 4) {
        case 0:
            break;
        case 2:
            output += '==';
            break;
        case 3:
            output += '=';
            break;
        default:
            throw new Error('Invalid base64url');
    }
    return decodeURIComponent(atob(output).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
};

const verifySignature = async () => {
    if (!signedJwtInput.value.trim()) {
        toast.add({ severity: 'warn', summary: "Empty input", detail: "Please paste the signed JWT", life: 3000 });
        return;
    }

    try {
        isVerifyingSignature.value = true;
        signatureVerificationResult.value = null;

        // Get the public key from the first certificate
        if (!publicKeyJwk.value) {
            throw new Error("No public key available from certificate chain");
        }

        const key = await importJWK(publicKeyJwk.value);

        // Verify the JWT signature
        const verified = await jwtVerify(signedJwtInput.value, key);

        // Check if the payload matches the unsigned JWT
        const unsignedPayloadStr = decodeBase64Url(unsignedJwt.value!.split('.')[1]);
        const unsignedPayload = JSON.parse(unsignedPayloadStr);

        const signedPayload = verified.payload;

        const payloadMatches = JSON.stringify(unsignedPayload) === JSON.stringify(signedPayload);

        if (payloadMatches) {
            signatureVerificationResult.value = { valid: true };
            toast.add({ severity: 'success', summary: "Signature valid", detail: "The JWT signature is valid and matches the certificate chain", life: 3000 });
        } else {
            signatureVerificationResult.value = {
                valid: false,
                error: "Payload mismatch: signed JWT contains different data than expected"
            };
            toast.add({ severity: 'error', summary: "Signature invalid", detail: "The payload doesn't match", life: 3000 });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        signatureVerificationResult.value = {
            valid: false,
            error: errorMessage
        };
        console.error("Signature verification failed:", error);
        toast.add({ severity: 'error', summary: "Verification failed", detail: errorMessage, life: 3000 });
    } finally {
        isVerifyingSignature.value = false;
    }
};

const addCertificate = async () => {
    const pem = certificateInput.value.trim();

    if (!pem) {
        toast.add({ summary: "Empty input", detail: "Please paste a certificate in PEM format", life: 3000 });
        return;
    }

    try {
        isLoadingCert.value = true;
        const cert = await Certificate.importFromPem(pem);
        const cn = cert.getCN();
        const keyType = cert.getKeyType();

        // Add to certificate list
        certificatesList.value.push({
            pem,
            cn,
            keyType
        });

        // Add to chain
        certificatesChain.value.push(pem);

        // Clear input
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
};

// Step 3: Anchor Certificate
const isAnchoringCertificate = ref(false);
const hasAnchoredCertificate = ref(false);

const anchorCertificate = async () => {
    if (!walletId.value) throw new Error("No wallet id defined");
    if (!signedJwtInput.value.trim()) {
        toast.add({ severity: 'error', summary: "Error", detail: "No signed JWT available", life: 3000 });
        return;
    }

    if (!signatureVerificationResult.value?.valid) {
        toast.add({ severity: 'error', summary: "Error", detail: "Please verify the signature before anchoring", life: 3000 });
        return;
    }

    try {
        isAnchoringCertificate.value = true;

        // Publish the certificate chain and signed JWT as custom data
        const customData: CustomSection = {
            type: SectionType.CUSTOM,
            __cert__: {
                __jwt__: signedJwtPayload.value,
            }
        }

        await onChainStore.publishCustomJson({
            walletId: walletId.value,
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
const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const { state: organization } = useAsyncState(
    () => orgRepo.getOrganizationById(orgId.value),
    null,
    { immediate: true },
);

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
    queryKey: ['organization-certificate-sections', orgId],
    enabled: computed(() => isOrganizationFoundOnChain.value === true),
    queryFn: async (): Promise<CertificateSectionRow[]> => {
        if (!organization.value?.vbId || !wallet.value) return [];
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
        const orgVB = await provider.loadOrganizationVirtualBlockchain(Hash.from(organization.value.vbId));
        const hashes = orgVB.getAllMicroblockHashes();
        const rows: CertificateSectionRow[] = [];
        for (let height = 1; height <= hashes.length; height++) {
            const mb = await orgVB.getMicroblock(height);
            const customSecs = mb.getSectionsByType(SectionType.CUSTOM);
            for (const sec of customSecs) {
                const data = sec as Record<string, unknown>;
                if (data.__cert__) {
                    rows.push({ height, hash: hashes[height - 1].encode(), data });
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
            <h2 class="text-lg font-semibold text-gray-900 mb-2">Public Key Authentication (Wallet ID: {{walletId}})</h2>
            <p class="text-sm text-gray-600 mb-4">
                Authenticate your organization's public key using an external certificate chain. Upload an x509 certificate chain,
                generate a signature with your private key, and anchor it on-chain to cryptographically prove your identity.
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
                <h3 class="text-lg font-semibold text-gray-900">
                    Anchored Certificates
                </h3>
                <Button
                    label="Attach New Certificate"
                    icon="pi pi-plus"
                    size="small"
                    @click="showOpenDialog = true"
                />
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
                        No certificates anchored yet. Click "Attach New Certificate" to get started.
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
            <Stepper value="1" class="w-full">
                <StepList>
                    <Step value="1">Add x509 Certificates</Step>
                    <Step value="2">JWT signature</Step>
                    <Step value="3">Approve</Step>
                </StepList>
                <StepPanels>
                    <!-- Step 1: Add x509 Certificates -->
                    <StepPanel v-slot="{ activateCallback }" value="1">
                        <div class="space-y-6 py-6">
                            <!-- Certificate Input -->
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">
                                    Add Certificate (PEM format)
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

                            <!-- Chain Validation Status -->
                            <div v-if="certificatesList.length > 0">
                                <div class="flex items-center gap-2 mb-4">
                                    <span class="text-sm font-medium text-gray-700">Chain Validation:</span>
                                    <Tag
                                        v-if="isValidChain === true"
                                        :value="`Valid (${certificatesList.length} certificate(s)
                                        )`"
                                        severity="success"
                                        icon="pi pi-check"
                                    />
                                    <Tag
                                        v-else-if="isValidChain === false"
                                        value="Invalid"
                                        severity="danger"
                                        icon="pi pi-times"
                                    />
                                    <Tag
                                        v-else
                                        value="Checking..."
                                        severity="info"
                                        icon="pi pi-spin pi-spinner"
                                    />

                                    <Tag
                                        v-if="!!publicKeyJwk && formattedPublicKeyJwk !== null"
                                        value="Public key found"
                                        severity="success"
                                        icon="pi pi-check"
                                        v-tooltip="formattedPublicKeyJwk"
                                    />
                                    <Tag
                                        v-else
                                        value="No public key found"
                                        severity="danger"
                                        icon="pi pi-times"
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

                        <div class="flex justify-end pt-6 gap-2">
                            <Button
                                label="Next"
                                :disabled="certificatesList.length === 0 || !isValidChain"
                                @click="activateCallback('2')"
                            />
                        </div>
                    </StepPanel>

                    <!-- Step 2: JWT signature -->
                    <StepPanel v-slot="{ activateCallback }" value="2">
                        <div class="space-y-6 py-6">
                            <!-- Unsigned JWT Display -->
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">
                                    Unsigned JWT (to be signed externally)
                                </label>
                                <div class="bg-gray-50 border border-gray-300 rounded-lg p-4">
                                    <code class="text-xs text-gray-700 break-all font-mono block">
                                        {{ unsignedJwt || 'Generating...' }}
                                    </code>
                                </div>
                                <Button
                                    v-if="unsignedJwt"
                                    label="Copy to Clipboard"
                                    icon="pi pi-copy"
                                    text
                                    @click="clipboard.copyToClipboard(unsignedJwt, 'Unsigned JWT')"
                                    class="mt-2"
                                />
                            </div>

                            <!-- Signed JWT Input -->
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">
                                    Signed JWT (paste the signed version here)
                                </label>
                                <textarea
                                    v-model="signedJwtInput"
                                    placeholder="eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6andrOi..."
                                    class="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Button
                                    label="Verify Signature"
                                    icon="pi pi-check"
                                    :loading="isVerifyingSignature"
                                    class="mt-3"
                                    @click="verifySignature"
                                />
                            </div>

                            <!-- Verification Result -->
                            <div v-if="signatureVerificationResult">
                                <div
                                    v-if="signatureVerificationResult.valid"
                                    class="flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg"
                                >
                                    <i class="pi pi-check-circle text-green-600 mt-0.5"></i>
                                    <div class="text-sm text-green-800">
                                        <span class="font-semibold block">Signature is valid</span>
                                        <span class="text-xs">The JWT signature has been verified against the certificate chain</span>
                                    </div>
                                </div>
                                <div
                                    v-else
                                    class="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg"
                                >
                                    <i class="pi pi-times-circle text-red-600 mt-0.5"></i>
                                    <div class="text-sm text-red-800">
                                        <span class="font-semibold block">Signature is invalid</span>
                                        <span class="text-xs">{{ signatureVerificationResult.error }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex pt-6 justify-between">
                            <Button severity="secondary" @click="activateCallback('1')">
                                Back
                            </Button>
                            <Button
                                @click="activateCallback('3')"
                                :disabled="!signatureVerificationResult?.valid"
                            >
                                Next
                            </Button>
                        </div>
                    </StepPanel>

                    <!-- Step 3: Approve/Anchor -->
                    <StepPanel v-slot="{ activateCallback }" value="3">
                        <div class="space-y-6 py-6">
                            <!-- Certificate Chain Summary -->
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">
                                    Certificate Chain Summary
                                </label>
                                <div class="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-2">
                                    <div class="text-sm">
                                        <span class="font-medium text-gray-700">Certificates:</span>
                                        <span class="text-gray-900 ml-2">{{ certificatesList.length }} certificate(s)</span>
                                    </div>
                                    <div class="space-y-1">
                                        <div v-for="(cert, index) in certificatesList" :key="index" class="text-sm text-gray-600">
                                            <span class="font-medium">{{ index + 1 }}.</span> {{ cert.cn }} ({{ cert.keyType }})
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Signed JWT Payload -->
                            <div>
                                <label class="block text-sm font-medium text-gray-900 mb-2">
                                    Signed JWT Payload
                                </label>
                                <div class="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-64 overflow-auto">
                                    <pre class="text-xs font-mono text-gray-700">{{ JSON.stringify(signedJwtPayload, null, 2) }}</pre>
                                </div>
                            </div>

                            <!-- Success Message -->
                            <div
                                v-if="hasAnchoredCertificate"
                                class="flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <i class="pi pi-check-circle text-green-600 mt-0.5"></i>
                                <div class="text-sm text-green-800">
                                    <span class="font-semibold block">Certificate anchored successfully</span>
                                    <span class="text-xs">The certificate chain has been published on-chain as a custom section</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex pt-6 justify-between">
                            <Button
                                severity="secondary"
                                @click="activateCallback('2')"
                                :disabled="isAnchoringCertificate"
                            >
                                Back
                            </Button>
                            <Button
                                v-if="!hasAnchoredCertificate"
                                label="Anchor Certificate"
                                icon="pi pi-cloud-upload"
                                :loading="isAnchoringCertificate"
                                @click="anchorCertificate"
                            />
                            <Button
                                v-else
                                label="Done"
                                icon="pi pi-check"
                                severity="success"
                                @click="showOpenDialog = false"
                            />
                        </div>
                    </StepPanel>
                </StepPanels>
            </Stepper>
        </div>
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