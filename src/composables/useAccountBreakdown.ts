import {useQuery} from "@tanstack/vue-query";
import {useWalletStore} from "../stores/walletStore.ts";
import {BalanceAvailability, Utils} from "@cmts-dev/carmentis-sdk/client";
import {computed, ref} from "vue";

export function useAccountIdQuery(walletId: number) {
	const store = useWalletStore();
	return useQuery({
		queryKey: ['account-id', walletId],
		queryFn: async () => {
			console.log("Fetching account ID for walletId: ", walletId, " ...")
			return await store.getAccountId(walletId);
		},
		retry: 1
	})
}

export function useAccountStateQuery(walletId: number) {
	const store = useWalletStore();
	const accountIdQuery = useAccountIdQuery(walletId);
	const enabled = computed(() => !!accountIdQuery.data.value);
	return useQuery({
		enabled,
		queryKey: ['account-state', walletId, accountIdQuery.data.value],
		queryFn: async () => {
			console.log("Fetching account state for walletId")
			const accountId = accountIdQuery.data.value;
			if (accountId) {
				const state = await store.fetchAccountStateByAccountId(walletId, accountId);
				return state;
			} else {
				throw new Error('Account ID is undefined');
			}
		},
		staleTime: 60000,
		refetchOnReconnect: true,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})
}

export function useAccountTransactionsHistory(walletId: number) {
	const store = useWalletStore();
	const accountIdQuery = useAccountIdQuery(walletId);
	const accountStateQuery = useAccountStateQuery(walletId);

	const limit = ref(10);
	const lastAccountHistoryHash = computed({
		get: () => {
			if (accountStateQuery.data.value) {
				return accountStateQuery.data.value.lastHistoryHash;
			}
			console.log("Account state query data is undefined")
			return undefined;
		},
		set: (newValue: Uint8Array) => {
			lastAccountHistoryHash.value = newValue;
		}
	});


	const enabled = computed(() =>
		!!accountIdQuery.data.value &&
		lastAccountHistoryHash.value !== undefined
	);
	const accountHistoryQuery = useQuery({
		enabled,
		queryKey: ['account-transactions-history', walletId, accountIdQuery.data.value],
		queryFn: async () => {
			const accountId = accountIdQuery.data.value;
			const lastHistoryHash = lastAccountHistoryHash.value;
			console.log(`Fetching account transactions history for account id ${Utils.binaryToHexa(accountId)} at history hash ${Utils.binaryToHexa(lastHistoryHash)}`)
			if (accountId && lastHistoryHash !== undefined) {
				try {
					return await store.fetchAccountTransactionsHistory(
						walletId,
						accountId,
						lastHistoryHash,
						limit.value
					);
				} catch (e) {
					console.error(e)
					throw e;
				}
			} else {
				throw new Error('Account ID is undefined');
			}
		}
	})

	function setLastAccountHistoryHash(hash: Uint8Array) {
		lastAccountHistoryHash.value = hash;
	}

	function setLimit(newLimit: number) {
		limit.value = newLimit;
	}

	return { accountHistoryQuery, setLastAccountHistoryHash, setLimit, limit }
}

export function useAccountBreakdownQuery(walletId: number) {
	const accountStateQuery = useAccountStateQuery(walletId);
	const enabled = computed(() => !!accountStateQuery.data.value)
	return useQuery({
		enabled,
		queryKey: ['account-breakdown', walletId, accountStateQuery.data.value],
		queryFn: async () => {
			console.log("Fetching account breakdown for walletId")
			const accountState = accountStateQuery.data.value;
			if (accountState) {
				return BalanceAvailability.createFromAccountStateAbciResponse(accountState);
			} else {
				throw new Error('Account ID is undefined');
			}
		},
	})
}

export function useHasAccountOnChainQuery(walletId: number) {
	const accountIdQuery = useAccountIdQuery(walletId);
	return computed( () =>
		accountIdQuery.isSuccess.value &&
		accountIdQuery.data.value !== undefined
	);
}