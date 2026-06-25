import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { computedAsync, useAsyncState } from '@vueuse/core';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import {
    CMTSToken,
    EncoderFactory,
    Hash,
    LockType,
    ProviderFactory,
    Utils,
} from '@cmts-dev/carmentis-sdk-core';
import * as walletRepo from '../db/repositories/walletRepository';
import * as orgRepo from '../db/repositories/organizationRepository';
import * as nodeRepo from '../db/repositories/nodeRepository';
import {createIndexerClient} from "../api/indexer/client.ts";
import {useQuery} from "@tanstack/vue-query";

/**
 * Encapsulates the on-chain derived state of a node (publication, ownership,
 * validator status and staking information). The expensive RPC/provider calls
 * run once per call site, so this composable is intended to be used once in the
 * Node page and its derived values passed down to the presentation components.
 */
export function useNode(
    walletId: MaybeRefOrGetter<number>,
    orgId: MaybeRefOrGetter<number>,
    nodeId: MaybeRefOrGetter<number>,
) {
    const { data: wallet } = useQuery({
        queryKey: ['wallet', walletId],
        queryFn: () => walletRepo.getWalletById(toValue(walletId)),
    })

    const { data: organization } = useQuery({
        queryKey: ['organization', orgId],
        queryFn: () => orgRepo.getOrganizationById(toValue(orgId)),
    })

    const { data: locallyStoredNode } = useQuery({
        queryKey: ['node', nodeId],
        queryFn: () => nodeRepo.getNodeById(toValue(nodeId)),
    })

    const indexer = computedAsync(async () => {
        if (!wallet.value) return undefined;
        return createIndexerClient(wallet.value.indexer)
    });

    // node chain status (the chain on which the node is running)
    const chainNameOnWhichNodeIsConnected = computedAsync(async () => {
        if (!locallyStoredNode.value) {
            return undefined;
        }
        const endpoint = locallyStoredNode.value.rpcEndpoint;
        const client = await Tendermint37Client.connect(endpoint);
        const status = await client.status();
        return status.nodeInfo.network;
    });

    // Node publication status
    const {data: nodePublicKey} = useQuery({
        queryKey: ['node-public-key', locallyStoredNode],
        refetchInterval: 10000,
        queryFn: async () =>  {
            if (!locallyStoredNode.value) {
                return null;
            }
            const endpoint = locallyStoredNode.value.rpcEndpoint;
            const client = await Tendermint37Client.connect(endpoint);
            const status = await client.status();
            const pk = status.validatorInfo.pubkey;
            if (!pk) {
                console.warn("Public key not found on node")
                return null;
            }
            const { data, algorithm } = pk;
            const base64 = EncoderFactory.bytesToBase64Encoder();
            return { pk: base64.encode(data), pkType: algorithm };
        }
    });

    const { data: nodeVbId } = useQuery({
        queryKey: ['node-vbid', locallyStoredNode],
        queryFn: () => {
            if (!locallyStoredNode.value) return null;
            return locallyStoredNode.value.vbId;
        },
    })

    const isNodePublished = computed(() => {
        return nodeVbId.value !== undefined;
    });

    const {data: validatorNode} = useQuery({
        enabled: computed(() => !!nodeVbId.value),
        queryKey: ['node', nodeVbId],
        queryFn: async () => {
            if (!nodeVbId.value || !indexer.value) {
                console.warn("Cannot fetch validator node: node vb id or indexer undefined")
                return null
            };
            const validatorNodesResponse = await indexer.value.getValidatorNodes({ vb_id: nodeVbId.value });
            const validatorNodes = validatorNodesResponse.items;
            if (validatorNodes.length === 0) return null;
            return validatorNodes[0];
        }
    })

    const {data: nodeOwnerOrganizationId} = useQuery({
        enabled: computed(() => !!locallyStoredNode.value),
        queryKey: ['node-owner-organization-id', nodeVbId],
        queryFn: async () => {

            if (!locallyStoredNode.value || !locallyStoredNode.value.vbId || !indexer.value) {
                console.warn(`Cannot fetch node owner organization id: node vb id or indexer undefined: ${locallyStoredNode.value}`)
                return null;
            };

            const nodeVbId = locallyStoredNode.value.vbId;
            const validatorNodesResponse = await indexer.value.getValidatorNodes({ vb_id: nodeVbId });
            const validatorNodes = validatorNodesResponse.items;
            if (validatorNodes.length === 0) {
                console.warn(`Cannot fetch node owner organization id: no validator nodes found for node vb id: ${nodeVbId}`)
                return null;
            };
            return validatorNodes[0].organizationId;
        }
    })

    const {data: nodeOwnerOrganization} = useQuery({
        queryKey: ['node-owner-organization', nodeVbId],
        queryFn: async () => {
            if (!nodeOwnerOrganizationId.value || !indexer.value) return null;
            const organizationId = nodeOwnerOrganizationId.value;
            const organization = await indexer.value.getOrganizations({ vb_id: organizationId });
            return organization.items[0];
        }
    })

    // Check if node is claimed and by whom
    const nodeOwnerAccountId = computedAsync(async () => {
        if (!nodeOwnerOrganization.value) return undefined;
        const accountId = nodeOwnerOrganization.value.accountId;
        return accountId;
    });


    const { data: nodeOwnerAccount } = useQuery({
        queryKey: ['nodeOwnerAccount', nodeOwnerAccountId],
        queryFn: async () => {
            if (!nodeOwnerAccountId.value || !indexer.value) {
                console.warn("Cannot fetch node owner account: node owner account id or indexer undefined")
                return null
            };
            const accounts =  await indexer.value.getAccounts({ id: nodeOwnerAccountId.value });
            return accounts.items.length === 1 ? accounts.items[0] : null;
        }
    })

    const nodeOwnerName = computed(() => {
        if (!nodeOwnerOrganization.value) return undefined;
        return nodeOwnerOrganization.value.name;
    });

    const isNodeValidator = computed(() => {
        if (!validatorNode.value) return undefined;
        return validatorNode.value.currentVotingPower !== 0;
    });

    const isNodeClaimed = computed(() => {
        return nodeOwnerAccountId.value !== undefined;
    });

    // Check if the wallet owns this node
    const walletOrgId = computed( () => {
        if (!organization.value?.vbId) return undefined;
        return organization.value.vbId;
    });

    const isOwnedByWallet = computed( () => {
        if (!nodeOwnerOrganizationId.value || !walletOrgId.value) return undefined;
        return nodeOwnerOrganizationId.value === walletOrgId.value;
    });

    // staking information
    const nodeStakeInformation = computed( () => {
        if (!nodeOwnerAccount.value || !nodeVbId.value) return [];
        const stakingLocks = nodeOwnerAccount.value.stakingLocks;
        const stakingLocksForThisNode = stakingLocks.filter(
            (lock) => lock.validatorNodeId === nodeVbId.value
        );
        return stakingLocksForThisNode
    });

    const hasNodeStakeInformation = computed(() => nodeStakeInformation.value.length > 0);

    const currentStakedAmount = computed(() => {
        if (!hasNodeStakeInformation.value) return undefined;
        const sumOfStaked = nodeStakeInformation.value.reduce((acc, l) => acc + l.amount, 0)
        return CMTSToken.createAtomic(sumOfStaked);
    });

    const unstakingAmountInProgress = computed(() => {
        if (!hasNodeStakeInformation.value) return undefined;
        if (nodeStakeInformation.value.length === 0) return undefined;
        const { plannedUnlockAmountInAtomics } = nodeStakeInformation.value[0];
        if (plannedUnlockAmountInAtomics === undefined) return undefined;
        return CMTSToken.createAtomic(plannedUnlockAmountInAtomics);
    });

    const hasUnstakingOperationInProgress = computed(
        () =>
            unstakingAmountInProgress.value !== undefined &&
            unstakingAmountInProgress.value.isPositive() &&
            !unstakingAmountInProgress.value.isZero(),
    );

    const unstakingAtTimestamp = computed(() => {
        if (!nodeStakeInformation.value) return undefined;
        if (nodeStakeInformation.value.length === 0) return undefined;
        const { plannedUnlockTimestamp } = nodeStakeInformation.value[0];
        if (!plannedUnlockTimestamp) return undefined;
        return plannedUnlockTimestamp;
    });

    return {
        wallet,
        organization,
        node: locallyStoredNode,
        chainNameOnWhichNodeIsConnected,
        nodePublicKey,
        nodeVbId,
        isNodePublished,
        nodeOwnerAccountId,
        nodeOwnerName,
        isNodeValidator,
        isNodeClaimed,
        walletOrgId,
        isOwnedByWallet,
        nodeStakeInformation,
        currentStakedAmount,
        unstakingAmountInProgress,
        hasUnstakingOperationInProgress,
        unstakingAtTimestamp,
        hasNodeStakeInformation,
    };
}
