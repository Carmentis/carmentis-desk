<script setup lang="ts">
import { computed } from 'vue';
import UiCard from '../../../components/ui/UiCard.vue';
import CopyableValue from '../../../components/ui/CopyableValue.vue';
import ErrorState from '../../../components/ui/ErrorState.vue';
import ErrorDetails from '../../../components/ui/ErrorDetails.vue';
import SkeletonBlock from '../../../components/ui/SkeletonBlock.vue';
import { useCurrentWallet } from '../../../composables/useCurrentWallet.ts';
import { isUnknownAccountError } from '../../../utils/accountErrors.ts';

const { useAccountIdQuery } = useCurrentWallet();
const accountIdQuery = useAccountIdQuery();

// A wallet without account makes the search fail: that only means "no account yet".
const hasNoAccount = computed(() => isUnknownAccountError(accountIdQuery.error.value));
const isRealError = computed(() => !!accountIdQuery.error.value && !hasNoAccount.value);
</script>

<template>
    <UiCard title="Account ID" subtitle="Identifies your account on the blockchain.">
        <CopyableValue
            v-if="accountIdQuery.data.value"
            :value="accountIdQuery.data.value"
            label="account ID"
            :head="10"
            :tail="8"
        />

        <ErrorState
            v-else-if="isRealError"
            title="Account ID unavailable"
            message="We could not search the blockchain. Check your connection and the network settings of this wallet."
            :details="accountIdQuery.error.value?.message"
            retryable
            @retry="accountIdQuery.refetch()"
        />

        <div v-else-if="hasNoAccount" class="space-y-1">
            <p class="text-sm text-fg-muted">
                No account yet. It is created the first time this wallet receives tokens.
            </p>
            <ErrorDetails :details="accountIdQuery.error.value?.message ?? ''" />
        </div>

        <SkeletonBlock v-else label="Loading your account ID…" :lines="1" />
    </UiCard>
</template>
