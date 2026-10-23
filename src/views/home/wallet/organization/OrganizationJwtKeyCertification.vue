<!--
This component displays the certification procedure to
authenticate a carmentis public key using an external key.

The procedure starts by asking a chain of x509 certificates.
From this chain, we construct an unsigned jwt and we expect the same jwt, this time
signed by the external key.
-->
<script setup lang="ts">
import "reflect-metadata";
import {computed, ref, watch} from "vue";
import Button from "primevue/button";
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
import {useCurrentWallet} from "../../../../composables/useCurrentWallet.ts";
import Textarea from "primevue/textarea";
import OrganizationSectionsList from "./OrganizationSectionsList.vue";
import ResponsiveDialog from "../../../../components/ui/ResponsiveDialog.vue";
import StatusBadge from "../../../../components/ui/StatusBadge.vue";
import CopyableValue from "../../../../components/ui/CopyableValue.vue";
import JsonBlock from "../../../../components/ui/JsonBlock.vue";
import EmptyState from "../../../../components/ui/EmptyState.vue";
import SkeletonBlock from "../../../../components/ui/SkeletonBlock.vue";
import {useOrganizationSections} from "../../../../composables/useOrganizationSections.ts";

// define toast and route
const logger = DeskLogger.getLogger().getChild("organization")
const toast = useToast();
const route = useRoute();
const onChainStore = useOnChainActions();
const { isPublishingCustomJson } = onChainStore;
const isSigningWithStore = ref(false);
const {wallet, walletProvider, encodedWalletPublicKey} = useCurrentWallet();
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

const isLoadingStoreChain = ref(false);

// Selecting a store certificate replaces the whole chain (it already comes
// with its full certification path), rather than appending to any existing
// manual entries — mixing sources for a single chain would be confusing.
const selectStoreCertificate = async (cert: CertificateInfo) => {
    if (certificatesList.value.length > 0 && selectedStoreCertThumbprint.value === null) {
        // Manual entries exist and weren't seeded from the store — warn before discarding them.
        toast.add({
            severity: 'warn',
            summary: "Chain will be replaced",
            detail: "Selecting a store certificate replaces the manually entered chain.",
            life: 4000,
        });
    }
    try {
        isLoadingStoreChain.value = true;
        certificatesList.value = [];
        certificatesChain.value = [];

        const pemChain = await getCertificateChainPem(cert.thumbprint);
        for (const pem of pemChain) {
            await pushCertificateToChain(pem);
        }

        selectedStoreCertThumbprint.value = cert.thumbprint;
        toast.add({ summary: "Certificate selected", detail: cert.friendly_name ?? cert.subject, life: 3000 });
    } catch (error) {
        console.error("Error loading certificate chain:", error);
        toast.add({ severity: 'error', summary: "Error", detail: "Failed to load certificate chain from store.", life: 3000 });
    } finally {
        isLoadingStoreChain.value = false;
    }
};

const signWithStoreCertificate = async () => {
    if (!selectedStoreCertThumbprint.value || !unsignedPayload.value) return;

    try {
        isSigningWithStore.value = true;

        const leafCert = await Certificate.importFromPem(certificatesChain.value[0]);
        const alg = algForKeyType(leafCert.getKeyType());

        const encodedHeader = base64UrlEncodeString(JSON.stringify({ alg, typ: 'JWT' }));
        const encodedPayload = base64UrlEncodeString(JSON.stringify(unsignedPayload.value));
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        const signatureBytes = await signData(
            new TextEncoder().encode(signingInput),
            selectedStoreCertThumbprint.value,
        );

        signedJwtInput.value = `${signingInput}.${base64UrlEncode(signatureBytes)}`;

        // Reuse the exact same verification path as the manual flow — catches
        // any bug in the header/alg construction above before it reaches step 3.
        await verifySignature();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error signing with store certificate:", error);
        toast.add({ severity: 'error', summary: "Signing failed", detail: errorMessage, life: 3000 });
    } finally {
        isSigningWithStore.value = false;
    }
};

const isValidChain = computedAsync(async () => {
    if (certificatesChain.value.length === 0) return null;
    return CertificatesChain.verifyX509Chain(certificatesChain.value);
});

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

