import { computed, ref, watch, type Ref } from 'vue';

/**
 * Tells whether an on-chain search has really answered.
 *
 * The searches of the stores return an empty result, instead of waiting, while the indexer, the
 * account or the organization ID is not available yet. Until the next poll that empty result looks
 * exactly like "nothing found", so every item would read as a draft.
 *
 * The search is settled once a fetch finished after `ready` became true. As soon as `ready` turns
 * true the search is refreshed, so the wait does not last until the next poll.
 */
export function useSettledOnChainSearch(
    query: { dataUpdatedAt: Ref<number>; errorUpdatedAt: Ref<number>; refetch: () => unknown },
    ready: Ref<boolean>,
) {
    const readyAt = ref<number | null>(null);

    watch(ready, (isReady) => {
        if (!isReady) {
            readyAt.value = null;
        } else if (readyAt.value === null) {
            readyAt.value = Date.now();
            query.refetch();
        }
    }, { immediate: true });

    return computed(() =>
        readyAt.value !== null
        && Math.max(query.dataUpdatedAt.value, query.errorUpdatedAt.value) >= readyAt.value,
    );
}
