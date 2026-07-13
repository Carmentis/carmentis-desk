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
import {UnsecuredJWT} from "jose";
import {JwkSignatureKeyExporter} from "../../../../utils/jwk-signature-key-exporter.ts";


const props = defineProps<{
    walletId: number;
}>();
const toast = useToast();
const walletId = ref(props.walletId);
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
    return await cert.getPublicKeyToJwk();
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
    const cert = await Certificate.importFromPem(certificatesChain.value[0]);
    const unsignedPayload = {
        iss: didIssuer.value,
        sub: encodedWalletPublicKey.value,
        iat: Math.floor(Date.now() / 1000),
        exp: cert.getNotAfter(),
    };
    console.log(unsignedPayload)
    return new UnsecuredJWT(unsignedPayload)
        .setIssuedAt()
        .encode();
});

// dialog opening state
const showOpenDialog = ref(false);

const addCertificate = async () => {
    const pem = certificateInput.value.trim();

    if (!pem) {
        toast.add({ summary: "Empty input", detail: "Please paste a certificate in PEM format" });
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

        toast.add({ summary: "Success", detail: `Certificate added: ${cn}` });
    } catch (error) {
        console.error("Error importing certificate:", error);
        toast.add({ severity: 'error', summary: "Error", detail: "Failed to parse certificate. Ensure it's in valid PEM format." });
    } finally {
        isLoadingCert.value = false;
    }
};

const removeCertificate = (index: number) => {
    certificatesList.value.splice(index, 1);
    certificatesChain.value.splice(index, 1);
};
</script>

<template>
    <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Organization Certificate</h2>
        <p class="text-sm text-gray-600 mb-4">From this chain, we construct an unsigned jwt and we expect the same jwt, this time signed by the external key.</p>
        <Button label="Attach x509 Certificates" icon="pi pi-lock" @click="showOpenDialog = true" />
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
                        <div class="flex flex-col h-48">
                            <div class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex-auto flex justify-center items-center font-medium">JWT Signature Content</div>
                        </div>
                        <div class="flex pt-6 justify-between">
                            <Button severity="secondary" @click="activateCallback('1')">
                                Back
                            </Button>
                            <Button @click="activateCallback('3')">
                                Next
                            </Button>
                        </div>
                    </StepPanel>

                    <!-- Step 3: Approve -->
                    <StepPanel v-slot="{ activateCallback }" value="3">
                        <div class="flex flex-col h-48">
                            <div class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex-auto flex justify-center items-center font-medium">Approval Content</div>
                        </div>
                        <div class="pt-6">
                            <Button severity="secondary" @click="activateCallback('2')">
                                Back
                            </Button>
                        </div>
                    </StepPanel>
                </StepPanels>
            </Stepper>
        </div>
    </Dialog>
</template>