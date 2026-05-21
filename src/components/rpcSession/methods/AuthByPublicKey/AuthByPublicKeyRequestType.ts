import * as v from 'valibot';

export const AuthByPublicKeyParamsSchema = v.object({
    origin: v.string(),
    b64Challenge: v.string(),
    pkFormat: v.optional(v.picklist(['did', 'cmts']), 'cmts'),
    sigFormat: v.optional(v.literal('jws'), 'jws'),
});
export type AuthByPublicKeyParams = v.InferOutput<typeof AuthByPublicKeyParamsSchema>;
