import { watch } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useStorageStore } from '../stores/storage';
import * as orgRepo from '../db/repositories/organizationRepository';
import * as nodeRepo from '../db/repositories/nodeRepository';
import * as appRepo from '../db/repositories/applicationRepository';
import * as walletRepo from '../db/repositories/walletRepository';
import * as credentialRepo from '../db/repositories/credentialRepository';
import * as participationRepo from '../db/repositories/participationRepository';
import type { WalletEntity } from '../stores/storage';
import { useSessionStore } from '../stores/sessionStore';

/**
 * Loads org/node/app children for every wallet — used by the navbar to
 * build the full navigation tree. Re-runs whenever the wallet list changes.
 */
export function useNavbarData() {
    const store = useStorageStore();
    const { wallets, operators } = storeToRefs(store);

    const { state: navTree, execute } = useAsyncState(
        async () => {
            return Promise.all(
                wallets.value.map(async (w) => {
                    const orgs = await orgRepo.getOrganizationsByWalletId(w.id);
                    const orgsWithChildren = await Promise.all(
                        orgs.map(async (org) => {
                            const [nodes, apps] = await Promise.all([
                                nodeRepo.getNodesByOrgId(org.id),
                                appRepo.getApplicationsByOrgId(org.id),
                            ]);
                            return {
                                id: org.id,
                                name: org.name,
                                vbId: org.vbId,
                                countryCode: org.countryCode,
                                city: org.city,
                                website: org.website,
                                nodes: nodes.map((n) => ({
                                    id: n.id,
                                    name: n.name,
                                    vbId: n.vbId,
                                    rpcEndpoint: n.rpcEndpoint,
                                })),
                                applications: apps.map((a) => ({
                                    id: a.id,
                                    name: a.name,
                                    vbId: a.vbId,
                                    description: a.description,
                                    website: a.website,
                                })),
                            };
                        }),
                    );
                    return { ...w, organizations: orgsWithChildren, participations: [], credentials: [] };
                }),
            );
        },
        [] as WalletEntity[],
        { immediate: true },
    );

    watch(wallets, () => execute());

    return { navTree, wallets, operators };
}

/**
 * Builds the full hydrated WalletEntity[] structure for data export.
 */
export async function buildExportData() {
    const wallets = await walletRepo.getAllWallets();
    const organizations: WalletEntity[] = await Promise.all(
        wallets.map(async (w) => {
            const orgs = await orgRepo.getOrganizationsByWalletId(w.id);
            const orgsWithChildren = await Promise.all(
                orgs.map(async (org) => {
                    const [nodes, apps] = await Promise.all([
                        nodeRepo.getNodesByOrgId(org.id),
                        appRepo.getApplicationsByOrgId(org.id),
                    ]);
                    return {
                        id: org.id,
                        name: org.name,
                        vbId: org.vbId,
                        countryCode: org.countryCode,
                        city: org.city,
                        website: org.website,
                        nodes: nodes.map((n) => ({
                            id: n.id,
                            name: n.name,
                            vbId: n.vbId,
                            rpcEndpoint: n.rpcEndpoint,
                        })),
                        applications: apps.map((a) => ({
                            id: a.id,
                            name: a.name,
                            vbId: a.vbId,
                            description: a.description,
                            website: a.website,
                        })),
                    };
                }),
            );
            const session = useSessionStore();
            const [participations, credentials, seed] = await Promise.all([
                participationRepo.getAppParticipationsByWalletId(w.id),
                credentialRepo.getCredentialsByWalletId(w.id),
                session.getWalletSeed(w.id),
            ]);
            return {
                ...w,
                seed,
                organizations: orgsWithChildren,
                participations,
                credentials,
            };
        }),
    );
    return organizations;
}
