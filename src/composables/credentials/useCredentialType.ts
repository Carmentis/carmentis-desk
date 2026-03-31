import * as v from 'valibot';

// ---------------------------------------------------------------------------
// Valibot schemas — only generic, spec-derived fields are checked so that
// future credential variants with the same envelope shape are still matched.
// ---------------------------------------------------------------------------

/**
 * A single SD-JWT disclosure entry as produced by the @sd-jwt/* libraries.
 * `key` is absent for array-element disclosures.
 */
export const DisclosureSchema = v.looseObject({
  _digest: v.string(),
  _encoded: v.string(),
  salt: v.string(),
  key: v.optional(v.string()),
  value: v.optional(v.unknown()),
});

export type Disclosure = v.InferOutput<typeof DisclosureSchema>;

/**
 * The decoded SD-JWT envelope as stored in the credential's `data` field.
 * Detection relies on:
 *  - the presence of a `jwt` object with `header`, `payload`, `signature`,
 *    `encoded`
 *  - `jwt.header.typ` ending with "sd-jwt" (case-insensitive)
 *  - `jwt.payload._sd_alg` being present
 *  - a `disclosures` array
 */
export const SdJwtPayloadSchema = v.looseObject({
  iss: v.string(),
  iat: v.number(),
  vct: v.string(),
  exp: v.number(),
  _sd_alg: v.string(),
});

export const SdJwtSchema = v.looseObject({
  jwt: v.looseObject({
    header: v.looseObject({
      typ: v.string(),
      alg: v.string(),
    }),
    payload: SdJwtPayloadSchema,
    signature: v.string(),
    encoded: v.string(),
  }),
  disclosures: v.array(DisclosureSchema),
});

export type SdJwtCredential = v.InferOutput<typeof SdJwtSchema>;

// ---------------------------------------------------------------------------
// Credential types
// ---------------------------------------------------------------------------

export type CredentialType = 'sd-jwt' | 'unrecognized';

/**
 * Parses `data` (a raw JSON string from storage) and returns the recognised
 * credential type. Defaults to `"unrecognized"` when parsing fails or the
 * shape does not match any known schema.
 */
export function detectCredentialType(data: string): CredentialType {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return 'unrecognized';
  }

  const result = v.safeParse(SdJwtSchema, parsed);
  if (result.success) {
    // Extra guard: typ must contain "sd-jwt" (covers "dc+sd-jwt", "vc+sd-jwt", …)
    const typ = result.output.jwt.header.typ.toLowerCase();
    if (typ.includes('sd-jwt')) return 'sd-jwt';
  }

  return 'unrecognized';
}

/**
 * Parses `data` as an SD-JWT credential and returns the typed object, or
 * `null` if the data does not conform to the schema.
 */
export function parseSdJwt(data: string): SdJwtCredential | null {
  try {
    const result = v.safeParse(SdJwtSchema, JSON.parse(data));
    return result.success ? result.output : null;
  } catch {
    return null;
  }
}
