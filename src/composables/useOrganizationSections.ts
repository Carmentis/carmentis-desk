import {computed, reactive, ref, type Ref} from "vue";
import {useQuery} from "@tanstack/vue-query";
import {useRoute} from "vue-router";
import {Hash, SectionType} from "@cmts-dev/carmentis-sdk-core";
import {useCurrentOrganization} from "./useCurrentOrganization.ts";
import {useCurrentWallet} from "./useCurrentWallet.ts";

export interface OrganizationSectionRow {
    height: number;
    hash: string;
    data: Record<string, unknown>;
}

/** Loading state shown to the user by the sections list. */
export interface SectionsSyncState {
    isFetching: boolean;
    isError: boolean;
    errorMessage: string;
    /** Timestamp (ms) of the last successful load, 0 when none. */
    updatedAt: number;
    /** Microblocks read so far during the current load. */
    scanned: number;
    /** Microblocks to read during the current load, 0 while unknown. */
    total: number;
    refresh: () => void;
}

/**
 * Reads the custom sections published on the current organization's virtual blockchain.
 * Exposes a progress counter so that the UI can tell the user the data is being loaded.
 */
export function useOrganizationSections(options: {
    queryKey: string;
    isOrganizationFoundOnChain: Ref<boolean | undefined>;
    /** Keeps only the custom sections matching the predicate. */
    accept?: (section: Record<string, unknown>) => boolean;
    refetchInterval?: number;
}) {
    const route = useRoute();
    const orgId = computed(() => Number(route.params.orgId));
    const {organization} = useCurrentOrganization();
    const {walletProvider} = useCurrentWallet();

    const scanned = ref(0);
    const total = ref(0);

    const query = useQuery({
        refetchInterval: options.refetchInterval,
        queryKey: [options.queryKey, orgId],
        // Wait for the provider instead of caching an empty result computed too early.
        enabled: computed(() =>
            options.isOrganizationFoundOnChain.value === true
            && !!organization.value?.organizationVbId
            && !!walletProvider.value
        ),
        queryFn: async (): Promise<OrganizationSectionRow[]> => {
            const orgVB = await walletProvider.value!.loadOrganizationVirtualBlockchain(
                Hash.from(organization.value!.organizationVbId!)
            );
            const height = orgVB.getHeight();
            scanned.value = 0;
            total.value = height;

            const rows: OrganizationSectionRow[] = [];
            for (let h = 1; h <= height; h++) {
                const mb = await orgVB.getMicroblock(h);
                for (const sec of mb.getSectionsByType(SectionType.CUSTOM)) {
                    const {type: _type, ...data} = sec as Record<string, unknown>;
                    if (options.accept && !options.accept(sec as Record<string, unknown>)) continue;
                    rows.push({height: h, hash: mb.getHash().encode(), data});
                }
                scanned.value = h;
            }
            return rows;
        },
    });

    // No data yet and nothing failed: either waiting for dependencies or reading.
    const isLoading = computed(() =>
        options.isOrganizationFoundOnChain.value === true && query.isPending.value && !query.isError.value
    );

    const sync: SectionsSyncState = reactive({
        isFetching: query.isFetching,
        isError: query.isError,
        errorMessage: computed(() => query.error.value?.message ?? 'Unknown error'),
        updatedAt: query.dataUpdatedAt,
        scanned,
        total,
        refresh: () => { void query.refetch(); },
    });

    return {rows: query.data, isLoading, sync, refetch: query.refetch};
}
