# Wallet Request via JSON-RPC Documentation

This document lists the supported JSON-RPC methods and parameters to interact with the Carmentis wallet request relay.

---

## Connection Setup

A wallet request session is initiated via a deep link or URL with the following query parameters:

| Parameter  | Type   | Description                                      |
|------------|--------|--------------------------------------------------|
| `relay`    | string | URL of the relay server to connect to            |
| `sessionId`| string | Unique session identifier for the relay channel  |
| `symKey`   | string | Symmetric encryption key used to secure messages |

**Example URL:**
```
cmts://connect/carmentis-relay?relay=https://relay.example.com&sessionId=abc123&symKey=base64key
```

Once connected, the relay session remains open and the wallet listens for incoming JSON-RPC requests.

---

## JSON-RPC Request Format

All requests follow the [JSON-RPC 2.0](https://www.jsonrpc.org/specification) specification:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "<method-name>",
  "params": { ... }
}
```

---

## Supported Methods

### `ping`

Health check to verify the wallet is connected and responsive.

**Parameters:** none

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "ts": 1700000000000
  }
}
```

| Field | Type   | Description                          |
|-------|--------|--------------------------------------|
| `ts`  | number | Current timestamp in milliseconds    |

---

### `/v1/auth/pk`
Requests the user to authenticate using their wallet's public key. The wallet signs the provided challenge and returns the public key and signature.

**Parameters:**

| Parameter      | Type                  | Required | Description                              |
|----------------|-----------------------|----------|------------------------------------------|
| `origin`       | string                | Yes      | Entity's name requesting authentication. |
| `b64Challenge` | string                | Yes      | Base64-encoded challenge string to sign  |
| `pkFormat`     | 'did', 'jwk' or 'cmts' | No       | Expected returned public key format.     |
| `sigFormat`    | 'jws'                 | No       | Expected returned signature format.      |

The `pkFormat` parameter is optional and defaults to 'cmts'. When assigned to 'did', the public key is returned in DID format. 
When assigned to 'cmts', the public key is returned in CMTS format. When assigned to 'jwk', the public key is returned in JWK format.
The `sigFormat` parameter is optional and defaults to 'jws'. When assigned to 'jws', the signature is returned in JWS format.

**Response parameters:**

| Field       | Type             | Description                                            |
|-------------|------------------|--------------------------------------------------------|
| `pk`        | string or object | The wallet's public signature key, encoded as a string |
| `signature` | string           | Signature of the challenge, encoded as a string        |


### `wr-auth-pk` (DEPRECATED)

Requests the user to authenticate using their wallet's public key. The wallet signs the provided challenge and returns the public key and signature.

> DEPRECATED: This method is deprecated and will be removed in a future release.

**Parameters:**

| Parameter               | Type   | Required | Description                              |
|-------------------------|--------|----------|------------------------------------------|
| `base64EncodedChallenge`| string | Yes      | Base64-encoded challenge string to sign  |

**Request example:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "wr-auth-pk",
  "params": {
    "base64EncodedChallenge": "dGVzdC1jaGFsbGVuZ2U="
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "publicKey": "<hex-or-base64-encoded-public-key>",
    "signature": "<base64-encoded-signature>"
  }
}
```

| Field       | Type   | Description                                                        |
|-------------|--------|--------------------------------------------------------------------|
| `publicKey` | string | The wallet's public signature key, encoded as a string             |
| `signature` | string | Signature of the base64-encoded challenge, encoded as a string     |

---

### `wr-data-approval`

Requests the user to approve the anchoring of a microblock in a virtual blockchain. The wallet contacts the operator server via the **Wallet Interactive Anchoring Protocol (WIAP)** to retrieve the microblock, display it to the user, and submit the approval signature.

**Parameters:**

| Parameter        | Type   | Required | Description                                              |
|------------------|--------|----------|----------------------------------------------------------|
| `serverUrl`      | string | Yes      | Base URL of the operator server                          |
| `anchorRequestId`| string | Yes      | Identifier of the pending anchor request on the operator |

**Request example:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "wr-data-approval",
  "params": {
    "serverUrl": "https://operator.example.com",
    "anchorRequestId": "req-abc-123"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "b64VbHash": "<base64-encoded-virtual-blockchain-hash>",
    "b64MbHash": "<base64-encoded-microblock-hash>",
    "height": 5
  }
}
```

| Field        | Type   | Description                                          |
|--------------|--------|------------------------------------------------------|
| `b64VbHash`  | string | Base64-encoded hash of the virtual blockchain        |
| `b64MbHash`  | string | Base64-encoded hash of the approved microblock       |
| `height`     | number | Height of the microblock within the virtual blockchain |

**Internal WIAP Protocol Flow:**

The wallet communicates with the operator at `{serverUrl}/api/protocols/wiap/v1` using the following steps:

1. **Handshake** — The wallet sends an `APPROVAL_HANDSHAKE` request with the `anchorRequestId`.
   - If the operator responds with `ACTOR_KEY_REQUIRED` (and a `b64GenesisSeed`), the wallet derives actor keys from the genesis seed.
   - The wallet sends an `ACTOR_KEY` request containing the actor's signature public key (`actorSignaturePublicKey`) and public encryption key (`actorPkePublicKey`).
   - The operator responds with `APPROVAL_DATA`.
   - If the operator responds directly with `APPROVAL_DATA`, the actor key exchange step is skipped.

2. **Display** — The wallet decodes and renders the microblock sections for the user to review.

3. **Approval** — Upon user confirmation, the wallet signs the microblock and sends an `APPROVAL_SIGNATURE` request with the base64-encoded signature (`b64Signature`).

4. **Result** — The operator returns the final `b64VbHash`, `b64MbHash`, and `height`, which are forwarded back to the original caller.

**Error responses:**

| Error code | Message                                       | Cause                                         |
|------------|-----------------------------------------------|-----------------------------------------------|
| `-32602`   | `Invalid parameters for data approval request`| Missing or malformed `serverUrl` or `anchorRequestId` |

---

## Error Handling

When a method is not recognized or parameters are invalid, the wallet returns a standard JSON-RPC error response:

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

| Code     | Meaning            |
|----------|--------------------|
| `-32600` | Invalid request    |
| `-32601` | Method not found   |
| `-32602` | Invalid parameters |
| `-32603` | Internal error     |
