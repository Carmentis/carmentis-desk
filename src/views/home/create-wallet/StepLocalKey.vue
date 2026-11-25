<script setup lang="ts">
import {useClipboard} from '@vueuse/core';
import Button from 'primevue/button';
import Password from 'primevue/password';
import Select from 'primevue/select';
import UiCard from '../../../components/ui/UiCard.vue';
import SegmentedControl from '../../../components/ui/SegmentedControl.vue';
import FieldNameAndDescription from '../../../components/utils/FieldNameAndDescription.vue';
import JwkKeyField from '../JwkKeyField.vue';
import type {SegmentedOption} from '../../../components/ui/types.ts';
import {
    SIGNATURE_SCHEME_OPTIONS,
    useWalletCreationWizard,
    type LocalKeyMethod,
} from '../../../composables/useWalletCreationWizard.ts';

const {localMethod, schemeId, seed, passphrase, jwkInput, isJwkValid, generateSeed, generatePassphrase} =
    useWalletCreationWizard();

const METHODS: SegmentedOption<LocalKeyMethod>[] = [
    {value: 'passphrase', label: 'Passphrase', icon: 'pi-list'},
    {value: 'seed', label: 'Seed', icon: 'pi-key'},
    {value: 'jwk', label: 'Import JWK', icon: 'pi-file-import'},
];

const DESCRIPTIONS: Record<LocalKeyMethod, string> = {
    passphrase: 'Recommended. 12 words from which the private key is derived: easy to write down and back up.',
    seed: 'A raw seed from which the private key is derived.',
    jwk: 'An existing private key in JWK format, generated elsewhere or here.',
};

// Secrets are masked in their field; copying is explicit.
const {copy: copySecret, copied: secretCopied} = useClipboard({copiedDuring: 2000});
</script>

<template>
    <UiCard title="Private key" subtitle="Stored securely in your vault. It stays hidden until you reveal it.">
        <div class="space-y-5">
            <div class="space-y-2">
                <SegmentedControl v-model="localMethod" :options="METHODS" ariaLabel="How to create the private key" />
                <p class="text-sm text-fg-muted">{{ DESCRIPTIONS[localMethod] }}</p>
            </div>

            <!-- JWK -->
            <JwkKeyField v-if="localMethod === 'jwk'" v-model="jwkInput" v-model:valid="isJwkValid" />

            <!-- Seed / Passphrase -->
            <template v-else>
                <div>
                    <FieldNameAndDescription
                        name="Signature algorithm"
                        description="The cryptographic algorithm used to sign. Keep the default if unsure."
                        input-id="signature-scheme"
                    />
                    <Select
                        v-model="schemeId"
                        input-id="signature-scheme"
                        :options="SIGNATURE_SCHEME_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>

                <!-- Passphrase -->
                <div v-if="localMethod === 'passphrase'" class="space-y-2">
                    <FieldNameAndDescription
                        name="Passphrase"
                        description="Enter an existing passphrase, or generate a new one."
                        input-id="passphrase"
                        required
                    />
                    <Password
                        v-model="passphrase"
                        input-id="passphrase"
                        :input-props="{ autocomplete: 'off', spellcheck: false }"
                        placeholder="Enter or generate a passphrase"
                        :feedback="false"
                        toggleMask
                        fluid
                    />
                    <div class="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            label="Generate a passphrase"
                            icon="pi pi-refresh"
                            severity="secondary"
                            outlined
                            @click="generatePassphrase"
                        />
                        <Button
                            type="button"
                            :label="secretCopied ? 'Copied' : 'Copy'"
                            :icon="secretCopied ? 'pi pi-check' : 'pi pi-copy'"
                            severity="secondary"
                            text
                            :disabled="!passphrase"
                            @click="copySecret(passphrase)"
                        />
                    </div>
                    <p class="flex items-start gap-2 text-sm text-fg-muted">
                        <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
                        A seed is derived from your passphrase. Keep a safe backup and never share it.
                    </p>
                </div>

                <!-- Seed -->
                <div v-else class="space-y-2">
                    <FieldNameAndDescription
                        name="Seed"
                        description="Enter an existing seed, or generate a new one."
                        input-id="seed"
                        required
                    />
                    <Password
                        v-model="seed"
                        input-id="seed"
                        :input-props="{ autocomplete: 'off', spellcheck: false }"
                        placeholder="Enter or generate a seed"
                        :feedback="false"
                        toggleMask
                        fluid
                    />
                    <div class="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            label="Generate a seed"
                            icon="pi pi-refresh"
                            severity="secondary"
                            outlined
                            @click="generateSeed"
                        />
                        <Button
                            type="button"
                            :label="secretCopied ? 'Copied' : 'Copy'"
                            :icon="secretCopied ? 'pi pi-check' : 'pi pi-copy'"
                            severity="secondary"
                            text
                            :disabled="!seed"
                            @click="copySecret(seed)"
                        />
                    </div>
                    <p class="flex items-start gap-2 text-sm text-fg-muted">
                        <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
                        Keep a safe backup and never share it: anyone who has it controls this wallet.
                    </p>
                </div>
            </template>
        </div>
    </UiCard>
</template>
