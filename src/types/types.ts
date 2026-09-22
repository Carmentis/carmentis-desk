import * as v from 'valibot';
import {BinaryEncoding, VirtualBlockchainType} from "@cmts-dev/carmentis-sdk-core";

export enum KeyType {
    SEED = "SEED",
    JWK = "JWK",
    // any other key types should be represented here
}

const SharedKeyEntries = v.object({
    id: v.number(),
})

export const SeedableKeySchema = v.object({
    ...SharedKeyEntries.entries,
    keyType: v.literal(KeyType.SEED),


    /**
     * Identifier of the private key scheme.
     */
    schemeId: v.number(),

    /**
     * The stronghold identifier in which the seed is stored.
     */
    strongholdId: v.string(),
});

export const JwkKeySchema = v.object({
    ...SharedKeyEntries.entries,
    keyType: v.literal(KeyType.JWK),

    /**
     * The stronghold identifier in which the (encoded JWK) is stored.
     */
    strongholdId: v.string(),
})


export const KeySchema = v.variant("keyType", [
    SeedableKeySchema,
    JwkKeySchema,
])

export type Key = v.InferOutput<typeof KeySchema>


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
     * The private key of the wallet.
     */
    privateKey: KeySchema,
});

export type Wallet = v.InferOutput<typeof WalletSchema>;

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
     * The virtual blockchain identifier of the application.
     */
    applicationVbId: v.string(),

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
    nodeEndpoint: v.string(),

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
})

export type DeskState = v.InferOutput<typeof DeskStateSchema>;