<script setup lang="ts">
import type { StatusTone } from './types.ts';

const props = defineProps<{
    tone: StatusTone;
    label: string;
    /** Overrides the default icon of the tone (a primeicons class such as `pi-lock`). */
    icon?: string;
}>();

// Full class names so that Tailwind can detect them.
const TONES: Record<StatusTone, { classes: string; icon: string }> = {
    success: { classes: 'bg-success-soft text-success', icon: 'pi-check-circle' },
    warning: { classes: 'bg-warning-soft text-warning', icon: 'pi-exclamation-triangle' },
    danger: { classes: 'bg-danger-soft text-danger', icon: 'pi-times-circle' },
    info: { classes: 'bg-info-soft text-info', icon: 'pi-info-circle' },
    neutral: { classes: 'bg-surface-muted text-fg-muted', icon: 'pi-circle' },
};
</script>

<template>
    <!-- The tone is always doubled by an icon and the text label: never color alone. -->
    <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        :class="TONES[props.tone].classes"
    >
        <i class="pi text-xs" :class="props.icon ?? TONES[props.tone].icon" aria-hidden="true" />
        {{ props.label }}
    </span>
</template>
