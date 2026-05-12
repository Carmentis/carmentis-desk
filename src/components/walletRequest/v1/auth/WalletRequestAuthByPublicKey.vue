<script setup lang="ts">
import {ref} from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import {
  CryptoEncoderFactory,
  Secp256k1PrivateSignatureKey,
  SeedEncoder,
  WalletCrypto,
  JwkSignatureEncoder, Ed25519PrivateSignatureKey, Ed25519PublicSignatureKey
} from '@cmts-dev/carmentis-sdk-core'
import {useStorageStore} from '../../../../stores/storage.ts'
import {storeToRefs} from 'pinia'
import * as jose from 'jose';
import {base64url} from "jose";
import {JwkSignatureKeyExporter} from "../../../jwk-signature-key-exporter.ts";

const store = useStorageStore()
const { wallets } = storeToRefs(store)
const chosenWallet = ref(wallets.value[0])

type SupportedPkFormat = 'did' | 'jwk';
const props = defineProps<{
  origin: string
  b64Challenge: string
  pkFormat?: SupportedPkFormat
  sigFormat?: 'jws'
}>()

const emit = defineEmits<{
  approve: [pk: string | object, signature: string]
  reject: []
}>()


const isProcessing = ref(false)

async function exportPublicKeyIntoFormat( publicSignatureKey: Ed25519PublicSignatureKey, format: SupportedPkFormat ) {
  const jwk = await JwkSignatureKeyExporter.exportPublicKey(publicSignatureKey);
  if (format === 'jwk') {
    return jwk
  }

  if (format === 'did') {
    return `did:jwk:${base64url.encode(JSON.stringify(jwk))}`
  }

  throw new Error(`Unsupported format: ${format}`)

}

async function approve() {
  isProcessing.value = true
  try {
    const seed = chosenWallet.value.seed

    // TODO: use the wallet crypto instead of generating the signature key directly
    const sk = Ed25519PrivateSignatureKey.genFromSeed(new SeedEncoder().decode(seed).slice(0,32))
    const pk = await sk.getPublicKey() as Ed25519PublicSignatureKey
    const skJwk = await JwkSignatureKeyExporter.exportPrivateKey(sk)
    const pkJwk = await JwkSignatureKeyExporter.exportPublicKey(pk);
    const pkFormat = props.pkFormat ?? 'did'
    let encoderPk: string | object = await exportPublicKeyIntoFormat(pk, pkFormat)
    const signature = await new jose.SignJWT({
      sub: props.b64Challenge,
      iss: pkFormat,
      aud: props.origin,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
    })
        .setProtectedHeader({ alg: 'EdDSA' })
        .sign(skJwk)

    emit('approve', encoderPk, signature)
  } catch (e) {
    console.error('Error approving authentication request:', e)
    throw e;
  } finally {
    isProcessing.value = false
  }
}

function reject() {
  emit('reject')
}
</script>

<template>
  <div class="flex items-center justify-center h-full p-4">
    <Card class="w-full max-w-md">
      <template #title>
        <div class="flex items-center gap-3">
          <i class="pi pi-key text-3xl text-blue-500"></i>
          <span>Authentication Request</span>
        </div>
      </template>

      <template #content>
        <div class="space-y-4">
          <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p class="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Requesting party</p>
            <p class="text-sm font-semibold text-blue-800">{{ origin }}</p>
          </div>

          <p class="text-sm text-gray-700">
            This application is requesting you to authenticate with your public key.
          </p>

          <div>
            <p class="text-xs text-gray-500 mb-1">Wallet for authentication</p>
            <Dropdown
              v-model="chosenWallet"
              :options="wallets"
              optionLabel="name"
              placeholder="Choose a wallet"
              class="w-full"
            >
              <template #value="slotProps">
                <div v-if="slotProps.value" class="flex items-center gap-2">
                  <i class="pi pi-wallet text-surface-500"></i>
                  <span>{{ slotProps.value.name }}</span>
                </div>
                <span v-else class="text-surface-500">{{ slotProps.placeholder }}</span>
              </template>
              <template #option="slotProps">
                <div class="flex items-center gap-2">
                  <i class="pi pi-wallet text-surface-500"></i>
                  <div>
                    <div class="font-semibold">{{ slotProps.option.name }}</div>
                  </div>
                </div>
              </template>
            </Dropdown>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Challenge to sign</p>
            <p class="text-xs font-mono text-surface-600 break-all bg-surface-50 rounded p-2">{{ b64Challenge }}</p>
          </div>

          <div class="flex gap-3 mt-6">
            <Button
              label="Decline"
              severity="secondary"
              outlined
              @click="reject"
              :disabled="isProcessing"
              class="flex-1"
            />
            <Button
              label="Authenticate"
              severity="primary"
              @click="approve"
              :loading="isProcessing"
              class="flex-1"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
