<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, onMounted, watch} from "vue";
import * as jose from "jose";
import {
  Openid4vciIssuer,
  Openid4vciClient,
} from "@openid4vc/openid4vci";
import { util } from "@cef-ebsi/key-did-resolver";
const props = defineProps<{ uri: string }>();
console.log(props);
const uri = computed(() => props.uri);



async function handleQuery() {
  const url = new URL(uri.value);
  if (uri.value === "") return;
  console.log(
    "Received OpenID URL:",
    uri.value,
    "query:",
    url.searchParams.toString()
  )
  console.log(url)
  const requestUri = url.searchParams.get('request_uri')
  if (requestUri) {
    const requestObject = await fetch(requestUri).then(r => r.text())
    console.log(requestObject)
    const payload = jose.decodeJwt(requestObject)
    console.log(payload)
    const redirectUri = payload.redirect_uri as string;
    const state = payload.state as string;



    // we generate a key and a did
    console.log("Generating key pair for wallet")
    /*
    const { privateKey, publicKey } = await jose.generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    })*/
    const { privateKey, publicKey } = await jose.generateKeyPair('ES256', {
      extractable: true
    })


    console.log("Exporting keys in JWK")
    const privateKeyJwk = await jose.exportJWK(privateKey)
    const publicKeyJwk = await jose.exportJWK(publicKey)
    console.log("Private key JWK:", privateKeyJwk, publicKeyJwk)

    console.log("Generating DID")
    // @ts-ignore
    const walletDid = util.createDid(publicKeyJwk);
    const test = `${walletDid}#${walletDid.replace("did:key:", "")}`
    //const walletDid = `did:jwk:${jose.base64url.encode(JSON.stringify(publicKeyJwk))}`;
    console.log("Obtained DID:", walletDid)
    const idToken = await new jose.SignJWT({
      iss: walletDid,        // le wallet s'identifie
      sub: walletDid,
      aud: payload.client_id as string,
      nonce: payload.nonce,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5 min
      sub_jwk: publicKeyJwk, // ta clé publique,

    })
        .setProtectedHeader({ alg: 'ES256', kid: `${test}`, typ: 'JWT' })
        .sign(privateKeyJwk)

    console.log(idToken)

    const body = new URLSearchParams()
    body.append('id_token', idToken)
    body.append('state', state)

    const response = await fetch(redirectUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const result = await response.json()

    if (result.redirect_uri) {
      // Flow cross-device : rediriger l'utilisateur
      window.location.href = result.redirect_uri
    }

  } else {
    console.log("No request_uri found in URL")
  }
}


watch(uri, async () => {await handleQuery()})

onMounted(async () => {
  await handleQuery();
})
</script>


<template>

</template>