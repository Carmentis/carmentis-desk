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
    const { state: wallet } = useAsyncState(
        () => walletRepo.getWalletById(toValue(walletId)),
        null,
        { immediate: true },
    );

    const { state: organization } = useAsyncState(
        () => orgRepo.getOrganizationById(toValue(orgId)),
        null,
        { immediate: true },
    );

    const { state: locallyStoredNode } = useAsyncState(
        () => nodeRepo.getNodeById(toValue(nodeId)),
        null,
        { immediate: true },
    );

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
    const nodePublicKey = computedAsync(async () => {
        if (!locallyStoredNode.value) {
            return undefined;
        }
        const endpoint = locallyStoredNode.value.rpcEndpoint;
        const client = await Tendermint37Client.connect(endpoint);
        const status = await client.status();
        const pk = status.validatorInfo.pubkey;
        if (!pk) return undefined;
        const { data, algorithm } = pk;
        const base64 = EncoderFactory.bytesToBase64Encoder();
        return { pk: base64.encode(data), pkType: algorithm };
    });

    const nodeVbId = computedAsync(async () => {
        if (!locallyStoredNode.value || !locallyStoredNode.value.vbId) return undefined;
        console.log(`Node id: ${locallyStoredNode.value.vbId}`)
        return locallyStoredNode.value.vbId;
    });

    const isNodePublished = computed(() => {
        return nodeVbId.value !== undefined;
    });

    const validatorNode = computedAsync(async () => {
        if (!nodeVbId.value || !indexer.value) return undefined;
        const validatorNodesResponse = await indexer.value.getValidatorNodes({ vb_id: nodeVbId.value });
        const validatorNodes = validatorNodesResponse.items;
        if (validatorNodes.length === 0) return undefined;
        return validatorNodes[0];
    })

    const nodeOwnerOrganizationId = computedAsync(async () => {
        if (!locallyStoredNode.value || !locallyStoredNode.value.vbId || !indexer.value) return undefined;
        const nodeVbId = locallyStoredNode.value.vbId;
        const validatorNodesResponse = await indexer.value.getValidatorNodes({ vb_id: nodeVbId });
        const validatorNodes = validatorNodesResponse.items;
        if (validatorNodes.length === 0) return undefined;
        return validatorNodes[0].organizationId;
    })

    const nodeOwnerOrganization = computedAsync(async () => {
        if (!nodeOwnerOrganizationId.value || !indexer.value) return undefined;
        const organizationId = nodeOwnerOrganizationId.value;
        const organization = await indexer.value.getOrganizations({ vb_id: organizationId });
        return organization.items[0];
    })

    // Check if node is claimed and by whom
    const nodeOwnerAccountId = computedAsync(async () => {
        if (!nodeOwnerOrganization.value) return undefined;
        const accountId = nodeOwnerOrganization.value.accountId;
        return accountId;
    });


    const nodeOwnerAccount = computedAsync(async () => {
        if (!nodeOwnerAccountId.value || !indexer.value) return undefined;
        const accounts =  await indexer.value.getAccounts({ id: nodeOwnerAccountId.value });
        return accounts.items.length === 1 ? accounts.items[0] : undefined;
    });

    const nodeOwnerName = computedAsync(async () => {
        if (!nodeOwnerOrganization.value) return undefined;
        return nodeOwnerOrganization.value.name;
    });

    const isNodeValidator = computedAsync(async () => {
        if (!validatorNode.value) return undefined;
        return validatorNode.value.currentVotingPower !== 0;
    });

    const isNodeClaimed = computed(() => {
        return nodeOwnerAccountId.value !== undefined;
    });

    // Check if the wallet owns this node
    const walletOrgId = computedAsync(async () => {
        if (!organization.value?.vbId) return undefined;
        return organization.value.vbId;
    });

    const isOwnedByWallet = computedAsync(async () => {
        if (!nodeOwnerOrganizationId.value || !walletOrgId.value) return undefined;
        return nodeOwnerOrganizationId.value === walletOrgId.value;
    });

    // staking information
    const nodeStakeInformation = computedAsync(async () => {
        if (!nodeOwnerAccount.value || !nodeVbId.value) return undefined;
        const stakingLocks = nodeOwnerAccount.value.stakingLocks;
        const stakingLocksForThisNode = stakingLocks.filter(
            (lock) => lock.validatorNodeId === nodeVbId.value
        );
        return stakingLocksForThisNode

        /*
        const pk = nodePublicKey.value?.pk;
        if (pk === undefined) {
            return undefined;
        }

        if (wallet.value === null) return undefined;
        if (locallyStoredNode.value === null) return undefined;
        if (locallyStoredNode.value.vbId === undefined) return undefined;

        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);

        console.log(`Searching for validator node id from node public key ${pk}`);
        const validatorNodeVbId = await provider.getValidatorNodeIdByCometbftPublicKey(pk);

        console.log(`Searching for validator node with id ${validatorNodeVbId}`);
        const validatorNodeVb = await provider.loadValidatorNodeVirtualBlockchain(Hash.from(validatorNodeVbId));
        const orgVbId = await validatorNodeVb.getOrganizationId();
        const orgVb = await provider.loadOrganizationVirtualBlockchain(orgVbId);
        const nodeOwnerAccountVbId = orgVb.getAccountId();
        const accountId = nodeOwnerAccountVbId.toBytes();
        const accountState = await provider.getAccountState(accountId);
        const nodeVbId = Hash.from(locallyStoredNode.value.vbId);
        const stakingForThisNode = accountState.locks.filter(
            (lock) =>
                lock.type === LockType.NodeStaking &&
                Utils.binaryIsEqual(lock.parameters.validatorNodeId, nodeVbId.toBytes()),
        );
        if (stakingForThisNode.length === 0) return undefined;
        const stake = stakingForThisNode[0];
        if (stake.type !== LockType.NodeStaking)
            throw new Error(`Expected lock type to be NodeStaking, got ${LockType[stake.type]}`);
        return stake;

         */
    });

    const currentStakedAmount = computed(() => {
        if (!nodeStakeInformation.value) return undefined;
        const sumOfStaked = nodeStakeInformation.value.reduce((acc, l) => acc + l.amount, 0)
        return CMTSToken.createAtomic(sumOfStaked);
    });

    const unstakingAmountInProgress = computed(() => {
        if (nodeStakeInformation.value === undefined) return undefined;
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
        if (nodeStakeInformation.value === undefined) return undefined;
        const { plannedUnlockTimestamp } = nodeStakeInformation.value[0];
        if (plannedUnlockTimestamp === undefined) return undefined;
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
    };
}
