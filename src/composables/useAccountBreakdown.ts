import { useQuery } from '@tanstack/vue-query';
import { useWalletStore } from '../stores/walletStore.ts';
import { type MaybeRefOrGetter, computed, ref, toValue } from 'vue';

function formatCmts(milliCmts: number): string {
    return (milliCmts / 1000).toFixed(3) + ' CMTS';
}

export function useAccountIdQuery(walletId: MaybeRefOrGetter<number>) {
    const store = useWalletStore();
    return useQuery({
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        queryKey: computed(() => ['account-id', toValue(walletId)]),
        queryFn: async () => {
            const id = toValue(walletId);
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
        queryKey: computed(() => ['account-state', toValue(walletId), accountIdQuery.data.value]),
        queryFn: async () => {
            const accountId = accountIdQuery.data.value;
            if (accountId) {
                return await store.fetchAccountStateByAccountId(toValue(walletId), accountId);
            } else {
                throw new Error('Account ID is undefined');
            }
        },
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });
}

export function useAccountTransactionsHistory(walletId: MaybeRefOrGetter<number>) {
    const store = useWalletStore();
    const accountIdQuery = useAccountIdQuery(walletId);

    const limit = ref(10);

    const enabled = computed(() => !!accountIdQuery.data.value);
    const accountHistoryQuery = useQuery({
        enabled,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        queryKey: computed(() => ['account-transactions-history', toValue(walletId), accountIdQuery.data.value, limit.value]),
        queryFn: async () => {
            const accountId = accountIdQuery.data.value;
            if (accountId) {
                return await store.fetchAccountTransactionsHistory(toValue(walletId), accountId, limit.value);
            } else {
                throw new Error('Account ID is undefined');
            }
        },
    });

    function setLimit(newLimit: number) {
        limit.value = newLimit;
    }

    return { accountHistoryQuery, setLimit, limit };
}

export function useAccountBreakdownQuery(walletId: MaybeRefOrGetter<number>) {
    const accountStateQuery = useAccountStateQuery(walletId);
    const enabled = computed(() => !!accountStateQuery.data.value);
    return useQuery({
        enabled,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        queryKey: computed(() => ['account-breakdown', toValue(walletId), accountStateQuery.data.value]),
        queryFn: async () => {
            const acc = accountStateQuery.data.value;
            if (!acc) throw new Error('Account state is undefined');
            const staked   = acc.stakingLocks.reduce((s, l) => s + l.amount, 0);
            const vested   = acc.vestingLocks.reduce((s, l) => s + l.amount, 0);
            const escrowed = acc.escrowLocks.reduce((s, l) => s + l.amount, 0);
            return {
                getSpendable: () => formatCmts(acc.balance),
                getStaked:    () => formatCmts(staked),
                getVested:    () => formatCmts(vested + escrowed),
            };
        },
    });
}

export function useHasAccountOnChainQuery(walletId: MaybeRefOrGetter<number>) {
    const accountIdQuery = useAccountIdQuery(walletId);
    return computed(() => accountIdQuery.isSuccess.value && accountIdQuery.data.value !== undefined);
}
