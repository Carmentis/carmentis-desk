import { computed } from 'vue';
import { useCurrentWallet } from './useCurrentWallet.ts';
import { isUnknownAccountError } from '../utils/accountErrors.ts';

/**
 * - `loading`: the blockchain is still being searched.
 * - `no-account`: the wallet has no account yet (the node answers with an "unknown account" error).
 * - `error`: a real failure, such as an unreachable node or indexer.
 * - `ready`: the balance is available.
 */
export type AccountStatus = 'loading' | 'no-account' | 'error' | 'ready';

/**
 * The state of the account of the current wallet, from the queries of the wallet store.
 * A wallet that has no account makes those queries fail: that is not an error for the user.
 */
export function useAccountStatus() {
    const { useAccountIdQuery, useAccountStateQuery, useAccountBreakdownQuery } = useCurrentWallet();
    const accountIdQuery = useAccountIdQuery();
    const accountStateQuery = useAccountStateQuery();
    const breakdownQuery = useAccountBreakdownQuery();

    const error = computed<Error | null>(
        () => accountIdQuery.error.value ?? accountStateQuery.error.value ?? breakdownQuery.error.value ?? null,
    );

    const status = computed<AccountStatus>(() => {
        // good data wins: a failing poll must not replace a balance that is on screen
        if (breakdownQuery.data.value) return 'ready';
        if (error.value) return isUnknownAccountError(error.value) ? 'no-account' : 'error';
        return 'loading';
    });

    function retry() {
        accountIdQuery.refetch();
        accountStateQuery.refetch();
        breakdownQuery.refetch();
    }

    return { status, error, retry, accountIdQuery, breakdownQuery };
}
