<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import { breakpointsTailwind, useBreakpoints, useVModel } from '@vueuse/core';

const props = withDefaults(defineProps<{
    visible: boolean;
    header: string;
    /** Set to false while an action is running, so the dialog cannot be dismissed half-way. */
    closable?: boolean;
}>(), {
    closable: true,
});

const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();
const open = useVModel(props, 'visible', emit);

// Bottom sheet below `md`, centered modal from `md`.
const isDesktop = useBreakpoints(breakpointsTailwind).greaterOrEqual('md');

// `!` is required: PrimeVue's own dialog styles are not in a CSS layer and would otherwise win.
const pt = computed(() => ({
    root: {
        class: isDesktop.value
            ? 'w-[32rem]! max-w-[calc(100vw-2rem)]!'
            : 'm-0! w-full! max-w-none! max-h-[90dvh]! rounded-b-none! rounded-t-[var(--radius-sheet)]! shadow-sheet!',
    },
    content: { class: 'overflow-y-auto' },
}));
</script>

<template>
    <Dialog
        v-model:visible="open"
        modal
        :draggable="false"
        :header="props.header"
        :closable="props.closable"
        :close-on-escape="props.closable"
        :dismissable-mask="props.closable"
        :position="isDesktop ? 'center' : 'bottom'"
        :pt="pt"
    >
        <slot />
        <template v-if="$slots.footer" #footer>
            <div class="flex w-full flex-col-reverse gap-2 pb-safe sm:flex-row sm:justify-end">
                <slot name="footer" />
            </div>
        </template>
    </Dialog>
</template>
