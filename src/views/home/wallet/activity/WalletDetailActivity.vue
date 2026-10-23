<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute} from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import {useToast} from 'primevue/usetoast';
import {useDeleteActivity, useWalletActivityQuery} from '../../../../composables/useWalletActivity.ts';
import type {ReadActivity} from '../../../../types/activity.ts';
import ActivityRow from './ActivityRow.vue';
import ActivityDetailsDialog from './ActivityDetailsDialog.vue';
import EmptyState from '../../../../components/ui/EmptyState.vue';
import SkeletonBlock from '../../../../components/ui/SkeletonBlock.vue';

const route = useRoute();
const walletId = computed(() => Number(route.params.walletId));

const search = ref('');
const toast = useToast();

const {
    activities,
    isSearching,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
} = useWalletActivityQuery(walletId, search);

// ---- details and deletion ----
const selected = ref<ReadActivity | null>(null);
const showDetails = ref(false);
const {mutateAsync: deleteActivityAsync, isPending: isDeleting} = useDeleteActivity(walletId);

function openDetails(activity: ReadActivity) {
    selected.value = activity;
    showDetails.value = true;
}

async function deleteActivity(activity: ReadActivity) {
    try {
        await deleteActivityAsync(activity.id);
        showDetails.value = false;
        toast.add({severity: 'success', summary: 'Activity deleted', life: 3000});
    } catch (e) {
        console.error('Failed to delete activity:', e);
        toast.add({severity: 'error', summary: 'Could not delete the activity', life: 5000});
    }
}

// Activities are grouped by calendar day, newest first (the query already returns them in that order).
function dayLabel(date: Date): string {
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
}

const groups = computed(() => {
    const result: {label: string; items: ReadActivity[]}[] = [];
    for (const activity of activities.value) {
        const label = dayLabel(activity.date);
        const last = result[result.length - 1];
        if (last?.label === label) last.items.push(activity);
        else result.push({label, items: [activity]});
    }
    return result;
});
</script>

<template>
  <div class="space-y-4">
    <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" fluid placeholder="Search activity" aria-label="Search activity" autocomplete="off" spellcheck="false" />
    </IconField>

    <SkeletonBlock v-if="isPending" :lines="4" height-class="h-14" label="Loading activity…" />

    <div v-else-if="isError" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/40 bg-surface px-4 py-3 text-sm text-danger shadow-card">
        <span class="flex items-start gap-2">
            <i class="pi pi-times-circle mt-0.5" aria-hidden="true" />
            Couldn't load the activity. {{ error?.message }}
        </span>
        <Button label="Try again" icon="pi pi-refresh" severity="secondary" outlined size="small" @click="() => refetch()" />
    </div>

    <EmptyState
        v-else-if="groups.length === 0 && isSearching"
        framed
        icon="pi-search"
        title="No matching activity"
        :description="`Nothing matches “${search.trim()}”.`"
    >
        <Button label="Clear search" severity="secondary" outlined @click="search = ''" />
    </EmptyState>

    <EmptyState
        v-else-if="groups.length === 0"
        framed
        icon="pi-history"
        title="Nothing here yet"
        description="What this wallet does, like publishing, signing or signing in, will be listed here."
    />

    <div v-else class="space-y-6">
        <section v-for="group in groups" :key="group.label" :aria-label="group.label">
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{{ group.label }}</h3>
            <!-- New activities slide in at the top; transform and opacity only, a plain fade when motion is reduced. -->
            <TransitionGroup
                tag="ul"
                class="space-y-2"
                enter-active-class="transition duration-200 ease-out motion-reduce:transition-opacity"
                enter-from-class="-translate-y-2 opacity-0 motion-reduce:translate-y-0"
                move-class="transition-transform duration-200 motion-reduce:transition-none"
            >
                <li v-for="activity in group.items" :key="activity.id" class="min-w-0">
                    <ActivityRow :activity="activity" @open="openDetails(activity)" />
                </li>
            </TransitionGroup>
        </section>

        <div v-if="hasNextPage" class="flex justify-center">
            <Button
                label="Show older activity"
                icon="pi pi-chevron-down"
                severity="secondary"
                outlined
                :loading="isFetchingNextPage"
                :disabled="isFetchingNextPage"
                @click="() => fetchNextPage()"
            />
        </div>
    </div>

    <ActivityDetailsDialog
        v-model:visible="showDetails"
        :activity="selected"
        :wallet-id="walletId"
        :is-deleting="isDeleting"
        @delete="deleteActivity"
    />
  </div>
</template>
