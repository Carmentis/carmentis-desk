<script setup lang="ts">
// Primary actions of a form. Pinned to the bottom of the screen below `lg` (above the bottom navigation,
// whose height AppShell publishes in --bottom-nav-h), and inline at the end of the form on desktop.
</script>

<template>
    <!-- Keeps the last form fields from hiding behind the pinned bar. -->
    <div class="h-24 lg:hidden" aria-hidden="true" />
    <div
        class="fixed inset-x-0 bottom-[var(--bottom-nav-h,0px)] z-30 border-t border-line bg-surface/95 pb-safe backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
    >
        <div class="mx-auto flex max-w-3xl flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:justify-end lg:max-w-none lg:px-0 lg:py-0">
            <slot />
        </div>
    </div>
</template>
