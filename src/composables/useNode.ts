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

    const { state: node } = useAsyncState(
        () => nodeRepo.getNodeById(toValue(nodeId)),
        null,
        { immediate: true },
    );

    // node chain status (the chain on which the node is running)
    const chainNameOnWhichNodeIsConnected = computedAsync(async () => {
        if (!node.value) {
            return undefined;
        }
        const endpoint = node.value.rpcEndpoint;
        const client = await Tendermint37Client.connect(endpoint);
        const status = await client.status();
        return status.nodeInfo.network;
    });

    // Node publication status
    const nodePublicKey = computedAsync(async () => {
        if (!node.value) {
            return undefined;
        }
        const endpoint = node.value.rpcEndpoint;
        const client = await Tendermint37Client.connect(endpoint);
        const status = await client.status();
        const pk = status.validatorInfo.pubkey;
        if (!pk) return undefined;
        const { data, algorithm } = pk;
        const base64 = EncoderFactory.bytesToBase64Encoder();
        return { pk: base64.encode(data), pkType: algorithm };
    });

    const nodeVbId = computedAsync(async () => {
        if (!node.value || !node.value.vbId) return undefined;
        if (!wallet.value) return undefined;
        if (!nodePublicKey.value) return undefined;

        if (node.value.vbId) {
            return Hash.from(node.value.vbId);
        } else {
            const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
            const vbId = await provider.getValidatorNodeIdByCometbftPublicKey(nodePublicKey.value.pk);
            return Hash.from(vbId);
        }
    });

    const isNodePublished = computed(() => {
        return nodeVbId.value !== undefined;
    });

    // Check if node is claimed and by whom
    const nodeOwnerAccountId = computedAsync(async () => {
        if (!nodeVbId.value) return undefined;
        if (!wallet.value) return undefined;
        if (!node.value?.vbId) return undefined;

        try {
            const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
            const nodeVb = await provider.loadValidatorNodeVirtualBlockchain(Hash.from(node.value.vbId));
            const orgId = await nodeVb.getOrganizationId();
            return orgId;
        } catch (e) {
            console.error('Error loading node owner:', e);
            return undefined;
        }
    });

    const nodeOwnerName = computedAsync(async () => {
        if (!nodeOwnerAccountId.value) return undefined;
        if (!wallet.value) return undefined;
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
        const orgVb = await provider.loadOrganizationVirtualBlockchain(nodeOwnerAccountId.value);
        const orgDesc = await orgVb.getDescription();
        return orgDesc.name;
    });

    const isNodeValidator = computedAsync(async () => {
        if (!nodeVbId.value) return undefined;
        if (!wallet.value) return undefined;
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
        const validatorNodeVb = await provider.loadValidatorNodeVirtualBlockchain(nodeVbId.value);
        const validatorNodeState = await validatorNodeVb.getVirtualBlockchainState();
        return validatorNodeState.internalState.lastKnownApprovalStatus;
    });

    const isNodeClaimed = computed(() => {
        return nodeOwnerAccountId.value !== undefined;
    });

    // Check if the wallet owns this node
    const walletOrgId = computedAsync(async () => {
        if (!organization.value?.vbId) return undefined;
        return Hash.from(organization.value.vbId);
    });

    const isOwnedByWallet = computedAsync(async () => {
        if (!nodeOwnerAccountId.value || !walletOrgId.value) return false;
        const ownerHash = await nodeOwnerAccountId.value;
        const walletHash = await walletOrgId.value;
        return ownerHash.encode() === walletHash.encode();
    });

    // staking information
    const nodeStakeInformation = computedAsync(async () => {
        const pk = nodePublicKey.value?.pk;
        if (pk === undefined) {
            return undefined;
        }

        if (wallet.value === null) return undefined;
        if (node.value === null) return undefined;
        if (node.value.vbId === undefined) return undefined;

        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);

        const validatorNodeVbId = await provider.getValidatorNodeIdByCometbftPublicKey(pk);
        const validatorNodeVb = await provider.loadValidatorNodeVirtualBlockchain(Hash.from(validatorNodeVbId));
        const orgVbId = await validatorNodeVb.getOrganizationId();
        const orgVb = await provider.loadOrganizationVirtualBlockchain(orgVbId);
        const nodeOwnerAccountVbId = orgVb.getAccountId();
        const accountId = nodeOwnerAccountVbId.toBytes();
        const accountState = await provider.getAccountState(accountId);
        const nodeVbId = Hash.from(node.value.vbId);
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
    });

    const currentStakedAmount = computed(() => {
        if (nodeStakeInformation.value === undefined) return undefined;
        return CMTSToken.createAtomic(nodeStakeInformation.value.lockedAmountInAtomics);
    });

    const unstakingAmountInProgress = computed(() => {
        if (nodeStakeInformation.value === undefined) return undefined;
        const { plannedUnlockAmountInAtomics } = nodeStakeInformation.value.parameters;
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
        const { plannedUnlockTimestamp } = nodeStakeInformation.value.parameters;
        if (plannedUnlockTimestamp === undefined) return undefined;
        return plannedUnlockTimestamp;
    });

    return {
        wallet,
        organization,
        node,
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
