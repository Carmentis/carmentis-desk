/**
 * Request type for the `/v1/auth/pk` JSON-RPC method.
 *
 * The wallet signs `b64Challenge` with the Ed25519 key derived from the chosen
 *
 * Registered in: rpcMethodRegistry.ts → '/v1/auth/pk'
 * Handler component: AuthByPublicKeyV2.vue
 */
import * as v from 'valibot';



export const AuthByPublicKeyV2ParamsSchema = v.object({
    /** Indicates the public key to help desk to choose the correct wallet **/
    publicKey: v.nullish(v.string()),


    /** Name of the entity requesting authentication — displayed to the user */
    origin: v.string(),

    /** A title to display */
    title: v.optional(v.string(), 'Authentication Request'),

    /** Logo */
    logoUrl: v.nullish(v.string()),

    /**
     * The challenge to be signed by the user's private key.
     */
    challenge: v.string(),
})

export type AuthByPublicKeyV2Params = v.InferOutput<typeof AuthByPublicKeyV2ParamsSchema>;
