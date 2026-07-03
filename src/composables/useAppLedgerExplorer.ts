import { computed, onMounted, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { computedAsync, useAsyncState } from '@vueuse/core';
import {
    AccountCrypto,
    ApplicationLedgerVb,
    Hash,
    ProviderFactory,
    SeedEncoder,
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
import type { ApplicationParticipation } from '../stores/storage.ts';
import * as walletRepo from '../db/repositories/walletRepository';
import * as participationRepo from '../db/repositories/participationRepository';
import { useSessionStore } from '../stores/sessionStore.ts';

export interface AppDescription {
    name: string;
    logoUrl: string;
    homepageUrl: string;
    description: string;
}

/**
 * Encapsulates the data loading and selection state for the App Ledger explorer:
 * the wallet/participation entities, the application description, the lazily
 * loaded selected ledger virtual blockchain, and the ledger list helpers.
 */
export function useAppLedgerExplorer(
    walletId: MaybeRefOrGetter<number>,
    appParticipationId: MaybeRefOrGetter<string>,
) {
    const router = useRouter();
    const confirm = useConfirm();
    const sessionStore = useSessionStore();

    const { state: wallet } = useAsyncState(
        () => walletRepo.getWalletById(toValue(walletId)),
        null,
        { immediate: true },
    );

    const { state: participation, execute: fetchParticipation } = useAsyncState(
        async () => {
            const all = await participationRepo.getAppParticipationsByWalletId(toValue(walletId));
            return all.find((p) => p.id === toValue(appParticipationId)) ?? null;
        },
        null as ApplicationParticipation | null,
        { immediate: true },
    );

    const accountCrypto = computedAsync<AccountCrypto | null>(async () => {
        if (!wallet.value) return null;
        const rawSeed = await sessionStore.getWalletSeed(wallet.value.id);
        return WalletCrypto.fromSeed(new SeedEncoder().decode(rawSeed)).getDefaultAccountCrypto();
    }, null);

    // app description — single load, non-blocking
    const appDescription = ref<AppDescription | null>(null);
    const isLoadingDescription = ref(true);

    // selected ledger + lazy-loaded VB
    const selectedIdx = ref<number | null>(null);
    const selectedVb = shallowRef<ApplicationLedgerVb | null>(null);
    const isLoadingVb = ref(false);
    const vbError = ref<string | null>(null);
    const activeTab = ref('overview');

    const firstAndLastMicroblockAnchoringDate = computedAsync(async () => {
        if (selectedVb.value) {
            const vb = selectedVb.value;
            const [firstMb, lastMb] = await Promise.all([vb.getFirstMicroBlock(), vb.getLastMicroblock()]);
            return { firstAnchoringDate: firstMb.getTimestampAsDate(), lastAnchoringDate: lastMb.getTimestampAsDate() };
        } else {
            return null;
        }
    });

    async function selectLedger(idx: number) {
        if (selectedIdx.value === idx) return;
        selectedIdx.value = idx;
        selectedVb.value = null;
        vbError.value = null;
        activeTab.value = 'overview';

        const ledger = participation.value?.appLedgers[idx];
        if (!ledger || !wallet.value) return;

        isLoadingVb.value = true;
        try {
            const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
            selectedVb.value = await provider.loadApplicationLedgerVirtualBlockchain(Hash.fromHex(ledger.id));
        } catch (e) {
            vbError.value = e instanceof Error ? e.message : String(e);
        } finally {
            isLoadingVb.value = false;
        }
    }

    onMounted(async () => {
        if (!wallet.value || !participation.value) return;
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(
            wallet.value.nodeEndpoint
        );
        try {
            const appVb = await provider.loadApplicationVirtualBlockchain(
                Hash.fromHex(participation.value.id)
            );
            appDescription.value = (await appVb.getApplicationDescription()) as AppDescription;
        } catch (e) {
            console.warn('Could not load app description', e);
        } finally {
            isLoadingDescription.value = false;
        }

        // auto-select first if only one ledger
        if (participation.value.appLedgers.length === 1) {
            selectLedger(0);
        }
    });

    // Reversed ledger list (most recent first) with original index preserved
    const reversedLedgers = computed(() =>
        [...(participation.value?.appLedgers ?? [])]
            .map((ledger, originalIdx) => ({ ...ledger, originalIdx }))
            .reverse(),
    );

    // Row selection for DataTable
    const selectedRow = computed(() =>
        selectedIdx.value !== null
            ? reversedLedgers.value.find((r) => r.originalIdx === selectedIdx.value) ?? null
            : null,
    );

    // Currently selected ledger entity
    const selectedLedger = computed(() =>
        selectedIdx.value !== null ? participation.value?.appLedgers[selectedIdx.value] ?? null : null,
    );

    function confirmDeleteLedger(vbId: string) {
        confirm.require({
            message: 'Are you sure you want to remove this ledger record? This action cannot be undone.',
            header: 'Delete Ledger Record',
            icon: 'pi pi-exclamation-triangle',
            rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            acceptProps: { label: 'Delete', severity: 'danger', icon: 'pi pi-trash' },
            accept: async () => {
                await participationRepo.deleteAppLedger(toValue(walletId), toValue(appParticipationId), vbId);
                selectedIdx.value = null;
                selectedVb.value = null;
                await fetchParticipation();
                // navigate back if no ledgers remain
                if (!participation.value || participation.value.appLedgers.length === 0) {
                    router.push(`/wallet/${toValue(walletId)}`);
                }
            },
        });
    }

    return {
        wallet,
        participation,
        fetchParticipation,
        accountCrypto,
        appDescription,
        isLoadingDescription,
        selectedIdx,
        selectedVb,
        isLoadingVb,
        vbError,
        activeTab,
        firstAndLastMicroblockAnchoringDate,
        selectLedger,
        reversedLedgers,
        selectedRow,
        selectedLedger,
        confirmDeleteLedger,
    };
}
