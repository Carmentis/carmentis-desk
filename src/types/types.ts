import * as v from 'valibot';
import {BinaryEncoding, VirtualBlockchainType} from "@cmts-dev/carmentis-sdk-core";

export enum KeyType {
    SEED = "SEED",
    JWK = "JWK",
    /** The private key lives in a Carmentis KMS wallet and never leaves the server. */
    KMS = "KMS",
    // any other key types should be represented here
}


export const SeedableKeySchema = v.object({
    keyType: v.literal(KeyType.SEED),


    /**
     * Identifier of the private key scheme.
     */
    schemeId: v.number(),

    /**
     * The passphrase from which the seed is derived (using BIP39).
     *
     * The passphrase is optional.
     */
    passphrase: v.optional(v.string()),

    /**
     * The seed from which the private key is derived.
     */
    seed: v.string(),
});

export const JwkKeySchema = v.object({
    keyType: v.literal(KeyType.JWK),

    jwk: v.unknown(),
})

/**
 * A key held by a Carmentis KMS wallet.
 *
 * The whole object is stored in Stronghold: it holds the wallet API key and the admin key seed.
 */
export const KmsKeySchema = v.object({
    keyType: v.literal(KeyType.KMS),

    /** URL of the KMS. Copied here so the wallet keeps working if the server is removed from the settings. */
    serverUrl: v.string(),

    /** Identifier of the wallet on the KMS. */
    kmsWalletId: v.string(),

    /** Wallet API key (`wlt_…`), used to sign. The KMS returns it only once. */
    apiKey: v.string(),

    /** Plugin that generated the private key. */
    pluginId: v.string(),

    /** Label of the wallet on the KMS. */
    label: v.optional(v.string()),

    /** Public JWK of the wallet key, cached to avoid a request at each load. */
    publicJwk: v.unknown(),

    /** Admin key of the KMS wallet (one per wallet), used to sign administration requests. */
    adminKey: v.object({
        schemeId: v.number(),
        seed: v.string(),
    }),
})

export type KmsKey = v.InferOutput<typeof KmsKeySchema>


export const WalletKeySchema = v.variant("keyType", [
    SeedableKeySchema,
    JwkKeySchema,
    KmsKeySchema,
])

export type WalletKey = v.InferOutput<typeof WalletKeySchema>

/** A Carmentis KMS server configured in the settings. */
export const KmsServerSchema = v.object({
    id: v.number(),
    /** Name shown to the user. */
    name: v.string(),
    /** Base URL, without trailing slash. */
    url: v.string(),
    createdAt: v.date(),
})

export type KmsServer = v.InferOutput<typeof KmsServerSchema>


export const NetworkSchema = v.object({
    /**
     * The name of the network.
     */
    networkName: v.string(),

    /**
     * The indexer URL of the network.
     */
    indexer: v.string(),

    /**
     * The node URL of the node.
     */
    node: v.string(),
});

export type Network = v.InferOutput<typeof NetworkSchema>

export const WalletSchema = v.object({
    /**
     * The identifier of the wallet (generated).
     */
    id: v.number(),

    /**
     * Name of the wallet.
     */
    name: v.string(),

    /**
     * Creation date of the key.
     */
    createdAt: v.date(),

    /**
     * The network in which the wallet is stored.
     */
    network: NetworkSchema,

    /**
     * The identifier of the Stronghold file containing the wallet private key.
     */
    privateKeyStrongholdId: v.string(),

    /**
     * The identifier of the Stronghold file containing the actor keys seed.
     *
     * This seed is used to generate the actor keys.
     */
    actorKeysMnemonicStrongholdId: v.string(),
});

export type Wallet = v.InferOutput<typeof WalletSchema>;

export enum CredentialType {
    SDJWT = "SDJWT",
}

const SharedCredentialSchemaEntries = v.object({
    id: v.number(),
    name: v.string(),
    walletId: v.number(),
    createdAt: v.date(),
})
export const CredentialSchema = v.variant("credentialType", [
    v.object({
        credentialType: v.literal(CredentialType.SDJWT),
        sdjwt: v.string(),
        ...SharedCredentialSchemaEntries.entries,
    })
])
export type VerifiableCredential = v.InferOutput<typeof CredentialSchema>


