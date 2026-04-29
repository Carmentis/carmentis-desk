import { Secp256k1PrivateSignatureKey, Secp256k1PublicSignatureKey } from '@cmts-dev/carmentis-sdk/client'
import {importJWK, JWK} from 'jose'

// secp256k1 field prime
const SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn

export class CarmentisKeyConverter {
  static async convertSecp256k1PrivateKeyToJwk(privateKey: Secp256k1PrivateSignatureKey): Promise<CryptoKey> {
    const privateKeyBytes = privateKey.getPrivateKeyAsBytes()

    const publicKey = await privateKey.getPublicKey() as Secp256k1PublicSignatureKey
    const compressedPublicKey = await publicKey.getPublicKeyAsBytes()

    const { x, y } = decompressSecp256k1Point(compressedPublicKey)

    const jwk: JWK = {
        alg: "ECDSA",
        kty: 'EC',
        crv: 'secp256k1',
        x: bytesToBase64Url(x),
        y: bytesToBase64Url(y),
        d: bytesToBase64Url(privateKeyBytes),
    }

    return importJWK(jwk, 'ES256K') as Promise<CryptoKey>
  }
}

/**
 * Decompresses a secp256k1 compressed public key (33 bytes) into its x and y coordinates.
 * Compressed format: 0x02 (even y) or 0x03 (odd y) followed by 32 bytes of x.
 */
function decompressSecp256k1Point(compressed: Uint8Array): { x: Uint8Array; y: Uint8Array } {
  if (compressed.length !== 33 || (compressed[0] !== 0x02 && compressed[0] !== 0x03)) {
    throw new Error('Invalid compressed secp256k1 public key')
  }

  const xBytes = compressed.slice(1)
  const x = bytesToBigInt(xBytes)

  // y² = x³ + 7 (mod p)
  const ySquared = (x ** 3n + 7n) % SECP256K1_P

  // Since p ≡ 3 (mod 4) for secp256k1, sqrt = ySquared^((p+1)/4) mod p
  const yCand = modPow(ySquared, (SECP256K1_P + 1n) / 4n, SECP256K1_P)

  const prefixIsEven = compressed[0] === 0x02
  const candIsEven = (yCand & 1n) === 0n
  const y = prefixIsEven === candIsEven ? yCand : SECP256K1_P - yCand

  return { x: xBytes, y: bigIntTo32Bytes(y) }
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  base %= mod
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod
    exp >>= 1n
    base = (base * base) % mod
  }
  return result
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return bytes.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n)
}

function bigIntTo32Bytes(n: bigint): Uint8Array {
  const bytes = new Uint8Array(32)
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(n & 0xffn)
    n >>= 8n
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
