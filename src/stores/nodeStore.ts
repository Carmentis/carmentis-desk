import {from, useObservable} from "@vueuse/rxjs";
import {liveQuery} from "dexie";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {useCurrentWallet} from "../composables/useCurrentWallet.ts";
import {useCurrentOrganization} from "../composables/useCurrentOrganization.ts";
import {computedAsync} from "@vueuse/core";
import {Tendermint37Client} from "@cosmjs/tendermint-rpc";
import {useQuery} from "@tanstack/vue-query";
import {CMTSToken, EncoderFactory} from "@cmts-dev/carmentis-sdk-core";
import {computed} from "vue";

export const useNodeStore = (nodeId: number) => {
    const {wallet, indexer: walletIndexer, useHasAccountOnChainQuery} = useCurrentWallet();
    const {organization, organizationVbId} = useCurrentOrganization();

    const node = useObservable(
        from(liveQuery(() => DeskDatabase.getNodeById(nodeId))),
        {initialValue: undefined}
    );
    const nodeRpcEndpoint = computed(() => node.value?.rpcEndpoint ?? undefined)



    function updateNode(updatedNode: Partial<Node>) {
        if (!node.value) throw new Error('Node not found')
        return DeskDatabase.updateNode(nodeId, {
            ...node.value,
            ...updatedNode
        })
    }

    function deleteNode() {
        return DeskDatabase.deleteNodeById(nodeId)
    }



    // node chain status (the chain on which the node is running)
    const chainNameOnWhichNodeIsConnected = computedAsync(async () => {
        if (!nodeRpcEndpoint.value) {
            return undefined;
        }
        const endpoint = nodeRpcEndpoint.value;
        const client = await Tendermint37Client.connect(endpoint);
        const status = await client.status();
        return status.nodeInfo.network;
    });

    // Node publication status
    const {data: nodePublicKey, isLoading: isLoadingNodePublicKey} = useQuery({
        queryKey: ['node-public-key', nodeId],
        refetchInterval: 10000,
        queryFn: async () =>  {
            if (!nodeRpcEndpoint.value) {
                return null;
            }
            const endpoint = nodeRpcEndpoint.value;
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
        queryKey: ['node-vbid', nodeId],
        queryFn: () => {
            if (!node.value) return null;
            return node.value.nodeVbId;
        },
    })

    const isNodePublished = computed(() => {
        return nodeVbId.value !== undefined;
    });

    const {data: validatorNode, isLoading: isLoadingValidatorNode} = useQuery({
        enabled: computed(() => !!nodeVbId.value),
        queryKey: ['node', nodeVbId],
        queryFn: async () => {
            if (!nodeVbId.value || !walletIndexer.value) {
                console.warn("Cannot fetch validator node: node vb id or indexer undefined")
                return null
            };
            const validatorNodesResponse = await walletIndexer.value.getValidatorNodes({ vb_id: nodeVbId.value });
            const validatorNodes = validatorNodesResponse.items;
            if (validatorNodes.length === 0) return null;
            return validatorNodes[0];
        }
    })

    const {data: nodeOwnerOrganizationId} = useQuery({
        enabled: computed(() => !!node.value),
        queryKey: ['node-owner-organization-id', nodeVbId],
        queryFn: async () => {

            if (!node.value || !node.value.nodeVbId || !walletIndexer.value) {
                console.warn(`Cannot fetch node owner organization id: node vb id or indexer undefined: ${node.value}`)
                return null;
            };

            const nodeVbId = node.value.nodeVbId;
            const validatorNodesResponse = await walletIndexer.value.getValidatorNodes({ vb_id: nodeVbId });
            const validatorNodes = validatorNodesResponse.items;
            if (validatorNodes.length === 0) {
                console.warn(`Cannot fetch node owner organization id: no validator nodes found for node vb id: ${nodeVbId}`)
                return null;
            };
            return validatorNodes[0].organizationId;
        }
    })

    const {data: nodeOwnerOrganization, isLoading: isLoadingNodeOwnerOrganization} = useQuery({
        queryKey: ['node-owner-organization', nodeVbId],
        queryFn: async () => {
            if (!nodeOwnerOrganizationId.value || !walletIndexer.value) return null;
            const organizationId = nodeOwnerOrganizationId.value;
            const organization = await walletIndexer.value.getOrganizations({ vb_id: organizationId });
            return organization.items[0];
        }
    })

    // Check if node is claimed and by whom
    const nodeOwnerAccountId = computedAsync(async () => {
        if (!nodeOwnerOrganization.value) return undefined;
        const accountId = nodeOwnerOrganization.value.accountId;
        return accountId;
    });


    const { data: nodeOwnerAccount, isLoading: isLoadingNodeOwnerAccount } = useQuery({
        queryKey: ['nodeOwnerAccount', nodeOwnerAccountId],
        queryFn: async () => {
            if (!nodeOwnerAccountId.value || !walletIndexer.value) {
                console.warn("Cannot fetch node owner account: node owner account id or indexer undefined")
                return null
            };
            const accounts =  await walletIndexer.value.getAccounts({ id: nodeOwnerAccountId.value });
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

    const isOwnedByWallet = computed( () => {
        if (!nodeOwnerOrganizationId.value || !organizationVbId.value) return undefined;
        return nodeOwnerOrganizationId.value === organizationVbId.value;
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

    const isLoadingNode = computed(() => {
        return isLoadingNodeOwnerAccount.value ||
            isLoadingNodeOwnerOrganization.value ||
            isLoadingValidatorNode.value ||
            isLoadingNodePublicKey.value
    })

    return {
        // states
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
        organizationVbId,
        isOwnedByWallet,
        nodeStakeInformation,
        currentStakedAmount,
        unstakingAmountInProgress,
        hasUnstakingOperationInProgress,
        unstakingAtTimestamp,
        hasNodeStakeInformation,

        // loading states
        isLoadingNode,
        isLoadingNodeOwnerAccount,
        isLoadingNodeOwnerOrganization,
        isLoadingValidatorNode,
        isLoadingNodePublicKey,

        // hooks
        useHasAccountOnChainQuery,

        // actions
        updateNode,
        deleteNode,
    }
}

