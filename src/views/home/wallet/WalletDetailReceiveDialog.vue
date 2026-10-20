<script setup lang="ts">
import Button from 'primevue/button';
import ResponsiveDialog from '../../../components/ui/ResponsiveDialog.vue';
import CopyableValue from '../../../components/ui/CopyableValue.vue';
import { useCurrentWallet } from '../../../composables/useCurrentWallet.ts';

const isOpen = defineModel<boolean>('isOpen', { default: false });

const { encodedWalletPublicKey, useAccountIdQuery } = useCurrentWallet();
const accountIdQuery = useAccountIdQuery();
</script>

<template>
    <ResponsiveDialog v-model:visible="isOpen" header="Receive tokens">
        <div class="space-y-5">
            <p class="text-sm text-fg-muted">
                To receive tokens, give the sender your public key. They enter it as the recipient when they send you tokens.
            </p>

            <div>
                <p class="mb-1 text-sm font-medium text-fg">Your public key</p>
                <CopyableValue :value="encodedWalletPublicKey" label="public key" :head="14" :tail="10" />
            </div>

            <div>
                <p class="text-sm font-medium text-fg">Account ID</p>
                <p class="mb-1 text-xs text-fg-muted">Technical identifier of your account on the blockchain.</p>
                <CopyableValue
                    v-if="accountIdQuery.data.value"
                    :value="accountIdQuery.data.value"
                    label="account ID"
                    :head="14"
                    :tail="10"
                />
                <p v-else class="text-sm text-fg-muted">
                    You do not have an account yet. It is created when you first receive tokens.
                </p>
            </div>
        </div>

        <template #footer>
            <Button label="Close" severity="secondary" outlined @click="isOpen = false" />
        </template>
    </ResponsiveDialog>
</template>
