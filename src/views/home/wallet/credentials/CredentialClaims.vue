<script setup lang="ts">
import { ref } from 'vue';

/** A list of claims; long values are truncated and can be expanded one by one. */
interface ClaimEntry {
    id: string;
    key: string;
    preview: string;
    full: string;
    expandable: boolean;
}

const props = withDefaults(defineProps<{
    entries: ClaimEntry[];
    /** Color of the claim names. */
    tone?: 'accent' | 'muted';
}>(), {
    tone: 'accent',
});

const expanded = ref<Set<string>>(new Set());

function toggle(id: string) {
    const next = new Set(expanded.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded.value = next;
}
</script>

<template>
    <dl class="divide-y divide-line overflow-hidden rounded-control border border-line">
        <div
            v-for="entry in props.entries"
            :key="entry.id"
            class="grid gap-0.5 px-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3"
        >
            <dt
                class="truncate font-mono text-xs font-medium sm:pt-0.5"
                :class="props.tone === 'accent' ? 'text-accent' : 'text-fg-muted'"
                :title="entry.key"
            >
                {{ entry.key }}
            </dt>
            <dd class="min-w-0">
                <span
                    class="text-sm text-fg"
                    :class="expanded.has(entry.id) ? 'whitespace-pre-wrap break-all' : 'block truncate'"
                    :title="entry.expandable ? entry.full : undefined"
                >
                    {{ expanded.has(entry.id) ? entry.full : entry.preview }}
                </span>
                <button
                    v-if="entry.expandable"
                    type="button"
                    class="inline-flex min-h-11 items-center text-xs font-medium text-accent hover:underline"
                    :aria-expanded="expanded.has(entry.id)"
                    :aria-label="`${expanded.has(entry.id) ? 'Show less of' : 'Show more of'} ${entry.key}`"
                    @click="toggle(entry.id)"
                >
                    {{ expanded.has(entry.id) ? 'Show less' : 'Show more' }}
                </button>
            </dd>
        </div>
    </dl>
</template>
