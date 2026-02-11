import {useQuery} from "@tanstack/vue-query";
import {useWalletStore} from "../stores/walletStore.ts";
import {BalanceAvailability} from "@cmts-dev/carmentis-sdk/client";
import {computed} from "vue";

export function useAccountIdQuery(walletId: number) {
	const store = useWalletStore();
	return useQuery({
		queryKey: ['account-id', walletId],
		queryFn: async () => {
			console.log("Fetching account ID for walletId: ", walletId, " ...")
			return await store.getAccountId(walletId);
		},
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
	})
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