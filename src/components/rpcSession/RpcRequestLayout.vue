<script setup lang="ts">
import UiCard from '../ui/UiCard.vue';
import StickyActionBar from '../ui/StickyActionBar.vue';

/**
 * Shared layout of the screens asking the user to approve a request from an application:
 * who is asking (prominent), the details, then Decline / Approve pinned to the bottom on mobile.
 */
const props = defineProps<{
    title: string;
    description?: string;
    /** primeicons class of the header icon, replaced by `logoUrl` when it is provided. */
    icon?: string;
    logoUrl?: string;
    /** Who is asking. Always rendered as plain text. */
    requester?: { label: string; value: string };
    /** Wider layout for requests with a lot of content. */
    wide?: boolean;
}>();
</script>

<template>
    <div class="mx-auto w-full space-y-4" :class="props.wide ? 'max-w-2xl' : 'max-w-md'">
        <header class="text-center">
            <img
                v-if="props.logoUrl"
                :src="props.logoUrl"
                alt=""
                class="mx-auto mb-3 size-20 rounded-full border-4 border-line bg-surface object-contain p-2"
            />
            <span
                v-else-if="props.icon"
                class="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent"
            >
                <i class="pi text-2xl" :class="props.icon" aria-hidden="true" />
            </span>
            <h1 class="text-xl font-semibold text-fg">{{ props.title }}</h1>
            <p v-if="props.description" class="mt-1 text-sm text-fg-muted">{{ props.description }}</p>
        </header>

        <UiCard>
            <div v-if="props.requester" class="mb-5 rounded-control bg-info-soft px-4 py-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-info">{{ props.requester.label }}</p>
                <p class="break-all text-sm font-semibold text-fg">{{ props.requester.value }}</p>
            </div>
            <div class="space-y-5">
                <slot />
            </div>
        </UiCard>

        <StickyActionBar>
            <slot name="actions" />
        </StickyActionBar>
    </div>
</template>
