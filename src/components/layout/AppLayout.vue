<script setup lang="ts">
import AppShell from './AppShell.vue';
import SkeletonBlock from '../ui/SkeletonBlock.vue';
</script>

<template>
    <AppShell>
        <!-- Keyed on the full path so that every page is recreated on navigation, as before the shell was persistent. -->
        <Suspense>
            <router-view :key="$route.fullPath" />
            <template #fallback>
                <SkeletonBlock :lines="4" />
            </template>
        </Suspense>
    </AppShell>
</template>
