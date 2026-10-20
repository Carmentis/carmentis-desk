<script setup lang="ts">
import { computed, nextTick, useId, watch } from 'vue';
import { useStorage, useVModel } from '@vueuse/core';
import type { TabItem } from './types.ts';

const props = defineProps<{
    modelValue: string;
    tabs: TabItem[];
    ariaLabel: string;
    /**
     * When set, the active tab is kept in sessionStorage under this key, so it survives navigation.
     * (Not mirrored in the URL: App.vue keys <router-view> on the full path, so a query change would remount the page.)
     */
    persistKey?: string;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();
const model = useVModel(props, 'modelValue', emit);
const uid = useId();

const visibleTabs = computed(() => props.tabs.filter((tab) => !tab.hidden));
const isVisible = (value: string) => visibleTabs.value.some((tab) => tab.value === value);

const stored = props.persistKey ? useStorage<string>(props.persistKey, props.modelValue, sessionStorage) : null;
if (stored && isVisible(stored.value)) model.value = stored.value;

watch(model, (value) => {
    if (stored) stored.value = value;
});

// A tab can disappear (e.g. role change): fall back to the first visible one.
watch(visibleTabs, (tabs) => {
    if (tabs.length > 0 && !isVisible(model.value)) model.value = tabs[0].value;
}, { immediate: true });

const tabId = (value: string) => `${uid}-tab-${value}`;
const panelId = (value: string) => `${uid}-panel-${value}`;

async function select(value: string, focus = false) {
    model.value = value;
    await nextTick();
    const button = document.getElementById(tabId(value));
    if (focus) button?.focus();
    button?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

function onKeydown(event: KeyboardEvent, index: number) {
    const tabs = visibleTabs.value;
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    select(tabs[next].value, true);
}
</script>

<template>
    <div class="min-w-0">
        <!-- Scrolls horizontally on narrow screens; the page itself never does. -->
        <div
            role="tablist"
            :aria-label="props.ariaLabel"
            class="flex overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            <button
                v-for="(tab, index) in visibleTabs"
                :id="tabId(tab.value)"
                :key="tab.value"
                type="button"
                role="tab"
                :aria-selected="model === tab.value"
                :aria-controls="panelId(tab.value)"
                :tabindex="model === tab.value ? 0 : -1"
                class="-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors"
                :class="model === tab.value
                    ? 'border-accent text-accent'
                    : 'border-transparent text-fg-muted hover:text-fg'"
                @click="select(tab.value)"
                @keydown="onKeydown($event, index)"
            >
                <i v-if="tab.icon" class="pi text-sm" :class="tab.icon" aria-hidden="true" />
                {{ tab.label }}
                <span
                    v-if="tab.badge !== undefined"
                    class="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg-muted"
                >{{ tab.badge }}</span>
            </button>
        </div>

        <div
            :id="panelId(model)"
            role="tabpanel"
            :aria-labelledby="tabId(model)"
            class="pt-4"
        >
            <slot :active="model" />
        </div>
    </div>
</template>
