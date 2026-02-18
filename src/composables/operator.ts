import {useMutation, useQuery} from "@tanstack/vue-query";
import {useStorageStore} from "../stores/storage.ts";
import {storeToRefs} from "pinia";
import {computed} from "vue";
import axios from "axios";
import {useOperatorAuthStore} from "../components/operator/operatorAuthStore.ts";


export function useOperatorEndpoint(operatorId: number) {
	const store = useStorageStore();
	const {operators} = storeToRefs(store);
	const foundOperator = computed(() => operators.value.find(op => {
		return op.id === operatorId;
	}));
	const endpoint = computed(() => {
		if (foundOperator.value) {
			return `${foundOperator.value.httpEndpoint}/admin/api/v1`;
		}
		return undefined;
	});
	return endpoint;
}

export function useIsOperatorInitialized(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	return useQuery({
		enabled: computed(() => !!endpoint.value),
		queryKey: ['operatorIsInit'],
		queryFn: async () => {
			console.log(`Fetching operator initialization status at ${endpoint.value}`)
			const response = await axios<{ isInitialized: boolean }>(`${endpoint.value}/setup/status`);
			return response.data.isInitialized;
		},
		throwOnError: true,
		refetchOnReconnect: true,
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		retry: 1
	})
}


export function useSetupOperatorMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const {refetch} = useIsOperatorInitialized(operatorId);
	return useMutation({
		mutationFn: (newUser: {publicKey: string, pseudo: string}) => {
			return axios.post(`${endpoint.value}/setup`, newUser)
		},
		onSuccess: () => refetch()
	})
}




export type OperatorChallenge = {
	challenge: string,
	mac: string,
	expiresAt: string
}

export type OperatorChallengeResponse = OperatorChallenge & {
	signature: string,
	publicKey: string,
}
export function useGetChallenge(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	return useQuery({
		enabled: computed(() => !!endpoint.value),
		queryKey: ['operator', operatorId, 'challenge'],
		queryFn: async () => {
			console.log(`Getting challenge status at ${endpoint.value}`)
			const response = await axios.post<OperatorChallenge>(`${endpoint.value}/login/wallet/challenge`);
			return response.data;
		},
		throwOnError: true,
		refetchInterval: 30000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry: 1
	})
}

export function useLoginMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	return useMutation({
		mutationFn: async (challengeResponse: OperatorChallengeResponse) => {
			const response = await axios.post<{ token: string }>(`${endpoint.value}/login/wallet/verify`, challengeResponse)
			return response.data;
		},
	})
}



export interface OperatorUser {
	publicKey: string,
	pseudo: string
}
export function useGetAllUsers(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId)
	return useQuery({
		enabled: computed(() => !!endpoint.value && !!token),
		queryKey: ['operator', operatorId, 'users'],
		queryFn: async () => {
			console.log(`Getting all users at ${endpoint.value}`)
			const response = await axios.get<Array<OperatorChallenge>>(`${endpoint.value}/user`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
		refetchInterval: 10000
	})
}

export function useCreateUserMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (newUser: { publicKey: string, pseudo: string }) => {
			const response = await axios.post<OperatorUser>(`${endpoint.value}/user`, newUser, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

export function useDeleteUserMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (publicKey: string) => {
			const response = await axios.delete(`${endpoint.value}/user/${encodeURIComponent(publicKey)}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

export interface OperatorWallet {
	rpcEndpoint: string,
	name: string,
	seed: string
}

export function useGetAllWallets(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId)
	return useQuery({
		enabled: computed(() => !!endpoint.value && !!token),
		queryKey: ['operator', operatorId, 'wallets'],
		queryFn: async () => {
			console.log(`Getting all wallets at ${endpoint.value}`)
			const response = await axios.get<Array<OperatorWallet>>(`${endpoint.value}/wallet`,{
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
		refetchInterval: 10000
	})
}

export function useCreateWalletMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (newWallet: { rpcEndpoint: string, name: string, seed: string }) => {
			const response = await axios.post<OperatorWallet>(`${endpoint.value}/wallet`, newWallet, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

export function useDeleteWalletMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (rpcEndpoint: string) => {
			const response = await axios.delete(`${endpoint.value}/wallet/${encodeURIComponent(rpcEndpoint)}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

export interface OperatorApplication {
	vbId: string,
	walletRpcEndpoint: string
}

export function useGetAllApplications(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId)
	return useQuery({
		enabled: computed(() => !!endpoint.value && !!token),
		queryKey: ['operator', operatorId, 'applications'],
		queryFn: async () => {
			console.log(`Getting all applications at ${endpoint.value}`)
			const response = await axios.get<Array<OperatorApplication>>(`${endpoint.value}/application`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
		refetchInterval: 10000
	})
}

export function useCreateApplicationMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (newApplication: { vbId: string, walletRpcEndpoint: string }) => {
			const response = await axios.post<OperatorApplication>(`${endpoint.value}/application`, newApplication, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

export function useDeleteApplicationMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (vbId: string) => {
			const response = await axios.delete(`${endpoint.value}/application/${encodeURIComponent(vbId)}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

export interface OperatorApiKey {
	id: number,
	name: string,
	apiKey: string,
	applicationVbId: string,
	createdAt: string,
	activeUntil: string | null,
	isActive: boolean
}

export function useGetAllApiKeys(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId)
	return useQuery({
		enabled: computed(() => !!endpoint.value && !!token),
		queryKey: ['operator', operatorId, 'apiKeys'],
		queryFn: async () => {
			console.log(`Getting all API keys at ${endpoint.value}`)
			const response = await axios.get<Array<OperatorApiKey>>(`${endpoint.value}/apiKey`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
		refetchInterval: 10000
	})
}

export function useCreateApiKeyMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (newApiKey: { name: string, applicationVbId: string, activeUntil: string | null }) => {
			const response = await axios.post<OperatorApiKey>(`${endpoint.value}/apiKey`, newApiKey, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

export function useToggleApiKeyMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (params: { id: number, isActive: boolean }) => {
			const response = await axios.patch(`${endpoint.value}/apiKey/${params.id}/toggle`,
				{ isActive: params.isActive },
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);
			return response.data;
		},
	})
}

export function useDeleteApiKeyMutation(operatorId: number) {
	const endpoint = useOperatorEndpoint(operatorId);
	const authStore = useOperatorAuthStore();
	const token = authStore.getValidToken(operatorId);
	return useMutation({
		mutationFn: async (id: number) => {
			const response = await axios.delete(`${endpoint.value}/apiKey/${id}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			return response.data;
		},
	})
}

/*

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


 */