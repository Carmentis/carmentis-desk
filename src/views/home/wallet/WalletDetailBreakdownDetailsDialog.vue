<script setup lang="ts">
import {computed, ref} from "vue";
import {CMTSToken, TokenUnit} from "@cmts-dev/carmentis-sdk-core";
import {useCurrentWallet} from "../../../composables/useCurrentWallet.ts";
import ResponsiveDialog from "../../../components/ui/ResponsiveDialog.vue";
import SegmentedControl from "../../../components/ui/SegmentedControl.vue";
import CopyableValue from "../../../components/ui/CopyableValue.vue";
import EmptyState from "../../../components/ui/EmptyState.vue";
import type {SegmentedOption} from "../../../components/ui/types.ts";

const isOpen = defineModel<boolean>('isOpen', { default: false });
const {useAccountStateQuery} = useCurrentWallet();

const accountStateQuery = useAccountStateQuery();
const accountState = computed(() => accountStateQuery.data.value);
const stakingLocks = computed(() => accountState.value ? accountState.value.stakingLocks : []);
const vestingLocks = computed(() => accountState.value ? accountState.value.vestingLocks : []);
const escrowLocks = computed(() => accountState.value ? accountState.value.escrowLocks : []);

function formatAtomics(amount: number): string {
    return CMTSToken.createAtomic(amount).toString(
        TokenUnit.TOKEN,
        {locale: "system", grouping: true, decimalPlaces: 2}
    );
}

function formatTimestamp(timestamp: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
}

function formatTimestampPlusDays(timestamp: number, days: number): string {
    if (!timestamp) return '-';
    return new Date((timestamp + days * 86400) * 1000).toLocaleString();
}

// ---- presentation: one card per lock, the lock type is chosen with a segmented control ----
type LockKind = 'staking' | 'vesting' | 'escrow';
interface LockRow { label: string; value: string | number; technical?: boolean }
interface LockCard { amount: string; rows: LockRow[] }

const kind = ref<LockKind>('staking');
const options = computed<SegmentedOption<LockKind>[]>(() => [
    { value: 'staking', label: `Staking (${stakingLocks.value.length})` },
    { value: 'vesting', label: `Vesting (${vestingLocks.value.length})` },
    { value: 'escrow', label: `Escrow (${escrowLocks.value.length})` },
]);

const cards = computed<LockCard[]>(() => {
    if (kind.value === 'staking') {
        return stakingLocks.value.map((lock) => ({
            amount: formatAtomics(lock.amount),
            rows: [
                { label: 'Validator node ID', value: lock.validatorNodeId, technical: true },
                { label: 'Slashed', value: lock.slashed ? 'Yes' : 'No' },
                { label: 'Planned unlock', value: formatAtomics(lock.plannedUnlockAmountInAtomics) },
                { label: 'Unlock date', value: formatTimestamp(lock.plannedUnlockTimestamp) },
            ],
        }));
    }
    if (kind.value === 'vesting') {
        return vestingLocks.value.map((lock) => ({
            amount: formatAtomics(lock.amount),
            rows: [
                { label: 'Initial vested', value: formatAtomics(lock.initialVestedAmountInAtomics) },
                { label: 'Cliff start', value: formatTimestamp(lock.cliffStartTimestamp) },
                { label: 'Cliff (days)', value: lock.cliffDurationDays },
                { label: 'Vesting (days)', value: lock.vestingDurationDays },
                { label: 'Vesting start', value: formatTimestampPlusDays(lock.cliffStartTimestamp, lock.cliffDurationDays) },
                {
                    label: 'Vesting end',
                    value: formatTimestampPlusDays(lock.cliffStartTimestamp, lock.cliffDurationDays + lock.vestingDurationDays),
                },
            ],
        }));
    }
    return escrowLocks.value.map((lock) => ({
        amount: formatAtomics(lock.amount),
        rows: [
            { label: 'Escrow ID', value: lock.escrowIdentifier, technical: true },
            { label: 'Emitter', value: lock.fundEmitterAccountId, technical: true },
            { label: 'Authorizer', value: lock.transferAuthorizerAccountId, technical: true },
            { label: 'Start', value: formatTimestamp(lock.startTimestamp) },
            { label: 'Duration (days)', value: lock.durationDays },
            { label: 'Limit date', value: formatTimestampPlusDays(lock.startTimestamp, lock.durationDays) },
        ],
    }));
});

const EMPTY_TITLES: Record<LockKind, string> = {
    staking: 'No staking lock',
    vesting: 'No vesting lock',
    escrow: 'No escrow lock',
};
</script>

<template>
    <ResponsiveDialog v-model:visible="isOpen" header="Staked, vested and escrowed tokens" size="lg">
        <div class="space-y-4">
            <SegmentedControl v-model="kind" :options="options" ariaLabel="Type of lock" />

            <EmptyState v-if="cards.length === 0" icon="pi-lock" :title="EMPTY_TITLES[kind]" />

            <ul v-else class="space-y-3">
                <li v-for="(card, index) in cards" :key="index" class="rounded-control border border-line p-3">
                    <p class="text-lg font-semibold tabular-nums text-fg">{{ card.amount }}</p>
                    <dl class="mt-2 space-y-1.5">
                        <div v-for="row in card.rows" :key="row.label" class="flex items-baseline justify-between gap-4 text-sm">
                            <dt class="shrink-0 text-fg-muted">{{ row.label }}</dt>
                            <dd class="min-w-0 text-right text-fg">
                                <CopyableValue v-if="row.technical" :value="String(row.value)" :label="row.label" :head="8" :tail="6" />
                                <template v-else>{{ row.value }}</template>
                            </dd>
                        </div>
                    </dl>
                </li>
            </ul>
        </div>
    </ResponsiveDialog>
</template>
