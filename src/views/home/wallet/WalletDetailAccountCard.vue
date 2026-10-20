<script setup lang="ts">
import UiCard from '../../../components/ui/UiCard.vue';
import CopyableValue from '../../../components/ui/CopyableValue.vue';
import ErrorState from '../../../components/ui/ErrorState.vue';
import SkeletonBlock from '../../../components/ui/SkeletonBlock.vue';
import { useCurrentWallet } from '../../../composables/useCurrentWallet.ts';

const { useAccountIdQuery } = useCurrentWallet();
const accountIdQuery = useAccountIdQuery();
</script>

<template>
    <UiCard title="Account ID" subtitle="Identifies your account on the blockchain.">
        <SkeletonBlock v-if="accountIdQuery.isLoading.value" :lines="1" />
        <ErrorState
            v-else-if="accountIdQuery.error.value"
            title="Account ID unavailable"
            :message="accountIdQuery.error.value.message"
            retryable
            @retry="accountIdQuery.refetch()"
        />
        <CopyableValue
            v-else-if="accountIdQuery.data.value"
            :value="accountIdQuery.data.value"
            label="account ID"
            :head="10"
            :tail="8"
        />
        <p v-else class="text-sm text-fg-muted">
            No account yet. It is created the first time this wallet receives tokens.
        </p>
    </UiCard>
</template>
