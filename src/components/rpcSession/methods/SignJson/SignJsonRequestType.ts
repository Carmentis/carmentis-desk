/**
 * Request type for the `/v1/auth/pk` JSON-RPC method.
 *
 * The wallet signs `b64Challenge` with the Ed25519 key derived from the chosen
 *
 * Registered in: rpcMethodRegistry.ts → '/v1/auth/pk'
 * Handler component: SignJson.vue
 */
import * as v from 'valibot';

export const SignJsonParamsSchema = v.object({
    payload: v.unknown(),
    context: v.object({
        purpose: v.string(),
        allowedOnChain: v.nullish(v.boolean())
    })
})

export type SignJsonParams = v.InferOutput<typeof SignJsonParamsSchema>;
