import {defineStore} from "pinia";
import {useSessionStorage} from "@vueuse/core";


export interface AuthenticatedOperator {
	operatorId: number,
	credentials: {
		walletId: number,
		authToken: string
	}[]
}

export interface OperatorAuthStore {
	authenticatedOperators: AuthenticatedOperator[]
}

export const useOperatorAuthStore = defineStore('operatorAuth', () => {
	const authStore = useSessionStorage<OperatorAuthStore>("operator-auth", {
		authenticatedOperators: []
	});

	function isAuthenticatedToOperator(operatorId: number) {
		return authStore.value.authenticatedOperators.some(op => op.operatorId === operatorId);
	}
	function addCredential(operatorId: number, walletId: number, authToken: string) {
		const authenticatedOperators = authStore.value.authenticatedOperators;
		const credential = { walletId, authToken };
		const operator = authenticatedOperators.find(op => op.operatorId === operatorId);
		if (operator) {
			operator.credentials.push(credential);
		} else {
			authStore.value.authenticatedOperators.push({operatorId, credentials: [credential]});
		}
	}

	function disconnectFromOperator(operatorId: number) {
		authStore.value.authenticatedOperators = authStore.value.authenticatedOperators.filter(op => op.operatorId !== operatorId);
	}

	function getValidToken(operatorId: number) {
		const operator = authStore.value.authenticatedOperators.find(op => op.operatorId === operatorId);
		if (!operator) {
			return undefined;
		}
		const credential = operator.credentials.find(cred => cred.walletId === operator.credentials[0].walletId);
		if (!credential) {
			return undefined;
		}
		return credential.authToken;
	}

	return { authStore, addCredential, isAuthenticatedToOperator, disconnectFromOperator, getValidToken };
});




