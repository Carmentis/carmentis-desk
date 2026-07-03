import { useQuery } from '@tanstack/vue-query';
import { useWalletStore } from '../stores/walletStore.ts';
import {type MaybeRefOrGetter, computed, ref, toValue, Ref} from 'vue';
import {BalanceAvailability, CMTSToken, LockType, TokenUnit, Utils, Lock, Hash} from "@cmts-dev/carmentis-sdk-core";
import {AccountDto, AppControllerGetAccountHistoryParams} from "../api/indexer/model";
import {match, P} from "ts-pattern";

function formatCmts(milliCmts: number): string {
    return (milliCmts / 1000).toFixed(3) + ' CMTS';
}

// Refetch interval in milliseconds
const DEFAULT_REFETCH_INTERVAL = 3000;

export function useAccountIdQuery(walletId: MaybeRefOrGetter<number>) {
    const store = useWalletStore();
    return useQuery({
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
        queryKey: computed(() => ['account-id', toValue(walletId)]),
        queryFn: async () => {
            console.log(`Searching account id`)
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
    console.log(`Searching account state`)
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
        staleTime: 1000,
        refetchIntervalInBackground: true,
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });
}

export function useAccountTransactionsHistory(walletId: MaybeRefOrGetter<number>, fromHeight: Ref<number>, nbLimit: Ref<number>) {
    const store = useWalletStore();
    const accountIdQuery = useAccountIdQuery(walletId);

    const enabled = computed(() => !!accountIdQuery.data.value);
    const accountHistoryQuery = useQuery({
        enabled,
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        queryKey: computed(() => [
            'account-transactions-history',
            toValue(walletId),
            accountIdQuery.data.value,
            fromHeight,
            nbLimit
        ]),
        queryFn: async () => {
            const accountId = accountIdQuery.data.value;
            console.log(`Searching account transactions for account id ${accountId}`)
            return match(accountIdQuery.data.value)
                .with(P.nullish, () => {
                    throw new Error('Account ID is undefined')
                })
                .with(P.string, async (accountId) => await store.fetchAccountTransactionsHistory(
                    toValue(walletId),
                    Hash.from(accountId).toBytes(), {
                        height_gte: fromHeight.value,
                        limit: nbLimit.value,
                    })
                )
                .otherwise(() => null);

        },
    });



    return { accountHistoryQuery };
}

export function getBalanceAvailability(account: AccountDto) {
    const locks: Lock[] = []
    for (const lock of account.escrowLocks) {
        locks.push({
            type: LockType.Escrow,
            lockedAmountInAtomics: lock.amount,
            parameters: {
                escrowIdentifier: Utils.binaryFromHexa(lock.escrowIdentifier),
                fundEmitterAccountId: Utils.binaryFromHexa(lock.fundEmitterAccountId),
                transferAuthorizerAccountId: Utils.binaryFromHexa(lock.transferAuthorizerAccountId),
                startTimestamp: lock.startTimestamp,
                durationDays: lock.durationDays,
            }
        });
    }
    for (const lock of account.stakingLocks) {
        locks.push({
            type: LockType.NodeStaking,
            lockedAmountInAtomics: lock.amount,
            parameters: {
                validatorNodeId: Utils.binaryFromHexa(lock.validatorNodeId),
                plannedUnlockAmountInAtomics: lock.plannedSlashingAmountInAtomics,
                plannedUnlockTimestamp: lock.plannedUnlockTimestamp,
                slashed: lock.slashed,
                plannedSlashingAmountInAtomics: lock.plannedUnlockAmountInAtomics,
                plannedSlashingTimestamp: lock.plannedUnlockTimestamp,
            }
        });
    }
    for (const lock of account.vestingLocks) {
        locks.push({
            type: LockType.Vesting,
            lockedAmountInAtomics: lock.amount,
            parameters: {
                initialVestedAmountInAtomics: lock.initialVestedAmountInAtomics,
                cliffStartTimestamp: lock.cliffStartTimestamp,
                cliffDurationDays: lock.cliffDurationDays,
                vestingDurationDays: lock.vestingDurationDays,
            }
        });
    }
    return new BalanceAvailability(account.balance, locks);
}


export function useAccountBreakdownQuery(walletId: MaybeRefOrGetter<number>) {
    const accountStateQuery = useAccountStateQuery(walletId);
    const enabled = computed(() => !!accountStateQuery.data.value);
    return useQuery({
        enabled,
        refetchIntervalInBackground: true,
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        queryKey: computed(() => ['account-breakdown', toValue(walletId), accountStateQuery.data.value]),
        queryFn: async () => {
            const acc = accountStateQuery.data.value;
            if (!acc) throw new Error('Account state is undefined');
            const breakdown = getBalanceAvailability(acc);
            return {
                getSpendable: () => {
                    return breakdown.getSpendable().toString(
                        TokenUnit.TOKEN,
                        { locale: "system", grouping: true, decimalPlaces: 2 }
                    )
                },
                getStaked:    () => {
                    return breakdown.getStaked().toString(
                        TokenUnit.TOKEN,
                        { locale: "system", grouping: true, decimalPlaces: 2 }
                    )
                },
                getVested:    () => {
                    return breakdown.getVested().toString(
                        TokenUnit.TOKEN,
                        { locale: "system", grouping: true, decimalPlaces: 2 }
                    )
                },
                getEscrowed: () => {
                    return breakdown.getEscrowed().toString(
                        TokenUnit.TOKEN,
                        { locale: "system", grouping: true, decimalPlaces: 2 }
                    )
                },
            };
        },
    });
}

export function useHasAccountOnChainQuery(walletId: MaybeRefOrGetter<number>) {
    const accountIdQuery = useAccountIdQuery(walletId);
    return computed(() => accountIdQuery.isSuccess.value && accountIdQuery.data.value !== undefined);
}
