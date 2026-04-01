import * as v from 'valibot';

// ---------------------------------------------------------------------------
// Shared primitive — a single SD-JWT disclosure entry.
// `key` is absent for array-element disclosures.
// ---------------------------------------------------------------------------

export const DisclosureSchema = v.looseObject({
  _digest: v.string(),
  _encoded: v.string(),
  salt: v.string(),
  key: v.optional(v.string()),
  value: v.optional(v.unknown()),
});

export type Disclosure = v.InferOutput<typeof DisclosureSchema>;

// ---------------------------------------------------------------------------
// SD-JWT-VC (W3C Verifiable Credential 2.0 over SD-JWT)
//
// Discriminating fields that are ABSENT from classic SD-JWT:
//   - payload["@context"]    — W3C VC context array
//   - payload.credentialSubject — subject claims object
//
// Detection checks these two fields BEFORE the classic SD-JWT check so the
// more-specific type wins. Adding future VC subtypes follows the same pattern:
//   1. Define a payload schema with its unique discriminators.
//   2. Add a detection guard that runs before the classic SD-JWT guard.
// ---------------------------------------------------------------------------

export const SdJwtVcPayloadSchema = v.looseObject({
  '@context': v.array(v.string()),
  type: v.array(v.string()),
  credentialSubject: v.looseObject({}),
  _sd_alg: v.string(),
  // Optional W3C VC 2.0 fields
  vct: v.optional(v.string()),
  validFrom: v.optional(v.string()),
  validUntil: v.optional(v.string()),
});

export const SdJwtVcSchema = v.looseObject({
  jwt: v.looseObject({
    header: v.looseObject({ typ: v.string(), alg: v.string() }),
    payload: SdJwtVcPayloadSchema,
    signature: v.string(),
    encoded: v.string(),
  }),
  disclosures: v.array(DisclosureSchema),
});

export type SdJwtVcCredential = v.InferOutput<typeof SdJwtVcSchema>;

// ---------------------------------------------------------------------------
// SD-JWT (classic — IETF draft)
//
// Discriminating fields: `iss` (issuer string) + `iat` (issued-at timestamp).
// `exp` and `sub` are part of the spec but are optional in practice.
// ---------------------------------------------------------------------------

export const SdJwtPayloadSchema = v.looseObject({
  iss: v.string(),
  iat: v.number(),
  vct: v.string(),
  _sd_alg: v.string(),
  // Optional standard JWT claims
  exp: v.optional(v.number()),
  sub: v.optional(v.string()),
});

export const SdJwtSchema = v.looseObject({
  jwt: v.looseObject({
    header: v.looseObject({ typ: v.string(), alg: v.string() }),
    payload: SdJwtPayloadSchema,
    signature: v.string(),
    encoded: v.string(),
  }),
  disclosures: v.array(DisclosureSchema),
});

export type SdJwtCredential = v.InferOutput<typeof SdJwtSchema>;

// ---------------------------------------------------------------------------
// Shared envelope — the minimum structure needed by the presentation dialog.
// Both SD-JWT and SD-JWT-VC share this exact envelope; only the payload
// content differs. Adding a new SD-JWT variant never requires changing the
// presentation logic.
// ---------------------------------------------------------------------------

export const SdJwtEnvelopeSchema = v.looseObject({
  jwt: v.looseObject({
    header: v.looseObject({ typ: v.string(), alg: v.string() }),
    payload: v.looseObject({ _sd_alg: v.string() }),
    signature: v.string(),
    encoded: v.string(),
  }),
  disclosures: v.array(DisclosureSchema),
});

export type SdJwtEnvelope = v.InferOutput<typeof SdJwtEnvelopeSchema>;

// ---------------------------------------------------------------------------
// Credential type registry
//
// To add a new type:
//   1. Define its payload schema above (with unique discriminating fields).
//   2. Add it to CredentialType.
//   3. Add a detection guard in detectCredentialType (more-specific types first).
//   4. Add a parse helper below.
//   5. Create a CredentialCard<Type>.vue component.
//   6. Register the component in CredentialCard.vue.
// ---------------------------------------------------------------------------

export type CredentialType = 'sd-jwt-vc' | 'sd-jwt' | 'unrecognized';

export function detectCredentialType(data: string): CredentialType {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return 'unrecognized';
  }

  // Guard: typ must contain "sd-jwt" for all SD-JWT family types.
  const envelopeResult = v.safeParse(SdJwtEnvelopeSchema, parsed);
  if (!envelopeResult.success) return 'unrecognized';
  if (!envelopeResult.output.jwt.header.typ.toLowerCase().includes('sd-jwt')) return 'unrecognized';

  // SD-JWT-VC: checked first because it is a strict superset of classic SD-JWT.
  const vcResult = v.safeParse(SdJwtVcSchema, parsed);
  if (vcResult.success) return 'sd-jwt-vc';

  // Classic SD-JWT.
  const jwtResult = v.safeParse(SdJwtSchema, parsed);
  if (jwtResult.success) return 'sd-jwt';

  return 'unrecognized';
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

export function parseSdJwtVc(data: string): SdJwtVcCredential | null {
  try {
    const result = v.safeParse(SdJwtVcSchema, JSON.parse(data));
    return result.success ? result.output : null;
  } catch {
    return null;
  }
}

export function parseSdJwt(data: string): SdJwtCredential | null {
  try {
    const result = v.safeParse(SdJwtSchema, JSON.parse(data));
    return result.success ? result.output : null;
  } catch {
    return null;
  }
}

/**
 * Parses either an SD-JWT or SD-JWT-VC credential into the shared envelope
 * type. Use this in contexts that only need `jwt.encoded` + `disclosures`
 * (e.g. the presentation dialog).
 */
export function parseSdJwtEnvelope(data: string): SdJwtEnvelope | null {
  try {
    const result = v.safeParse(SdJwtEnvelopeSchema, JSON.parse(data));
    return result.success ? result.output : null;
  } catch {
    return null;
  }
}
