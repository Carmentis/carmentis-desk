import { useQuery } from '@tanstack/vue-query';
import { useWalletStore } from '../stores/walletStore.ts';
import { BalanceAvailability, Utils } from '@cmts-dev/carmentis-sdk/client';
import { type MaybeRefOrGetter, computed, ref, toValue } from 'vue';

export function useAccountIdQuery(walletId: MaybeRefOrGetter<number>) {
    const store = useWalletStore();
    return useQuery({
        queryKey: computed(() => ['account-id', toValue(walletId)]),
        queryFn: async () => {
            const id = toValue(walletId);
            console.log('Fetching account ID for walletId: ', id, ' ...');
            return await store.getAccountId(id);
        },
        retry: 1,
    });
}

export function useAccountStateQuery(walletId: MaybeRefOrGetter<number>) {
    const store = useWalletStore();
    const accountIdQuery = useAccountIdQuery(walletId);
    const enabled = computed(() => !!accountIdQuery.data.value);
    return useQuery({
        enabled,
        queryKey: computed(() => [
            'account-state',
            toValue(walletId),
            accountIdQuery.data.value,
        ]),
        queryFn: async () => {
            const accountId = accountIdQuery.data.value;
            if (accountId) {
                return await store.fetchAccountStateByAccountId(
                    toValue(walletId),
                    accountId,
                );
            } else {
                throw new Error('Account ID is undefined');
            }
        },
        staleTime: 60000,
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });
}

export function useAccountTransactionsHistory(
    walletId: MaybeRefOrGetter<number>,
) {
    const store = useWalletStore();
    const accountIdQuery = useAccountIdQuery(walletId);
    const accountStateQuery = useAccountStateQuery(walletId);

    const limit = ref(10);
    const lastAccountHistoryHashOverride = ref<Uint8Array | undefined>(
        undefined,
    );
    const lastAccountHistoryHash = computed(() => {
        if (lastAccountHistoryHashOverride.value !== undefined) {
            return lastAccountHistoryHashOverride.value;
        }
        return accountStateQuery.data.value?.lastHistoryHash;
    });

    const enabled = computed(
        () =>
            !!accountIdQuery.data.value &&
            lastAccountHistoryHash.value !== undefined,
    );
    const accountHistoryQuery = useQuery({
        enabled,
        queryKey: computed(() => [
            'account-transactions-history',
            toValue(walletId),
            accountIdQuery.data.value,
        ]),
        queryFn: async () => {
            const accountId = accountIdQuery.data.value;
            const lastHistoryHash = lastAccountHistoryHash.value;
            console.log(
                `Fetching account transactions history for account id ${Utils.binaryToHexa(accountId)} at history hash ${Utils.binaryToHexa(lastHistoryHash)}`,
            );
            if (accountId && lastHistoryHash !== undefined) {
                try {
                    return await store.fetchAccountTransactionsHistory(
                        toValue(walletId),
                        accountId,
                        lastHistoryHash,
                        limit.value,
                    );
                } catch (e) {
                    console.error(e);
                    throw e;
                }
            } else {
                throw new Error('Account ID is undefined');
            }
        },
    });

    function setLastAccountHistoryHash(hash: Uint8Array) {
        lastAccountHistoryHashOverride.value = hash;
    }

    function setLimit(newLimit: number) {
        limit.value = newLimit;
    }

    return { accountHistoryQuery, setLastAccountHistoryHash, setLimit, limit };
}

export function useAccountBreakdownQuery(walletId: MaybeRefOrGetter<number>) {
    const accountStateQuery = useAccountStateQuery(walletId);
    const enabled = computed(() => !!accountStateQuery.data.value);
    return useQuery({
        enabled,
        queryKey: computed(() => [
            'account-breakdown',
            toValue(walletId),
            accountStateQuery.data.value,
        ]),
        queryFn: async () => {
            const accountState = accountStateQuery.data.value;
            if (accountState) {
                return BalanceAvailability.createFromAccountStateAbciResponse(
                    accountState,
                );
            } else {
                throw new Error('Account state is undefined');
            }
        },
    });
}

export function useHasAccountOnChainQuery(walletId: MaybeRefOrGetter<number>) {
    const accountIdQuery = useAccountIdQuery(walletId);
    return computed(
        () =>
            accountIdQuery.isSuccess.value &&
            accountIdQuery.data.value !== undefined,
    );
}
