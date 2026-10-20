<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(defineProps<{
    title?: string;
    subtitle?: string;
    variant?: 'default' | 'muted' | 'danger';
    /** Set to false for content that needs to reach the card edges (tables, lists). */
    padded?: boolean;
}>(), {
    variant: 'default',
    padded: true,
});

const titleId = useId();

const VARIANTS = {
    default: 'border-line bg-surface',
    muted: 'border-line bg-surface-muted',
    danger: 'border-danger/40 bg-surface',
};

const hasHeader = computed(() => !!props.title);
</script>

<template>
    <section
        class="min-w-0 rounded-card border shadow-card"
        :class="VARIANTS[props.variant]"
        :aria-labelledby="props.title ? titleId : undefined"
    >
        <header
            v-if="hasHeader || $slots['header-actions']"
            class="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5"
        >
            <div class="min-w-0">
                <h2
                    v-if="props.title"
                    :id="titleId"
                    class="text-base font-semibold"
                    :class="props.variant === 'danger' ? 'text-danger' : 'text-fg'"
                >
                    {{ props.title }}
                </h2>
                <p v-if="props.subtitle" class="mt-0.5 text-sm text-fg-muted">{{ props.subtitle }}</p>
            </div>
            <div v-if="$slots['header-actions']" class="flex shrink-0 items-center gap-2">
                <slot name="header-actions" />
            </div>
        </header>

        <div :class="props.padded ? (hasHeader ? 'px-4 pb-4 pt-3 sm:px-6 sm:pb-6' : 'p-4 sm:p-6') : ''">
            <slot />
        </div>

        <footer v-if="$slots.footer" class="border-t border-line px-4 py-3 sm:px-6">
            <slot name="footer" />
        </footer>
    </section>
</template>
