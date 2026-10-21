<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { computedAsync, useClipboard, useDocumentVisibility, useTimeoutFn } from '@vueuse/core';
import type { JwkSignatureAlgorithmName } from '@cmts-dev/carmentis-sdk-core';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import StatusBadge from '../../components/ui/StatusBadge.vue';
import SegmentedControl from '../../components/ui/SegmentedControl.vue';
import ConfirmActionDialog from '../../components/ui/ConfirmActionDialog.vue';
import FieldNameAndDescription from '../../components/utils/FieldNameAndDescription.vue';
import type { SegmentedOption } from '../../components/ui/types.ts';
import {
    analyzePrivateJwk,
    DEFAULT_JWK_ALGORITHM,
    DEFAULT_RSA_MODULUS_LENGTH,
    findJwkAlgorithm,
    formatJwk,
    generatePrivateJwk,
    isRsaAlgorithm,
    JWK_ALGORITHM_GROUPS,
    RSA_MODULUS_LENGTHS,
} from '../../utils/jwk/privateJwk.ts';
import { iconButtonClass } from '../../components/ui/classes.ts';

/**
 * A private JWK, either generated here (any algorithm of the SDK) or pasted.
 * It is laid out for reading, hidden until revealed, and hides itself again after a while.
 */
const model = defineModel<string>({ default: '' });
/** True once the JWK is one the wallet can sign with. */
const valid = defineModel<boolean>('valid', { default: false });

// ---- what the JWK is, and whether it is usable ----
const analysis = computedAsync(() => analyzePrivateJwk(model.value), null);
watch(analysis, (result) => (valid.value = result?.ok === true), { immediate: true });
const hasContent = computed(() => model.value.trim() !== '');

// ---- hiding ----
const AUTO_HIDE_MS = 60_000;
const isVisible = ref(false);
const { start: startAutoHide, stop: stopAutoHide } = useTimeoutFn(() => hide(), AUTO_HIDE_MS, { immediate: false });

// An empty field is shown, so that there is somewhere to paste.
const showText = computed(() => isVisible.value || !hasContent.value);

function reveal() {
    isVisible.value = true;
    startAutoHide();
}

function hide() {
    isVisible.value = false;
    stopAutoHide();
}

// Never leave a private key on screen while the window is in the background.
const visibility = useDocumentVisibility();
watch(visibility, (state) => state === 'hidden' && hide());

// Typing or pasting keeps it visible; the timer starts over.
function onInput() {
    justGenerated.value = false;
    reveal();
}

// Paste, then leave the field: the JSON is laid out one member per line.
function formatOnBlur() {
    try {
        const formatted = formatJwk(JSON.parse(model.value));
        if (formatted !== model.value) model.value = formatted;
    } catch {
        // not JSON yet: the error is shown below
    }
}

// ---- copy, clear ----
const { copy, copied, isSupported } = useClipboard({ copiedDuring: 2000 });

function clear() {
    model.value = '';
    justGenerated.value = false;
    hide();
}

// ---- generation ----
const mode = ref<'generate' | 'paste'>('generate');
const modeOptions: SegmentedOption<'generate' | 'paste'>[] = [
    { value: 'generate', label: 'Generate' },
    { value: 'paste', label: 'Paste' },
];

const algorithm = ref<JwkSignatureAlgorithmName>(DEFAULT_JWK_ALGORITHM);
const modulusLength = ref<number>(DEFAULT_RSA_MODULUS_LENGTH);
const modulusOptions: SegmentedOption<number>[] = RSA_MODULUS_LENGTHS.map((bits) => ({ value: bits, label: `${bits} bits` }));
const selectedAlgorithm = computed(() => findJwkAlgorithm(algorithm.value));
const isGenerating = ref(false);
const generationError = ref('');
const justGenerated = ref(false);
const showReplaceDialog = ref(false);

// Replacing a key the user already has would lose it: ask first.
function requestGenerate() {
    if (hasContent.value) showReplaceDialog.value = true;
    else generate();
}

async function generate() {
    showReplaceDialog.value = false;
    isGenerating.value = true;
    generationError.value = '';
    try {
        model.value = formatJwk(await generatePrivateJwk(algorithm.value, modulusLength.value));
        // generated keys start hidden: copy or reveal them to make the backup
        hide();
        justGenerated.value = true;
    } catch (e) {
        generationError.value = e instanceof Error ? e.message : 'The key could not be generated.';
    } finally {
        isGenerating.value = false;
    }
}
</script>