// compute the unsigned payload
const unsignedPayload = computedAsync(async () => {
    if (certificatesChain.value.length === 0) return null;
    if (!didIssuer.value) return null;
    const cert = await Certificate.importFromPem(certificatesChain.value[0]);
    return {
        iss: didIssuer.value,
        sub: encodedWalletPublicKey.value,
        iat: Math.floor(Date.now() / 1000),
        nbf: cert.getNotBefore(),
        exp: cert.getNotAfter(),
    };
});

// compute the unsigned jwt
const unsignedJwt = computed(() => {
    if (!unsignedPayload.value) return null;
    return new UnsecuredJWT(unsignedPayload.value).encode();
});

// dialog opening state
const showOpenDialog = ref(false);

// The dialog is a three-step flow: certificates, JWT signature, approval.
const STEPS = ['Certificates', 'JWT signature', 'Approve'];
const step = ref(1);
watch(showOpenDialog, (open) => {
    if (open) step.value = 1;
});

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
            console.error(`Payload mismatch: signed JWT contains different data than expected:`);
            console.error(`Expected: ${JSON.stringify(unsignedPayload)}`);
            console.error(`Received: ${JSON.stringify(signedPayload)}`);
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
            __certificate__: {
                type: 'KEY_ATTESTATION_JWT',
                jwt: signedJwtPayload.value,
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


/*
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

 */
const {
    rows: certificateSections,
    isLoading: isLoadingCertificateSections,
    sync,
    refetch: refetchCertificateSections,
} = useOrganizationSections({
    queryKey: 'organization-certificate-sections',
    isOrganizationFoundOnChain,
    accept: (section) => !!(section.__certificate__ as { jwt?: unknown } | undefined)?.jwt,
});

function algForKeyType(keyType: string): string {
    if (keyType === 'RSA') return 'RS256';
    throw new Error(`In-app signing currently only supports RSA certificates (got: ${keyType})`);
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
    return base64UrlEncode(new TextEncoder().encode(str));
}
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
            <div class="min-w-0">
                <h2 class="text-lg font-semibold text-fg">Key attestation (JWT)</h2>
                <p class="max-w-2xl text-sm text-fg-muted">
                    Authenticate your organization's public key using an external key, certified by an x509
                    certificate chain. A JWT certifying your organization's public key, signed by the external key,
                    is then published on-chain.
                </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
                <Button
                    label="Attach certificate"
                    icon="pi pi-plus"
                    :disabled="isLoadingCertificateSections"
                    @click="showOpenDialog = true"
                />
            </div>
        </div>

        <OrganizationSectionsList
            :rows="certificateSections"
            :is-loading="isLoadingCertificateSections"
            :sync="sync"
            empty-title="No attestation published yet"
            empty-description="Attach a certificate to publish your first key attestation."
            detail-title="Key attestation"
        >
            <Button label="Attach certificate" icon="pi pi-plus" @click="showOpenDialog = true" />
        </OrganizationSectionsList>
    </div>

    <ResponsiveDialog
        v-model:visible="showOpenDialog"
        header="Attach x509 certificates"
        size="lg"
        :closable="!isAnchoringCertificate && !isSigningWithStore"
    >
        <!-- Progress -->
        <div class="mb-5">
            <p class="text-sm font-medium text-fg">Step {{ step }} of {{ STEPS.length }} · {{ STEPS[step - 1] }}</p>
            <div class="mt-2 flex gap-1" aria-hidden="true">
                <span
                    v-for="n in STEPS.length"
                    :key="n"
                    class="h-1 flex-1 rounded-full"
                    :class="n <= step ? 'bg-accent' : 'bg-surface-muted'"
                />
            </div>
        </div>

        <!-- Step 1: Add x509 Certificates -->
        <div v-if="step === 1" class="space-y-6">
            <!-- Store certificate selection (if available) -->
            <section v-if="canUseCertificateStore" class="space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="text-sm font-medium text-fg">Select a certificate from the OS store</h3>
                    <Button
                        icon="pi pi-refresh"
                        text
                        severity="secondary"
                        aria-label="Refresh the certificates of the store"
                        :loading="isLoadingStoreCertificates"
                        @click="refreshStoreCertificates"
                    />
                </div>

                <SkeletonBlock v-if="isLoadingStoreCertificates" :lines="2" height-class="h-14" />
                <p v-else-if="storeCertificates.length === 0" class="text-sm text-fg-muted">
                    No certificates found in the certificate store.
                </p>
                <ul v-else role="radiogroup" aria-label="Certificates of the OS store" class="space-y-2">
                    <li v-for="cert in storeCertificates" :key="cert.thumbprint">
                        <button
                            type="button"
                            role="radio"
                            :aria-checked="selectedStoreCertThumbprint === cert.thumbprint"
                            :disabled="isLoadingStoreChain"
                            class="flex w-full items-start gap-3 rounded-control border p-3 text-left transition-colors disabled:opacity-60"
                            :class="selectedStoreCertThumbprint === cert.thumbprint
                                ? 'border-accent bg-accent-soft'
                                : 'border-line hover:bg-surface-muted'"
                            @click="selectStoreCertificate(cert)"
                        >
                            <span class="min-w-0 flex-1">
                                <span class="block truncate text-sm font-medium text-fg">{{ cert.friendly_name ?? cert.subject }}</span>
                                <span class="block truncate text-xs text-fg-muted">Issued to {{ cert.subject }}</span>
                                <span class="block truncate text-xs text-fg-muted">Issued by {{ cert.issuer }}</span>
                            </span>
                            <StatusBadge v-if="selectedStoreCertThumbprint === cert.thumbprint" tone="success" label="Selected" />
                        </button>
                    </li>
                </ul>

                <Button
                    v-if="!showManualEntry"
                    label="Add a certificate manually"
                    icon="pi pi-plus"
                    text
                    size="small"
                    @click="showManualEntry = true"
                />
            </section>

            <!-- Manual PEM entry -->
            <section v-if="showManualEntry" class="space-y-2">
                <label for="jwt-pem-input" class="block text-sm font-medium text-fg">
                    Add a certificate in PEM format
                </label>
                <Textarea
                    id="jwt-pem-input"
                    v-model="certificateInput"
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    rows="6"
                    fluid
                    spellcheck="false"
                    autocomplete="off"
                    class="font-mono text-sm"
                />
                <div class="flex justify-end">
                    <Button
                        label="Add certificate"
                        icon="pi pi-plus"
                        severity="secondary"
                        outlined
                        :loading="isLoadingCert"
                        @click="addCertificate"
                    />
                </div>
            </section>

            <!-- Chain -->
            <section v-if="certificatesList.length > 0" class="space-y-3">
                <h3 class="text-sm font-semibold text-fg">Certificate chain ({{ certificatesList.length }})</h3>
                <div class="flex flex-wrap items-center gap-2">
                    <StatusBadge v-if="isValidChain?.status === 'valid'" tone="success" label="Valid chain" />
                    <StatusBadge
                        v-else-if="isValidChain?.status === 'incomplete'"
                        tone="warning"
                        label="Chain incomplete (root not provided)"
                    />
                    <StatusBadge v-else-if="isValidChain?.status === 'invalid'" tone="danger" :label="isValidChain.reason" />
                    <StatusBadge v-else tone="neutral" label="Checking…" icon="pi-spin pi-spinner" />

                    <StatusBadge
                        v-if="!!publicKeyJwk && formattedPublicKeyJwk !== null"
                        tone="success"
                        label="Public key found"
                    />
                    <StatusBadge v-else tone="danger" label="No public key found" />
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
                            @click="removeCertificate(index)"
                        />
                    </li>
                </ol>

                <JsonBlock v-if="formattedPublicKeyJwk" title="Public key (JWK)" :value="formattedPublicKeyJwk" />
            </section>
        </div>

        <!-- Step 2: JWT signature -->
        <div v-else-if="step === 2" class="space-y-6">
            <!-- Unsigned JWT Display (kept visible for both paths, for transparency) -->
            <section>
                <h3 class="mb-1 text-sm font-medium text-fg">Unsigned JWT</h3>
                <CopyableValue v-if="unsignedJwt" :value="unsignedJwt" label="unsigned JWT" :head="24" :tail="12" />
                <p v-else class="text-sm text-fg-muted">Generating…</p>
            </section>

            <!-- In-app signing (store-backed certificate) -->
            <section v-if="selectedStoreCertThumbprint">
                <Button
                    label="Sign with certificate"
                    icon="pi pi-verified"
                    :loading="isSigningWithStore"
                    @click="signWithStoreCertificate"
                />
                <p class="mt-2 text-xs text-fg-muted">You may be prompted for your certificate's PIN.</p>
            </section>

            <!-- Manual signature paste (external tool) -->
            <section v-else class="space-y-2">
                <label for="jwt-signed-input" class="block text-sm font-medium text-fg">Signed JWT</label>
                <p class="text-sm text-fg-muted">Sign the unsigned JWT with your external key, then paste the result here.</p>
                <Textarea
                    id="jwt-signed-input"
                    v-model="signedJwtInput"
                    placeholder="eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6andrOi..."
                    rows="4"
                    fluid
                    spellcheck="false"
                    autocomplete="off"
                    class="font-mono text-sm"
                />
                <Button
                    label="Verify signature"
                    icon="pi pi-check"
                    severity="secondary"
                    outlined
                    :loading="isVerifyingSignature"
                    @click="verifySignature"
                />
            </section>

            <!-- Verification Result (shared by both paths) -->
            <div
                v-if="signatureVerificationResult"
                role="status"
                class="flex items-start gap-2 rounded-control px-4 py-3 text-sm"
                :class="signatureVerificationResult.valid ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'"
            >
                <i
                    class="pi mt-0.5"
                    :class="signatureVerificationResult.valid ? 'pi-check-circle' : 'pi-times-circle'"
                    aria-hidden="true"
                />
                <div>
                    <span class="block font-semibold">
                        {{ signatureVerificationResult.valid ? 'Signature is valid' : 'Signature is invalid' }}
                    </span>
                    <span class="block break-words text-xs">
                        {{ signatureVerificationResult.valid
                            ? 'The JWT signature has been verified against the certificate chain.'
                            : signatureVerificationResult.error }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Step 3: Approve/Anchor -->
        <div v-else class="space-y-6">
            <section>
                <h3 class="mb-2 text-sm font-medium text-fg">Certificate chain summary</h3>
                <ol class="space-y-1 rounded-control border border-line bg-surface-muted p-3 text-sm">
                    <li v-for="(cert, index) in certificatesList" :key="index" class="text-fg">
                        <span class="font-medium">{{ index + 1 }}.</span> {{ cert.cn }}
                        <span class="text-fg-muted">({{ cert.keyType }})</span>
                    </li>
                </ol>
            </section>

            <JsonBlock title="Signed JWT payload" :value="signedJwtPayload" default-open />

            <div
                v-if="hasAnchoredCertificate"
                role="status"
                class="flex items-start gap-2 rounded-control bg-success-soft px-4 py-3 text-sm text-success"
            >
                <i class="pi pi-check-circle mt-0.5" aria-hidden="true" />
                <div>
                    <span class="block font-semibold">Certificate anchored successfully</span>
                    <span class="block text-xs">The certificate chain has been published on-chain as a custom section.</span>
                </div>
            </div>
        </div>

        <template #footer>
            <template v-if="step === 1">
                <Button
                    label="Next"
                    :disabled="certificatesList.length === 0 || isValidChain?.status !== 'valid'"
                    @click="step = 2"
                />
            </template>
            <template v-else-if="step === 2">
                <Button label="Back" severity="secondary" outlined @click="step = 1" />
                <Button label="Next" :disabled="!signatureVerificationResult?.valid" @click="step = 3" />
            </template>
            <template v-else>
                <Button label="Back" severity="secondary" outlined :disabled="isAnchoringCertificate" @click="step = 2" />
                <Button
                    v-if="!hasAnchoredCertificate"
                    label="Anchor certificate"
                    icon="pi pi-cloud-upload"
                    :loading="isAnchoringCertificate"
                    @click="anchorCertificate"
                />
                <Button v-else label="Done" icon="pi pi-check" severity="success" @click="showOpenDialog = false" />
            </template>
        </template>
    </ResponsiveDialog>
</template>
