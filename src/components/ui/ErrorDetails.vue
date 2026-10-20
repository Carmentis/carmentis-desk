<script setup lang="ts">
import { ref, useId } from 'vue';

/** The raw, technical text of an error, one click away from the friendly message. */
const props = defineProps<{
    details: string;
}>();

const open = ref(false);
const bodyId = useId();
</script>

<template>
    <div class="w-full max-w-md text-left">
        <button
            type="button"
            class="mx-auto flex min-h-11 items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg"
            :aria-expanded="open"
            :aria-controls="bodyId"
            @click="open = !open"
        >
            <i class="pi text-[0.65rem]" :class="open ? 'pi-chevron-down' : 'pi-chevron-right'" aria-hidden="true" />
            {{ open ? 'Hide details' : 'Show details' }}
        </button>
        <pre
            v-if="open"
            :id="bodyId"
            tabindex="0"
            class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-control bg-surface-muted p-3 font-mono text-xs text-fg"
        >{{ props.details }}</pre>
    </div>
</template>
