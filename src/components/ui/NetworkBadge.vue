<script setup lang="ts">
import { capitalize, computed } from 'vue';
import StatusBadge from './StatusBadge.vue';
import type { StatusTone } from './types.ts';
import { NETWORK_PRESETS } from '../../utils/networkPresets.ts';

const props = defineProps<{
    networkName: string;
}>();

const TONES: Record<string, StatusTone> = {
    mainnet: 'success',
    testnet: 'warning',
    devnet: 'info',
};

const label = computed(() =>
    NETWORK_PRESETS.find((preset) => preset.value === props.networkName)?.label ?? capitalize(props.networkName),
);
</script>

<template>
    <StatusBadge :tone="TONES[props.networkName] ?? 'neutral'" :label="label" icon="pi-globe" />
</template>
