<script setup lang="ts">
const props = defineProps<{
    /** primeicons class, e.g. `pi-building`. */
    icon: string;
    title: string;
    /** One line explaining what belongs here. */
    description?: string;
    /** Draws the state as a card of its own (when it is not already inside one). */
    framed?: boolean;
}>();
</script>

<template>
    <div
        class="flex flex-col items-center gap-3 px-4 py-10 text-center"
        :class="props.framed ? 'rounded-card border border-line bg-surface shadow-card' : ''"
    >
        <span class="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <i class="pi text-xl" :class="props.icon" aria-hidden="true" />
        </span>
        <h3 class="text-base font-semibold text-fg">{{ props.title }}</h3>
        <p v-if="props.description" class="max-w-sm text-sm text-fg-muted">{{ props.description }}</p>
        <!-- The one clear call to action -->
        <div v-if="$slots.default" class="mt-1">
            <slot />
        </div>
    </div>
</template>
