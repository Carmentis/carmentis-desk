<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onMounted, ref, watch } from 'vue';
import * as jose from 'jose';
import { Openid4vciIssuer } from '@openid4vc/openid4vci';
import { util } from '@cef-ebsi/key-did-resolver';
import { OpenID4VCIClient, CreateCredentialRequestOpts } from '@sphereon/oid4vci-client';
import * as v from 'valibot';
import { HashAlgorithm } from '@sd-jwt/types';
import { Openid4vciClient } from '@openid4vc/openid4vci';
import { InputText, Button } from 'primevue';

const props = defineProps<{ uri: string }>();
const uri = ref('');

async function useDirectCredentialOffer() {
    await handleQuery();
}

async function handleQuery() {
    console.log('Handling query:', uri.value);
    if (uri.value === '') return;

    try {
        /*
    // generate random issuer key
    const {privateKey: issuerPrivateKey} = await jose.generateKeyPair('ES256', {extractable: true})
    console.log(await jose.exportJWK(issuerPrivateKey))

    // Générer la key pair du wallet (à faire une fois et persister en prod)
    const {privateKey, publicKey} = await jose.generateKeyPair('ES256', {extractable: true})
    const publicJwk = await jose.exportJWK(publicKey)
    if (typeof publicJwk.kty !== 'string') throw new Error("KTY not specified in JWK")

    const client = new Openid4vciClient({
      callbacks: {
        hash: async (data: Uint8Array, alg: HashAlgorithm) => {
          const algMap = {
            'sha-256': 'SHA-256',
            'sha-384': 'SHA-384',
            'sha-512': 'SHA-512',
          }
          const a = algMap[alg];
          if (!a) throw new Error(`Unkown a: ${a}`)
          const buffer = await crypto.subtle.digest(a, data)
          return new Uint8Array(buffer)
        },
        generateRandom: (length: number) => {
          return crypto.getRandomValues(new Uint8Array(length))
        },
        signJwt: async (signer, data) => {
          console.log("=== signJwt called ===")
          console.log("header:", JSON.stringify(data.header, null, 2))
          console.log("payload:", JSON.stringify(data.payload, null, 2))
          const {header, payload} = data;
          const jwt = await new jose.SignJWT(payload)
              .setProtectedHeader(header)
              .sign(privateKey);
          if (publicJwk.kty === undefined) throw new Error()
          return { jwt, signerJwk: publicJwk }
        },
        clientAuthentication: () => {
          // anonymous auth = ne rien faire
        },
      }
    });

    // 1. Résoudre l'offer
    const credentialOffer = await client.resolveCredentialOffer(uri.value)
    console.log("Credential offer:", credentialOffer)

    // 2. Metadata de l'issuer
    const issuerMetadata = await client.resolveIssuerMetadata(credentialOffer.credential_issuer)
    console.log("Issuer metadata:", issuerMetadata)

    // 3. Access token via pre-authorized code
    const {accessTokenResponse, authorizationServer} =
        await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
          credentialOffer,
          issuerMetadata,
          // txCode: '1234', // décommenter si l'issuer exige un PIN
        })
    console.log("Access token:", JSON.stringify(accessTokenResponse, null, 2))

    // 4. Récupérer le nonce
    //    En OID4VCI 1.0 Final : nonce endpoint dédié
    //    En drafts antérieurs : c_nonce dans la token response
    let cNonce = accessTokenResponse.c_nonce;
    // Draft 13: fetch nonce from dedicated endpoint if not in token response
    if (!cNonce) {
      const nonceEndpoint = issuerMetadata.credentialIssuer.nonce_endpoint;
      if (nonceEndpoint) {
        const nonceRes = await fetch(nonceEndpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessTokenResponse.access_token}` }
        });
        const nonceData = await nonceRes.json();
        cNonce = nonceData.c_nonce;
      }
    }


    console.log("Nonce:", cNonce)

    // 5. Credential request pour chaque credential_configuration_id de l'offer
    const credentialConfigurationId = credentialOffer.credential_configuration_ids[0]
    const credentialConfig = issuerMetadata.credentialIssuer
        .credential_configurations_supported[credentialConfigurationId]

    console.log("Format attendu:", credentialConfig?.format)

    const { jwt } = await client.createCredentialRequestJwtProof({
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      // TODO: how to determine supported signer?
      signer: {
        method: 'jwk',
        alg: 'ES256',
        publicJwk
      },
      nonce: cNonce,
    })
    console.log("Obtained JWT:", jwt)

    console.log("Credential config ids:", credentialOffer.credential_configuration_ids)
    const credentialResponse = await client.retrieveCredentials({
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      accessToken: `${accessTokenResponse.access_token}`,
      tokenType: "",
      issuerMetadata,
      additionalRequestPayload: {
        format: credentialConfig?.format ?? 'jwt_vc_json',
      },
      proof: {
        proof_type: 'jwt',
        jwt
      },
    })
    console.log(credentialResponse)
    /*
    const credentialEndpoint = issuerMetadata.credentialIssuer.credential_endpoint;
    console.log("Calling:", credentialEndpoint)

    const rawResponse = await fetch(credentialEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessTokenResponse.access_token}`
      },
      body: JSON.stringify({
        credential_configuration_id: credentialConfigurationId,
        proof: { proof_type: 'jwt', jwt },
        format: credentialConfig?.format ?? 'jwt_vc_json',
      })
    });
    const result = await rawResponse.json();
    console.log("Raw credential response:", JSON.stringify(result, null, 2))

     */
        /*
    const credentialResponse = await client.retrieveCredentials({
      credentialConfigurationId,
      issuerMetadata,
      additionalRequestPayload: {
        format: credentialConfig?.format ?? 'jwt_vc_json',
      },
      accessToken: accessTokenResponse.access_token,

      proof: {
        proof_type: 'jwt',
        jwt
      },
    })
    console.log("Credential response:", credentialResponse)
    // credentialResponse.credentials[0] = le credential (JWT string, SD-JWT, etc.)


   */
    } catch (e) {
        console.error(e);
    } finally {
        uri.value = '';
    }
}

//watch(uri, async () => {await handleQuery()})

onMounted(async () => {
    await handleQuery();
});
</script>

<template></template>
