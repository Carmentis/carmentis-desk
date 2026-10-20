<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useClipboard } from '@vueuse/core';
import { iconButtonClass } from './classes.ts';

const props = withDefaults(defineProps<{
    title: string;
    /** A JSON string, or any value that can be serialized. */
    value: unknown;
    defaultOpen?: boolean;
}>(), {
    defaultOpen: false,
});

const open = ref(props.defaultOpen);
const bodyId = useId();
const { copy, copied, isSupported } = useClipboard({ copiedDuring: 2000 });

const text = computed(() =>
    typeof props.value === 'string' ? props.value : JSON.stringify(props.value, null, 2) ?? '',
);
</script>

<template>
    <div class="min-w-0 rounded-control border border-line">
        <div class="flex items-center justify-between gap-2 pl-3">
            <button
                type="button"
                class="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-fg"
                :aria-expanded="open"
                :aria-controls="bodyId"
                @click="open = !open"
            >
                <i class="pi text-xs text-fg-muted" :class="open ? 'pi-chevron-down' : 'pi-chevron-right'" aria-hidden="true" />
                <span class="truncate">{{ props.title }}</span>
            </button>
            <button
                type="button"
                :class="iconButtonClass"
                :disabled="!isSupported || !text"
                :aria-label="`Copy ${props.title}`"
                @click="copy(text)"
            >
                <i class="pi" :class="copied ? 'pi-check text-success' : 'pi-copy'" aria-hidden="true" />
            </button>
        </div>
        <pre
            v-if="open"
            :id="bodyId"
            tabindex="0"
            class="max-h-64 overflow-auto border-t border-line bg-surface-muted p-3 font-mono text-xs text-fg"
        >{{ text }}</pre>
        <span class="sr-only" role="status">{{ copied ? `${props.title} copied` : '' }}</span>
    </div>
</template>
