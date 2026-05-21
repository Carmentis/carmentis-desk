import * as v from 'valibot';

export const DataApprovalParamsSchema = v.object({
    serverUrl: v.string(),
    anchorRequestId: v.string(),
});
export type DataApprovalParams = v.InferOutput<typeof DataApprovalParamsSchema>;