export const OrganizationSchema = v.object({
    /**
     * Identifier of the organization.
     */
    id: v.number(),

    /**
     * Identifier of the wallet owning the organization.
     */
    walletId: v.number(),

    /**
     * Name of the organization.
     */
    name: v.string(),

    /**
     * Virtual blockchain identifier of the organization.
     *
     * Is missing when the organization is published yet.
     */
    organizationVbId: v.optional(v.string()),

    /**
     * The country of the organization.
     */
    countryCode: v.string(),

    /**
     * The city of the organization.
     */
    city: v.string(),

    /**
     * The website of the organization.
     */
    website: v.string(),

    /**
     * Creation date of the organization.
     */
    createdAt: v.date(),
})

export type Organization = v.InferOutput<typeof OrganizationSchema>

export const ApplicationSchema = v.object({

    /**
     * Identifier of the application.
     */
    id: v.number(),

    /**
     * Name of the application.
     */
    name: v.string(),

    /**
     * The virtual blockchain identifier of the application.
     */
    applicationVbId: v.optional(v.string()),

    /**
     * The identifier of the organization owning the application.
     */
    organizationId: v.number(),

    /**
     * The description of the application.
     */
    description: v.optional(v.string()),

    /**
     * The website of the application.
     */
    website: v.optional(v.string()),

    /**
     * Creation date of the application.
     */
    createdAt: v.date(),
})

export type Application = v.InferOutput<typeof ApplicationSchema>


export const NodeSchema = v.object({
    /**
     * Identifier of the node.
     */
    id: v.number(),

    /**
     * Identifier of the organization owning the node.
     */
    organizationId: v.number(),

    /**
     * The name of the node.
     */
    name: v.string(),

    /**
     * Virtual blockchain identifier of the node.
     *
     * Is missing when the node is published yet.
     */
    nodeVbId: v.optional(v.string()),

    /**
     * The endpoint of the node.
     */
    nodeEndpoint: v.optional(v.string()),


    /**
     * The RPC endpoint of the node.
     */
    rpcEndpoint: v.optional(v.string()),

    /**
     * Creation date of the node.
     */
    createdAt: v.date(),
})

export type Node = v.InferOutput<typeof NodeSchema>


export const ApplicationLedgerSchema = v.object({
    /**
     * Identifier of the application ledger.
     */
    id: v.number(),

    /**
     * Virtual blockchain identifier of the application ledger.
     *
     * The virtual blockchain identifier can be undefined
     * when the application ledger is not published yet.
     */
    applicationLedgerVbId: v.optional(v.string()),

    /**
     * Identifier of the application owning the application ledger.
     */
    applicationId: v.optional(v.number()),
})
export type ApplicationLedger = v.InferOutput<typeof ApplicationLedgerSchema>



export const SubmittedMicroblockSchema = v.object({
    /**
     * Identifier of the submitted microblock.
     */
    id: v.number(),

    /**
     * Height of the submitted microblock.
     */
    height: v.number(),

    /**
     * The identifier of the virtual blockchain owning the submitted microblock.
     *
     * Can be undefined.
     */
    vbId: v.optional(v.string()),

    /**
     * Type of the virtual blockchain.
     */
    vbType: v.enum(VirtualBlockchainType),

    /**
     * Hash of the submitted microblock.
     */
    microblockHash: v.string(),

    /**
     * Encoded microblock.
     */
    encodedMicroblock: v.string(),

    /**
     * Encoding of the submitted microblock.
     */
    microblockEncoding: v.enum(BinaryEncoding),


    /**
     * Submitted at.
     */
    submittedAt: v.date(),

    /**
     * Node having received the submitted microblock.
     */
    nodeEndpoint: v.string(),
});

export type SubmittedMicroblock = v.InferOutput<typeof SubmittedMicroblockSchema>


/**
 * Desk application state.
 *
 * Should only be contained as a single instance!
 */
export const DeskStateSchema = v.object({
    id: v.literal(0),
    onboarded: v.boolean(),

    /**
     * A boolean indicating whether the user is a developer.
     *
     * A developer should have access to more features like managing applications.
     */
    isDeveloper: v.optional(v.boolean(), false),

    /**
     * A boolean indicating whether the user is a node holder.
     *
     * A node holder should have access to the node management features.
     */
    isNodeHolder: v.optional(v.boolean(), false),
})

export type DeskState = v.InferOutput<typeof DeskStateSchema>;