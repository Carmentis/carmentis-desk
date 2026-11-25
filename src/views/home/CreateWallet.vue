<script setup lang="ts">
import {useRouter} from 'vue-router';
import Button from 'primevue/button';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import Step from 'primevue/step';
import StepPanels from 'primevue/steppanels';
import StepPanel from 'primevue/steppanel';
import PageHeader from '../../components/ui/PageHeader.vue';
import StickyActionBar from '../../components/ui/StickyActionBar.vue';
import StepBasics from './create-wallet/StepBasics.vue';
import StepKeyCustody from './create-wallet/StepKeyCustody.vue';
import StepLocalKey from './create-wallet/StepLocalKey.vue';
import StepKmsKey from './create-wallet/StepKmsKey.vue';
import StepReview from './create-wallet/StepReview.vue';
import {provideWalletCreationWizard, WIZARD_STEPS} from '../../composables/useWalletCreationWizard.ts';

// The wallet is created in four steps: basics, where the key is kept, how it is set up, and a review.
// Nothing is created (no secret stored, no KMS wallet) before the user confirms on the review step.
const router = useRouter();
const {step, canProceed, next, back, custody, isCreating, submit} = provideWalletCreationWizard();

function onSubmit() {
    if (step.value === 4) void submit();
    else next();
}
</script>

<template>
    <form class="mx-auto max-w-2xl space-y-4" novalidate @submit.prevent="onSubmit">
        <PageHeader title="Create a wallet" subtitle="Set up a new wallet to hold tokens and sign on the Carmentis blockchain." />

        <!-- The steps are only reached in order, with the buttons below. -->
        <Stepper v-model:value="step" linear>
            <StepList>
                <Step v-for="item in WIZARD_STEPS" :key="item.value" :value="item.value">{{ item.label }}</Step>
            </StepList>
            <StepPanels :pt="{ root: { class: 'bg-transparent p-0 pt-4' } }">
                <StepPanel :value="1" :pt="{ root: { class: 'bg-transparent' } }">
                    <StepBasics />
                </StepPanel>
                <StepPanel :value="2" :pt="{ root: { class: 'bg-transparent' } }">
                    <StepKeyCustody />
                </StepPanel>
                <StepPanel :value="3" :pt="{ root: { class: 'bg-transparent' } }">
                    <StepKmsKey v-if="custody === 'kms'" />
                    <StepLocalKey v-else />
                </StepPanel>
                <StepPanel :value="4" :pt="{ root: { class: 'bg-transparent' } }">
                    <StepReview />
                </StepPanel>
            </StepPanels>
        </Stepper>

        <StickyActionBar>
            <Button
                v-if="step === 1"
                type="button"
                label="Cancel"
                severity="secondary"
                outlined
                @click="router.push('/')"
            />
            <Button
                v-else
                type="button"
                label="Back"
                icon="pi pi-arrow-left"
                severity="secondary"
                outlined
                :disabled="isCreating"
                @click="back"
            />
            <Button
                v-if="step < 4"
                type="submit"
                label="Next"
                icon="pi pi-arrow-right"
                icon-pos="right"
                :disabled="!canProceed"
            />
            <Button
                v-else
                type="submit"
                label="Create wallet"
                icon="pi pi-check"
                :loading="isCreating"
            />
        </StickyActionBar>
    </form>
</template>
