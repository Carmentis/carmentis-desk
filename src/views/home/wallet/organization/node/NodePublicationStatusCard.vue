<script setup lang="ts">
import type { Hash } from '@cmts-dev/carmentis-sdk-core';
import type { NodeEntity } from '../../../../../stores/storage.ts';
import {Node} from "../../../../../types/types.ts";
import UiCard from "../../../../../components/ui/UiCard.vue";
import StatusBadge from "../../../../../components/ui/StatusBadge.vue";
import CopyableValue from "../../../../../components/ui/CopyableValue.vue";
import EmptyState from "../../../../../components/ui/EmptyState.vue";

defineProps<{
    node: Node;
    isNodePublished?: boolean;
    isNodeValidator?: unknown;
    isNodeClaimed?: boolean;
    nodeOwnerName?: string;
    nodeOwnerAccountId?: string;
    isOwnedByWallet?: boolean;
}>();
</script>

<template>
    <UiCard title="Publication status">
        <EmptyState
            v-if="!node.nodeVbId"
            icon="pi-question-circle"
            title="Not published yet"
            description="This node has no virtual blockchain ID."
        />

        <dl v-else class="space-y-4 text-sm">
            <div>
                <dt class="mb-1 text-fg-muted">Publication</dt>
                <dd class="flex flex-wrap items-center gap-2">
                    <StatusBadge
                        :tone="isNodePublished ? 'success' : 'neutral'"
                        :label="isNodePublished ? 'Published' : 'Not published'"
                        :icon="isNodePublished ? 'pi-check-circle' : 'pi-times-circle'"
                    />
                    <StatusBadge
                        :tone="isNodeValidator ? 'info' : 'neutral'"
                        :label="isNodeValidator ? 'Validator' : 'Replicator'"
                        :icon="isNodeValidator ? 'pi-verified' : 'pi-copy'"
                    />
                </dd>
            </div>

            <div v-if="isNodePublished">
                <dt class="mb-1 text-fg-muted">Claim</dt>
                <dd>
                    <StatusBadge
                        :tone="isNodeClaimed ? 'info' : 'warning'"
                        :label="isNodeClaimed ? (nodeOwnerName ? `Claimed by ${nodeOwnerName}` : 'Claimed') : 'Not claimed'"
                        :icon="isNodeClaimed ? 'pi-lock' : 'pi-unlock'"
                    />
                </dd>
            </div>

            <div v-if="isNodeClaimed && nodeOwnerAccountId">
                <dt class="mb-1 text-fg-muted">Owner</dt>
                <dd class="space-y-2">
                    <CopyableValue :value="nodeOwnerAccountId" label="owner account ID" :head="12" :tail="10" />
                    <StatusBadge
                        v-if="isOwnedByWallet"
                        tone="success"
                        label="Owned by this wallet"
                    />
                    <StatusBadge
                        v-else
                        tone="warning"
                        label="Owned by another account"
                    />
                </dd>
            </div>
        </dl>
    </UiCard>
</template>
