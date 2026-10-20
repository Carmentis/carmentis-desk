<script setup lang="ts">
/** Centered card shared by the screens shown before the app is unlocked (onboarding, login). */
const props = defineProps<{
    title: string;
    subtitle?: string;
}>();
</script>

<template>
    <main class="flex min-h-dvh items-center justify-center bg-page p-4 pt-safe pb-safe">
        <div class="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
            <div class="mb-6 text-center">
                <slot name="icon" />
                <h1 class="text-2xl font-semibold text-fg">{{ props.title }}</h1>
                <p v-if="props.subtitle" class="mt-1 text-sm text-fg-muted">{{ props.subtitle }}</p>
            </div>
            <slot />
        </div>
    </main>
</template>
