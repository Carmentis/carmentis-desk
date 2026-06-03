import {
    getAppControllerGetAccountHistoryUrl,
    getAppControllerGetAccountsUrl, getAppControllerGetApplicationsUrl, getAppControllerGetOrganizationsUrl,
    getAppControllerGetValidatorNodesUrl,
} from './indexer';
import type {
    AccountHistoryListResponseDto,
    AccountListResponseDto,
    AppControllerGetAccountHistoryParams,
    AppControllerGetAccountsParams, AppControllerGetApplicationsParams, AppControllerGetOrganizationsParams,
    AppControllerGetValidatorNodesParams, ApplicationListResponseDto, OrganizationListResponseDto,
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
        getOrganizations: (p?: AppControllerGetOrganizationsParams) =>
            get<OrganizationListResponseDto>(getAppControllerGetOrganizationsUrl(p)),
        getApplications: (p?: AppControllerGetApplicationsParams) =>
            get<ApplicationListResponseDto>(getAppControllerGetApplicationsUrl(p)),
        getAccountHistory: (p?: AppControllerGetAccountHistoryParams) =>
            get<AccountHistoryListResponseDto>(getAppControllerGetAccountHistoryUrl(p)),
        getValidatorNodes: (p?: AppControllerGetValidatorNodesParams) =>
            get<ValidatorNodeListResponseDto>(getAppControllerGetValidatorNodesUrl(p)),
    };
}
