import {computed, type MaybeRefOrGetter, toValue} from "vue";
import {keepPreviousData, useInfiniteQuery, useQueryClient} from "@tanstack/vue-query";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {refDebounced} from "@vueuse/core";
import {useMutation} from "@tanstack/vue-query";
import {readActivity, type ActivityEvent} from "../types/activity.ts";
import {searchTextOf} from "../views/home/wallet/activity/activityPresenters.ts";

const PAGE_SIZE = 20;
const queryKeyOf = (walletId: number) => ['wallet-activity', walletId] as const;

/**
 * Records activities. Call it from a component's setup (or another composable's).
 * Recording never fails the action that triggered it: errors are only logged.
 */
export function useActivityRecorder() {
    const queryClient = useQueryClient();

    /** `walletId` is optional: without it, the activity is scoped to the whole Desk. */
    async function recordActivity(event: ActivityEvent, walletId?: number) {
        try {
            // Events are plain JSON. The copy strips Vue reactive proxies (e.g. a payload taken from props),
            // which IndexedDB cannot clone.
            const plainEvent = JSON.parse(JSON.stringify(event)) as ActivityEvent;
            await DeskDatabase.addActivity({walletId, date: new Date(), event: plainEvent});
            if (walletId !== undefined) {
                await queryClient.invalidateQueries({queryKey: queryKeyOf(walletId)});
            }
        } catch (e) {
            console.error('Failed to record activity:', e);
        }
    }

    return {recordActivity};
}

/** Deletes one activity from the history of the wallet. Only the local history is affected. */
export function useDeleteActivity(walletId: MaybeRefOrGetter<number>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (activityId: number) => DeskDatabase.deleteActivityById(activityId),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['wallet-activity', toValue(walletId)]}),
    });
}

/**
 * Activity of a wallet, newest first. Without a search it is paginated; with one, every activity
 * of the wallet is searched (the text lives inside the stored events, so it cannot be indexed).
 */
export function useWalletActivityQuery(walletId: MaybeRefOrGetter<number>, search: MaybeRefOrGetter<string> = '') {
    const term = refDebounced(computed(() => toValue(search).trim().toLowerCase()), 200);

    const query = useInfiniteQuery({
        queryKey: computed(() => [...queryKeyOf(toValue(walletId)), term.value]),
        // keeps the list on screen while the results of a new search load
        placeholderData: keepPreviousData,
        initialPageParam: undefined as number | undefined,
        queryFn: async ({pageParam}) => {
            if (term.value) {
                const rows = await DeskDatabase.getActivitiesByWalletId(toValue(walletId), {limit: Infinity});
                return rows.map(readActivity).filter(
                    (a) => (a.event ? searchTextOf(a.event) : 'unknown activity').includes(term.value),
                );
            }
            const rows = await DeskDatabase.getActivitiesByWalletId(toValue(walletId), {
                limit: PAGE_SIZE,
                before: pageParam,
            });
            return rows.map(readActivity);
        },
        getNextPageParam: (lastPage) =>
            !term.value && lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].id : undefined,
    });

    const activities = computed(() => query.data.value?.pages.flat() ?? []);
    return {...query, activities, isSearching: computed(() => !!term.value)};
}
