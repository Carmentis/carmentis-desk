import { watch } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import * as orgRepo from '../db/repositories/organizationRepository';
import * as nodeRepo from '../db/repositories/nodeRepository';
import * as appRepo from '../db/repositories/applicationRepository';
import {useAppStore} from "../stores/appStore.ts";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {useStrongholdStore} from "../stores/strongholdStore.ts";



/**
 * Loads org/node/app children for every wallet — used by the navbar to
 * build the full navigation tree. Re-runs whenever the wallet list changes.
 */
export function useNavbarData() {
    const { wallets } = useAppStore();


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
        [],
        { immediate: true },
    );

    watch(wallets, () => execute());

    return { navTree, wallets };
}



/**
 * Builds the full hydrated WalletEntity[] structure for data export.
 */
export async function buildExportData() {
    // extract all entities from the database
    const wallets = await DeskDatabase.getAllWallets();
    const organizations = await DeskDatabase.getAllOrganizations();
    const nodes = await DeskDatabase.getAllNodes();
    const applications = await DeskDatabase.getAllApplications();

    // TODO: ask password to encrypt the keys


    // extract all keys from stronghold
    const strongholdStore = useStrongholdStore();
    const keys = []
    for (const wallet of wallets) {
        const privateKey = await strongholdStore.getWalletPrivateKeyFromStronghold(wallet.privateKeyStrongholdId);
        const actorPassphrase = await strongholdStore.getMnemonicFromStronghold(wallet.actorKeysMnemonicStrongholdId);
        keys.push({
            walletId: wallet.id,
            privateKey,
            actorPassphrase,
        });
    }

    return {
        wallets,
        organizations,
        nodes,
        applications,
        keys,
    }
}
