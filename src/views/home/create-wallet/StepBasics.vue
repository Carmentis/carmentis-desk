<script setup lang="ts">
import InputText from 'primevue/inputtext';
import UiCard from '../../../components/ui/UiCard.vue';
import FieldNameAndDescription from '../../../components/utils/FieldNameAndDescription.vue';
import NetworkSelector from '../../../components/network/NetworkSelector.vue';
import {useWalletCreationWizard} from '../../../composables/useWalletCreationWizard.ts';

const {walletName, network} = useWalletCreationWizard();
</script>

<template>
    <div class="space-y-4">
        <UiCard title="General">
            <FieldNameAndDescription
                name="Wallet name"
                description="Only you see this name."
                input-id="wallet-name"
                required
            />
            <InputText
                id="wallet-name"
                v-model="walletName"
                fluid
                autofocus
                autocomplete="off"
                placeholder="e.g. Personal wallet"
            />
        </UiCard>

        <UiCard title="Network" subtitle="The blockchain network this wallet connects to.">
            <NetworkSelector v-model="network" />
        </UiCard>
    </div>
</template>
