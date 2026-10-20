import { computed, type Ref } from 'vue';
import { isUnknownAccountError } from '../utils/accountErrors.ts';

/**
 * Whether the search of the account of the wallet has really answered.
 *
 * That search can succeed with `null` while the wallet provider is not ready yet: this is not an answer.
 * It has answered with an ID, or with the "unknown account" error of a wallet that has no account yet.
 */
export function useAccountResolved(accountIdQuery: { data: Ref<unknown>; error: Ref<unknown> }) {
    return computed(() => !!accountIdQuery.data.value || isUnknownAccountError(accountIdQuery.error.value));
}
