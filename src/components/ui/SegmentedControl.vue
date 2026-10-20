<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';
import type { SegmentedOption } from './types.ts';

const props = defineProps<{
    modelValue: T;
    options: SegmentedOption<T>[];
    ariaLabel: string;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: T): void }>();
// useVModel does not infer the generic T, hence the explicit computed.
const model = computed<T>({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

// Radio-group keyboard pattern: arrows move the selection, only the selected option is tabbable.
function onKeydown(event: KeyboardEvent, index: number) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
        : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + props.options.length) % props.options.length;
    model.value = props.options[next].value;
    const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
    buttons?.[next]?.focus();
}
</script>

<template>
    <div
        role="radiogroup"
        :aria-label="props.ariaLabel"
        class="inline-flex max-w-full rounded-control bg-surface-muted p-1"
    >
        <button
            v-for="(option, index) in props.options"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="model === option.value"
            :tabindex="model === option.value ? 0 : -1"
            class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius-control)-2px)] px-4 text-sm font-medium transition-colors"
            :class="model === option.value
                ? 'bg-surface text-fg shadow-card'
                : 'text-fg-muted hover:text-fg'"
            @click="model = option.value"
            @keydown="onKeydown($event, index)"
        >
            <i v-if="option.icon" class="pi text-sm" :class="option.icon" aria-hidden="true" />
            {{ option.label }}
        </button>
    </div>
</template>
