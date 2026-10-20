import {useMutation} from "@tanstack/vue-query";
import {useToast} from "primevue/usetoast";
import {useCurrentWallet} from "./useCurrentWallet.ts";
import * as ops from "../onchain/onchainOperations.ts";

/**
 * Component-level wrapper around the stateless on-chain operations.
 *
 * Each call builds a fresh {@link ops.OnChainContext} from the wallet bound to the calling component,
 * runs the operation and reports the outcome with a toast. The running state of each action is
 * provided by `useMutation` (`isPending`). Nothing is shared between components.
 */
export function useOnChainActions() {
    const toast = useToast();
    const { createOnChainContext } = useCurrentWallet();

    const errorDetail = (e: unknown) => e instanceof Error ? e.message : 'Unknown error';

    const { mutateAsync: publishOrganizationAsync, isPending: isPublishingOrganization } = useMutation({
        mutationFn: async (params: ops.PublishOrganizationParams) =>
            ops.publishOrganization(await createOnChainContext(), params),
        onSuccess: (organization) => toast.add({
            severity: 'success',
            summary: 'Organization published',
            detail: `Organization "${organization.name}" published successfully`,
            life: 3000,
        }),
        onError: (e) => {
            console.error(e);
            toast.add({ severity: 'error', summary: `Error publishing organization: ${e}`, life: 3000 });
        },
    });

    const { mutateAsync: claimNodeAsync, isPending: isClaimingNode } = useMutation({
        mutationFn: async (params: ops.ClaimNodeParams) =>
            ops.claimNode(await createOnChainContext(), params),
        onSuccess: ({ node }) => toast.add({
            severity: 'success',
            summary: 'Node claimed',
            detail: `Node "${node.name}" claimed successfully`,
            life: 3000,
        }),
        onError: (e) => toast.add({
            severity: 'error', summary: 'Error claiming node', detail: errorDetail(e), life: 5000,
        }),
    });

    const { mutateAsync: stakeOnNodeAsync, isPending: isStakingOnNode } = useMutation({
        mutationFn: async (params: ops.StakeOnNodeParams) =>
            ops.stakeOnNode(await createOnChainContext(), params),
        onSuccess: ({ node }, { amount }) => toast.add({
            severity: 'success',
            summary: 'Staking successful',
            detail: `Staked ${amount.toString()} on node "${node.name}"`,
            life: 3000,
        }),
        onError: (e) => toast.add({
            severity: 'error', summary: 'Error staking', detail: errorDetail(e), life: 5000,
        }),
    });

    const { mutateAsync: unstakeFromNodeAsync, isPending: isUnstakingFromNode } = useMutation({
        mutationFn: async (params: ops.UnstakeFromNodeParams) =>
            ops.unstakeFromNode(await createOnChainContext(), params),
        onSuccess: ({ node }, { amount }) => toast.add({
            severity: 'success',
            summary: 'Unstaking successful',
            detail: `Unstaked ${amount.toString()} from node "${node.name}"`,
            life: 3000,
        }),
        onError: (e) => toast.add({
            severity: 'error', summary: 'Error unstaking', detail: errorDetail(e), life: 5000,
        }),
    });

    const { mutateAsync: publishApplication, isPending: isPublishingApplication } = useMutation({
        mutationFn: async (params: ops.PublishApplicationParams) =>
            ops.publishApplication(await createOnChainContext(), params),
        onSuccess: (_, { name }) => toast.add({
            severity: 'success',
            summary: 'Application published',
            detail: `Application "${name}" published successfully`,
            life: 3000,
        }),
        onError: (e) => toast.add({
            severity: 'error', summary: 'Error publishing application', detail: errorDetail(e), life: 5000,
        }),
    });

    const { mutateAsync: transferTokens, isPending: isTransferringTokens } = useMutation({
        mutationFn: async (params: ops.TransferTokensParams) =>
            ops.transferTokens(await createOnChainContext(), params),
        onSuccess: ({ createdAccount }, { amount }) => toast.add({
            severity: 'success',
            summary: 'Transfer successful',
            detail: createdAccount
                ? `Created account and transferred ${amount.toString()} tokens successfully`
                : `Transferred ${amount.toString()} tokens successfully`,
            life: 3000,
        }),
        onError: (e) => toast.add({
            severity: 'error', summary: 'Error transferring tokens', detail: errorDetail(e), life: 5000,
        }),
    });

    const { mutateAsync: publishCustomJsonAsync, isPending: isPublishingCustomJson } = useMutation({
        mutationFn: async (params: ops.PublishCustomJsonParams) =>
            ops.publishCustomJson(await createOnChainContext(), params),
        onSuccess: () => toast.add({
            severity: 'success',
            summary: 'Custom data published',
            detail: 'Custom JSON section published on-chain successfully',
            life: 3000,
        }),
        onError: (e) => toast.add({
            severity: 'error', summary: 'Error publishing custom data', detail: String(e), life: 5000,
        }),
    });

    return {
        isPublishingOrganization,
        isClaimingNode,
        isStakingOnNode,
        isUnstakingFromNode,
        isPublishingApplication,
        isTransferringTokens,
        isPublishingCustomJson,

        // errors are already reported with a toast: these two do not rethrow (as before)
        publishOrganization: (params: ops.PublishOrganizationParams) =>
            publishOrganizationAsync(params).then(() => undefined, () => undefined),
        publishCustomJson: (params: ops.PublishCustomJsonParams) =>
            publishCustomJsonAsync(params).then(() => undefined, () => undefined),

        // these rethrow so callers can keep their dialog open
        claimNode: (params: ops.ClaimNodeParams) => claimNodeAsync(params).then((r) => r.microblockHash),
        stakeOnNode: (params: ops.StakeOnNodeParams) => stakeOnNodeAsync(params).then((r) => r.microblockHash),
        unstakeFromNode: (params: ops.UnstakeFromNodeParams) => unstakeFromNodeAsync(params).then((r) => r.microblockHash),
        publishApplication,
        transferTokens,
    };
}
