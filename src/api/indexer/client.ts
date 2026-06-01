import {
    getAppControllerGetAccountHistoryUrl,
    getAppControllerGetAccountsUrl,
    getAppControllerGetValidatorNodesUrl,
} from './indexer';
import type {
    AccountHistoryListResponseDto,
    AccountListResponseDto,
    AppControllerGetAccountHistoryParams,
    AppControllerGetAccountsParams,
    AppControllerGetValidatorNodesParams,
    ValidatorNodeListResponseDto,
} from './model';

export function createIndexerClient(baseUrl: string) {
    async function get<T>(relativeUrl: string): Promise<T> {
        const res = await fetch(`${baseUrl}${relativeUrl}`);
        if (!res.ok) throw new Error(`Indexer error ${res.status}`);
        return res.json() as Promise<T>;
    }
    return {
        getAccounts: (p?: AppControllerGetAccountsParams) =>
            get<AccountListResponseDto>(getAppControllerGetAccountsUrl(p)),
        getAccountHistory: (p?: AppControllerGetAccountHistoryParams) =>
            get<AccountHistoryListResponseDto>(getAppControllerGetAccountHistoryUrl(p)),
        getValidatorNodes: (p?: AppControllerGetValidatorNodesParams) =>
            get<ValidatorNodeListResponseDto>(getAppControllerGetValidatorNodesUrl(p)),
    };
}
