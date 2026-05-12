<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ 'update:visible': [value: boolean] }>();
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        header="About Carmentis Desk"
        :style="{ width: '600px', maxHeight: '80vh' }"
        :dismissable-mask="true"
        @update:visible="emit('update:visible', $event)"
    >
        <div class="overflow-y-auto" style="max-height: 60vh">
            <div class="space-y-6 py-2 pr-1">
                <div>
                    <h3
                        class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2"
                    >
                        <i class="pi pi-info-circle text-primary"></i>
                        What is Carmentis Desk?
                    </h3>
                    <p class="text-sm text-surface-600 leading-relaxed">
                        Carmentis Desk is a desktop application that lets you
                        manage your identity and assets on the Carmentis
                        blockchain network. It acts as a self-custodial wallet —
                        you hold your own keys, no third party ever has access
                        to your funds or credentials.
                    </p>
                </div>

                <div>
                    <h3
                        class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2"
                    >
                        <i class="pi pi-wallet text-primary"></i>
                        Wallets
                    </h3>
                    <p class="text-sm text-surface-600 leading-relaxed">
                        A wallet is derived from a secret seed phrase and holds
                        your cryptographic key pair. It stores your token
                        balance on-chain and groups the organizations you
                        manage. You can create multiple wallets for different
                        purposes or import an existing one from its seed.
                    </p>
                </div>

                <div>
                    <h3
                        class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2"
                    >
                        <i class="pi pi-building text-primary"></i>
                        Organizations
                    </h3>
                    <p class="text-sm text-surface-600 leading-relaxed">
                        Organizations represent legal entities registered on the
                        Carmentis network. Each organization can operate
                        validator nodes and deploy decentralized applications.
                        You can create a new organization or import an existing
                        one using its Virtual Blockchain ID.
                    </p>
                </div>

                <div>
                    <h3
                        class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2"
                    >
                        <i class="pi pi-server text-primary"></i>
                        Operators
                    </h3>
                    <p class="text-sm text-surface-600 leading-relaxed">
                        Operators are HTTP services that coordinate the
                        anchoring protocol between applications and the
                        Carmentis network. You can add one or more operator
                        endpoints here and monitor their status from their
                        detail page.
                    </p>
                </div>

                <div>
                    <h3
                        class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2"
                    >
                        <i class="pi pi-box text-primary"></i>
                        Application Ledgers
                    </h3>
                    <p class="text-sm text-surface-600 leading-relaxed">
                        When a decentralized application requests your approval
                        through the Wallet Interactive Anchoring Protocol
                        (WIAP), Carmentis Desk lets you review and sign the
                        microblock. Approved interactions are recorded as
                        Application Ledger entries on your wallet, giving you a
                        full audit trail of every transaction you have
                        validated.
                    </p>
                </div>

                <div>
                    <h3
                        class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2"
                    >
                        <i class="pi pi-link text-primary"></i>
                        Deep linking
                    </h3>
                    <p class="text-sm text-surface-600 leading-relaxed">
                        Applications can open Carmentis Desk directly via a
                        <code
                            class="text-xs bg-surface-100 px-1 py-0.5 rounded font-mono"
                        >
                            carmentis://
                        </code>
                        deep link. This triggers the wallet request flow
                        automatically so you can approve or reject the anchoring
                        request without leaving the application context.
                    </p>
                </div>
            </div>
        </div>
        <template #footer>
            <div class="flex items-center justify-between w-full">
                <a
                    href="https://docs.carmentis.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                    <i class="pi pi-external-link"></i>
                    Read the documentation
                </a>
                <Button label="Close" @click="emit('update:visible', false)" />
            </div>
        </template>
    </Dialog>
</template>
