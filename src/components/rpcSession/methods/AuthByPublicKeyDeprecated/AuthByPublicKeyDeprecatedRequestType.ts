import * as v from 'valibot';

export const AuthByPublicKeyDeprecatedParamsSchema = v.object({
    base64EncodedChallenge: v.string(),
});
export type AuthByPublicKeyDeprecatedParams = v.InferOutput<typeof AuthByPublicKeyDeprecatedParamsSchema>;
