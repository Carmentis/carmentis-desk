# RPC Session — JSON-RPC API Documentation

This document describes the JSON-RPC methods supported by the Carmentis wallet RPC session. Each method triggers a user-facing approval flow within the wallet before a response is returned.

---

## Architecture Overview

```
Deep link (cmts://)
      │
      ▼
 RpcSession.vue          ← relay connection + JSON-RPC dispatcher
      │
      ├── rpcMethodRegistry.ts   ← maps method names to { schema, component }
      │
      └── methods/
            ├── AuthByPublicKey/         ← /v1/auth/pk
            ├── AuthByPublicKeyDeprecated/  ← wr-auth-pk (deprecated)
            ├── DataApproval/            ← wr-data-approval
            └── CredentialPresentation/  ← /v1/credential/presentation
```

**Adding a new method:**
1. Create `methods/MyMethod/MyMethodRequestType.ts` — Valibot schema + exported type
2. Create `methods/MyMethod/MyMethod.vue` — props: `params`, emits: `done(result)` / `reject()`
3. Add 2 lines to `rpcMethodRegistry.ts`

---

## Connection Setup

A session is opened via a deep link with the following query parameters:

| Parameter   | Type   | Description                                     |
|-------------|--------|-------------------------------------------------|
| `relay`     | string | URL of the relay server                         |
| `sessionId` | string | Unique session identifier for the relay channel |
| `symKey`    | string | Base64-encoded AEAD symmetric encryption key    |

**Deep link format:**
```
cmts://connect/carmentis-relay?relay=https://relay.example.com&sessionId=abc123&symKey=base64key
```

The session remains open until the wallet sends a response or the user disconnects. A single session handles exactly one method call.

---

## JSON-RPC 2.0 Format

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "<method-name>",
  "params": { ... }
}
```

**Success response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

**Error response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

---

## Methods

### `ping`

Health check. Returns immediately without user interaction.

**Parameters:** none

**Response:**

| Field | Type   | Description                       |
|-------|--------|-----------------------------------|
| `ts`  | number | Current timestamp in milliseconds |

**Example:**
```json
// Request
{ "jsonrpc": "2.0", "id": 1, "method": "ping" }

// Response
{ "jsonrpc": "2.0", "id": 1, "result": { "ts": 1700000000000 } }
```

---

### `/v1/auth/pk`

Asks the user to authenticate with their wallet's Ed25519 public key. The wallet signs a challenge and returns the public key + JWS signature.

**Parameters:**

| Parameter      | Type              | Required | Default  | Description                              |
|----------------|-------------------|----------|----------|------------------------------------------|
| `origin`       | string            | Yes      | —        | Name of the requesting party (displayed to user) |
| `b64Challenge` | string            | Yes      | —        | Base64-encoded challenge to sign         |
| `pkFormat`     | `'did'` \| `'cmts'` | No     | `'cmts'` | Format of the returned public key        |
| `sigFormat`    | `'jws'`           | No       | `'jws'`  | Format of the returned signature         |

**`pkFormat` values:**
- `'did'` — Returns a DID URL: `did:jwk:<base64url-encoded-jwk>`
- `'cmts'` — Returns the default Carmentis-encoded public key string

**Response:**

| Field       | Type             | Description                                     |
|-------------|------------------|-------------------------------------------------|
| `pk`        | string \| object | Public key in the requested format              |
| `signature` | string           | JWS-encoded signature of the challenge          |

**Example:**
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "/v1/auth/pk",
  "params": {
    "origin": "My App",
    "b64Challenge": "dGVzdC1jaGFsbGVuZ2U=",
    "pkFormat": "did"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "pk": "did:jwk:eyJrdHkiOi...",
    "signature": "eyJhbGciOiJFZERTQSJ9..."
  }
}
```

---

### `/v1/credential/presentation`

Asks the user to present a verifiable credential (SD-JWT) that satisfies a DCQL query. The wallet finds matching credentials, lets the user choose one, and returns a key-bound verifiable presentation token.

**Parameters:**

| Parameter  | Type        | Required | Description                                              |
|------------|-------------|----------|----------------------------------------------------------|
| `audience` | string      | Yes      | Intended audience for the presentation (verifier URL or DID) |
| `nonce`    | string      | Yes      | One-time nonce to bind the presentation                  |
| `query`    | DCQL Query  | Yes      | A [DCQL](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html) query describing the requested credential and claims |

