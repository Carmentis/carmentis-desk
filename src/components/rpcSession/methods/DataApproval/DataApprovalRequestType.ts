/**
 * Request type for the `wr-data-approval` JSON-RPC method.
 *
 * Initiates a WIAP (Wallet Interactive Anchoring Protocol) flow:
 * the wallet contacts the operator server at `serverUrl`, retrieves the
 * microblock identified by `anchorRequestId`, displays it to the user,
 * and submits the approval signature upon confirmation.
 *
 * Registered in: rpcMethodRegistry.ts → 'wr-data-approval'
 * Handler component: DataApproval.vue
 */
import * as v from 'valibot';

export const DataApprovalParamsSchema = v.object({
    /** Base URL of the operator server (e.g. https://operator.example.com) */
    serverUrl: v.string(),
    /** ID of the pending anchor request on the operator */
    anchorRequestId: v.string(),
});

export type DataApprovalParams = v.InferOutput<typeof DataApprovalParamsSchema>;
