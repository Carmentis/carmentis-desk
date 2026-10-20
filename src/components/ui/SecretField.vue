<script setup lang="ts">
import { ref, watch } from 'vue';
import { useClipboard, useDocumentVisibility, useTimeoutFn } from '@vueuse/core';
import { iconButtonClass } from './classes.ts';

const props = withDefaults(defineProps<{
    label: string;
    /** The secret. It is only put in the DOM while revealed. */
    value: string | null | undefined;
    /** Long secrets (JWK, mnemonic) are shown in a scrollable, wrapping block. */
    multiline?: boolean;
    /** The secret hides itself again after this delay. */
    autoHideMs?: number;
    warning?: string;
}>(), {
    multiline: false,
    autoHideMs: 30_000,
    warning: 'Anyone who sees this can take control of your funds. Make sure nobody is watching your screen.',
});

const revealed = ref(false);
const { copy, copied, isSupported } = useClipboard({ copiedDuring: 2000 });
const { start, stop } = useTimeoutFn(() => hide(), () => props.autoHideMs, { immediate: false });

function reveal() {
    revealed.value = true;
    start();
}

function hide() {
    revealed.value = false;
    stop();
}

// Never leave a secret on screen while the window is in the background.
const visibility = useDocumentVisibility();
watch(visibility, (state) => state === 'hidden' && hide());
// Hide if the secret itself changes (another wallet selected).
watch(() => props.value, hide);
</script>

<template>
    <div class="min-w-0 space-y-2">
        <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-fg">{{ props.label }}</span>
            <div class="flex items-center">
                <button
                    type="button"
                    :class="iconButtonClass"
                    :disabled="!props.value"
                    :aria-pressed="revealed"
                    :aria-label="revealed ? `Hide ${props.label}` : `Reveal ${props.label}`"
                    @click="revealed ? hide() : reveal()"
                >
                    <i class="pi" :class="revealed ? 'pi-eye-slash' : 'pi-eye'" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    :class="iconButtonClass"
                    :disabled="!props.value || !isSupported"
                    :aria-label="`Copy ${props.label}`"
                    @click="props.value && copy(props.value)"
                >
                    <i class="pi" :class="copied ? 'pi-check text-success' : 'pi-copy'" aria-hidden="true" />
                </button>
            </div>
        </div>

        <div class="rounded-control border border-line bg-surface-muted px-3 py-2 font-mono text-sm text-fg">
            <div
                v-if="revealed && props.value"
                class="select-all break-all"
                :class="props.multiline ? 'max-h-48 overflow-auto whitespace-pre-wrap' : ''"
            >{{ props.value }}</div>
            <span v-else-if="!props.value" class="text-fg-muted">Not available</span>
            <span v-else role="img" aria-label="Hidden value" class="tracking-widest text-fg-muted">••••••••••••••••</span>
        </div>

        <p
            v-if="revealed"
            role="status"
            class="flex gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning"
        >
            <i class="pi pi-exclamation-triangle mt-0.5" aria-hidden="true" />
            <span>{{ props.warning }} It will hide again in {{ Math.round(props.autoHideMs / 1000) }} seconds.</span>
        </p>
        <span class="sr-only" role="status">{{ copied ? `${props.label} copied` : '' }}</span>
    </div>
</template>