<template>
    <div class="space-y-5">
        <SegmentedControl v-model="mode" :options="modeOptions" ariaLabel="Where the JWK comes from" />

        <!-- Generator -->
        <div v-if="mode === 'generate'" class="space-y-4 rounded-control border border-line p-4">
            <div>
                <FieldNameAndDescription
                    name="Algorithm"
                    description="The cryptographic algorithm of the new key."
                    input-id="jwk-algorithm"
                />
                <Select
                    v-model="algorithm"
                    input-id="jwk-algorithm"
                    :options="JWK_ALGORITHM_GROUPS"
                    optionGroupLabel="label"
                    optionGroupChildren="items"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
                <p v-if="selectedAlgorithm" class="mt-1 text-sm text-fg-muted">{{ selectedAlgorithm.hint }}</p>
            </div>

            <div v-if="isRsaAlgorithm(algorithm)">
                <p class="mb-1 text-sm font-medium text-fg">Key size</p>
                <SegmentedControl v-model="modulusLength" :options="modulusOptions" ariaLabel="RSA key size" />
                <p class="mt-1 text-sm text-fg-muted">Larger keys are stronger but take longer to generate.</p>
            </div>

            <Button
                type="button"
                label="Generate a JWK"
                icon="pi pi-key"
                severity="secondary"
                outlined
                :loading="isGenerating"
                @click="requestGenerate"
            />

            <p v-if="generationError" role="alert" class="flex items-start gap-2 text-sm text-danger">
                <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
                <span>
                    This key could not be generated: {{ generationError }}
                    Try another algorithm.
                </span>
            </p>
        </div>

        <!-- The key -->
        <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
                <FieldNameAndDescription
                    name="Private JWK"
                    :description="mode === 'paste' ? 'Paste a JSON Web Key that includes its private part.' : undefined"
                    input-id="jwk-input"
                    required
                />
                <div v-if="hasContent" class="flex shrink-0 items-center">
                    <button
                        type="button"
                        :class="iconButtonClass"
                        :aria-pressed="isVisible"
                        :aria-label="isVisible ? 'Hide the JWK' : 'Show the JWK'"
                        @click="isVisible ? hide() : reveal()"
                    >
                        <i class="pi" :class="isVisible ? 'pi-eye-slash' : 'pi-eye'" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        :class="iconButtonClass"
                        :disabled="!isSupported"
                        aria-label="Copy the JWK"
                        @click="copy(model)"
                    >
                        <i class="pi" :class="copied ? 'pi-check text-success' : 'pi-copy'" aria-hidden="true" />
                    </button>
                    <button type="button" :class="iconButtonClass" aria-label="Remove the JWK" @click="clear">
                        <i class="pi pi-trash" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <!-- What it is: not secret, so shown even when the key is hidden -->
            <div v-if="analysis?.ok" class="flex flex-wrap gap-2">
                <StatusBadge tone="success" :label="analysis.algorithm" icon="pi-check-circle" />
                <StatusBadge tone="neutral" :label="`Type ${analysis.kty}`" icon="pi-key" />
                <StatusBadge v-if="analysis.crv" tone="neutral" :label="`Curve ${analysis.crv}`" icon="pi-chart-line" />
            </div>

            <Textarea
                v-if="showText"
                id="jwk-input"
                v-model="model"
                fluid
                rows="12"
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                class="font-mono text-xs leading-relaxed"
                :placeholder="mode === 'paste' ? '{&quot;kty&quot;:&quot;EC&quot;,&quot;crv&quot;:&quot;P-256&quot;,…}' : 'Generate a key above, or switch to Paste.'"
                :invalid="analysis?.ok === false"
                :aria-invalid="analysis?.ok === false"
                aria-describedby="jwk-status"
                @input="onInput"
                @blur="formatOnBlur"
            />
            <div
                v-else
                role="img"
                aria-label="Hidden private JWK"
                class="rounded-control border border-line bg-surface-muted px-3 py-6 text-center font-mono text-sm tracking-widest text-fg-muted"
            >
                { •••••••••••••••• }
            </div>

            <div id="jwk-status" class="space-y-1 text-sm">
                <p v-if="analysis?.ok === false" role="alert" class="flex items-start gap-2 text-danger">
                    <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
                    {{ analysis.error }}
                </p>
                <p v-else-if="justGenerated" class="flex items-start gap-2 text-fg-muted" role="status">
                    <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
                    New key generated and hidden. Show or copy it to keep a safe backup, and never share it:
                    anyone who has it controls this wallet.
                </p>
                <p v-else-if="isVisible" class="flex items-start gap-2 text-warning" role="status">
                    <i class="pi pi-exclamation-triangle mt-0.5" aria-hidden="true" />
                    Anyone who sees this key can control your wallet. It hides again after a minute.
                </p>
            </div>
        </div>

        <ConfirmActionDialog
            v-model:visible="showReplaceDialog"
            title="Replace the JWK"
            action="replace"
            item-name="the JWK in the form"
            message="The current key is lost unless you saved it somewhere else."
            confirm-label="Replace"
            @confirm="generate"
        />
    </div>
</template>