**`query` structure (DCQL):**
```json
{
  "credentials": [
    {
      "id": "my_credential",
      "format": "dc+sd-jwt",
      "claims": [
        { "path": ["given_name"] },
        { "path": ["family_name"] }
      ]
    }
  ]
}
```

**Response:**

| Field      | Type   | Description                                              |
|------------|--------|----------------------------------------------------------|
| `vp_token` | string | SD-JWT verifiable presentation with key-binding proof    |

**Example:**
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "/v1/credential/presentation",
  "params": {
    "audience": "https://verifier.example.com",
    "nonce": "n-0S6_WzA2Mj",
    "query": {
      "credentials": [
        {
          "id": "identity",
          "format": "dc+sd-jwt",
          "claims": [
            { "path": ["given_name"] },
            { "path": ["family_name"] }
          ]
        }
      ]
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "vp_token": "eyJhbGci...~WyJzYWx0IiwiZ2l2ZW5fbmFtZSIsIkpvaG4iXQ~..."
  }
}
```

---

### `wr-data-approval` *(WIAP protocol)*

Asks the user to approve the anchoring of a microblock in a virtual blockchain. The wallet communicates with the operator server via the **Wallet Interactive Anchoring Protocol (WIAP)**, displays the microblock contents to the user, and submits the signature upon approval.

**Parameters:**

| Parameter         | Type   | Required | Description                                              |
|-------------------|--------|----------|----------------------------------------------------------|
| `serverUrl`       | string | Yes      | Base URL of the operator server                          |
| `anchorRequestId` | string | Yes      | ID of the pending anchor request on the operator         |

**Response:**

| Field        | Type   | Description                                              |
|--------------|--------|----------------------------------------------------------|
| `b64VbHash`  | string | Base64-encoded hash of the virtual blockchain            |
| `b64MbHash`  | string | Base64-encoded hash of the approved microblock           |
| `height`     | number | Height of the microblock in the virtual blockchain       |

**WIAP flow** — The wallet contacts `{serverUrl}/api/protocols/wiap/v1`:

1. **Handshake** — sends `APPROVAL_HANDSHAKE` with `anchorRequestId`
   - If the operator replies `ACTOR_KEY_REQUIRED` (+ `b64GenesisSeed`): the wallet derives actor keys from the genesis seed and sends `ACTOR_KEY` (signature key + encryption key)
   - The operator then replies `APPROVAL_DATA`
   - If the operator replies directly with `APPROVAL_DATA`, the actor key exchange is skipped
2. **Display** — the wallet decodes and shows the microblock sections to the user
3. **Approval** — upon user confirmation, sends `APPROVAL_SIGNATURE` with `b64Signature`
4. **Result** — the operator returns `b64VbHash`, `b64MbHash`, `height`

**Example:**
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "wr-data-approval",
  "params": {
    "serverUrl": "https://operator.example.com",
    "anchorRequestId": "req-abc-123"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "b64VbHash": "abc123==",
    "b64MbHash": "xyz789==",
    "height": 5
  }
}
```

---

### `wr-auth-pk` *(deprecated)*

> **Deprecated** — use `/v1/auth/pk` instead. This method will be removed in a future release.

Requests authentication by public key using the legacy Carmentis encoding.

**Parameters:**

| Parameter                | Type   | Required | Description                             |
|--------------------------|--------|----------|-----------------------------------------|
| `base64EncodedChallenge` | string | Yes      | Base64-encoded challenge string to sign |

**Response:**

| Field       | Type   | Description                                            |
|-------------|--------|--------------------------------------------------------|
| `publicKey` | string | Carmentis-encoded public key                           |
| `signature` | string | Carmentis-encoded signature of the challenge           |

---

## Error Codes

| Code     | Meaning              | When                                        |
|----------|----------------------|---------------------------------------------|
| `-32600` | Invalid request      | Malformed JSON-RPC envelope                 |
| `-32601` | Method not found     | Unknown method name                         |
| `-32602` | Invalid parameters   | Params fail Valibot schema validation        |
| `-32603` | Internal error       | Unexpected error during method execution    |
