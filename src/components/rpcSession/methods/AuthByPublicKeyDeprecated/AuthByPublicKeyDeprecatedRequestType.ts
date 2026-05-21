/**
 * Request type for the `wr-auth-pk` JSON-RPC method (deprecated).
 *
 * Legacy authentication method — use `/v1/auth/pk` instead.
 * Uses the default Carmentis signature encoding rather than JWS.
 *
 * Registered in: rpcMethodRegistry.ts → 'wr-auth-pk'
 * Handler component: AuthByPublicKeyDeprecated.vue
 */
import * as v from 'valibot';

export const AuthByPublicKeyDeprecatedParamsSchema = v.object({
    /** Base64-encoded challenge that the wallet must sign */
    base64EncodedChallenge: v.string(),
});

export type AuthByPublicKeyDeprecatedParams = v.InferOutput<typeof AuthByPublicKeyDeprecatedParamsSchema>;
