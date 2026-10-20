import {
    ApplicationDescriptionSection,
    AccountVb,
    CMTSToken,
    CryptoEncoderFactory,
    Hash,
    Microblock,
    OrganizationDescriptionSection,
    PrivateSignatureKey,
    Provider,
    PublicSignatureKey,
    SectionType,
    SignatureSchemeId,
    ValidatorNodeCometbftPublicKeyDeclarationSection,
    ValidatorNodeCreationSection,
    ValidatorNodeRpcEndpointSection,
    VirtualBlockchainType,
} from '@cmts-dev/carmentis-sdk-core';
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {createIndexerClient} from "../api/indexer/client.ts";

/**
 * On-chain operations.
 *
 * Every function in this module is stateless: everything that depends on the acting wallet
 * (signing key, provider, indexer, account id) is provided through an explicit {@link OnChainContext}.
 * The context is created by the caller from the wallet store (see `createOnChainContext`), so an
 * operation can never be signed or paid by another wallet than the one the caller intended.
 */

const MAXIMAL_ALLOWED_TOKEN_TRANSFER = 1000000000;

export interface OnChainContext {
    walletId: number;
    provider: Provider;
    indexer: ReturnType<typeof createIndexerClient>;
    sk: PrivateSignatureKey;
    pk: PublicSignatureKey;
    /** Account id of the wallet, resolved from `pk` when the context is created. */
    accountId: Uint8Array;
}

export interface PublishOrganizationParams {
    orgId: number;
}

export interface ClaimNodeParams {
    orgId: number;
    nodeId: number;
}

export interface StakeOnNodeParams {
    orgId: number;
    nodeId: number;
    amount: CMTSToken;
}

export interface UnstakeFromNodeParams {
    orgId: number;
    nodeId: number;
    amount: CMTSToken;
}

export interface PublishApplicationParams {
    orgId: number;
    appId: number;
    name: string;
    description: string;
    website?: string;
}

export interface TransferTokensParams {
    recipientPublicKey: string;
    amount: CMTSToken;
}

export interface PublishCustomJsonParams {
    orgId: number;
    json: Record<string, unknown>;
}

async function updateGasInMicroblock(provider: Provider, mb: Microblock, usedSigSchemeId: SignatureSchemeId) {
    const gas = await provider.computeMicroblockGas(mb, { signatureSchemeId: usedSigSchemeId });
    mb.setGasPrice(CMTSToken.createMilliToken(1));
    mb.setGas(gas);
}

async function sealAndPublish(ctx: OnChainContext, mb: Microblock) {
    await updateGasInMicroblock(ctx.provider, mb, ctx.sk.getSignatureSchemeId());
    await mb.seal(ctx.sk, { feesPayerAccount: ctx.accountId });
    return ctx.provider.publishMicroblock(mb);
}

async function getPublishedOrganization(orgId: number, errorIfNotPublished: string) {
    const organization = await DeskDatabase.getOrganizationById(orgId);
    if (!organization) throw new Error(`Organization with id ${orgId} not found`);
    if (!organization.organizationVbId) throw new Error(errorIfNotPublished);
    return { organization, organizationVbId: organization.organizationVbId };
}

async function getNodeWithEndpoints(nodeId: number) {
    const node = await DeskDatabase.getNodeById(nodeId);
    if (!node) throw new Error(`Node with id ${nodeId} not found`);
    if (!node.nodeEndpoint) throw new Error(`Node with id ${nodeId} does not have an endpoint`);
    if (!node.rpcEndpoint) throw new Error(`Node with id ${nodeId} does not have an RPC endpoint`);
    return { node, nodeEndpoint: node.nodeEndpoint, rpcEndpoint: node.rpcEndpoint };
}

/**
 * Publishes an organization on-chain.
 * Creates a new virtual blockchain for the organization (or updates it) and stores the VB ID.
 */
export async function publishOrganization(ctx: OnChainContext, params: PublishOrganizationParams) {
    const { orgId } = params;
    const organization = await DeskDatabase.getOrganizationById(orgId);
    if (!organization) throw new Error(`Organization with id ${orgId} not found`);

    const orgDescSection: OrganizationDescriptionSection = {
        type: SectionType.ORG_DESCRIPTION,
        city: organization.city,
        name: organization.name,
        website: organization.website,
        countryCode: organization.countryCode,
    };

    if (organization.organizationVbId) {
        const orgVB = await ctx.provider.loadOrganizationVirtualBlockchain(Hash.from(organization.organizationVbId));
        const mb = await orgVB.createMicroblock();
        mb.addSection(orgDescSection);
        await sealAndPublish(ctx, mb);
    } else {
        const mb = Microblock.createGenesisOrganizationMicroblock();
        mb.addSections([
            { type: SectionType.ORG_CREATION, accountId: ctx.accountId },
            orgDescSection,
        ]);
        await sealAndPublish(ctx, mb);
        organization.organizationVbId = mb.getHash().encode();
    }

    await DeskDatabase.updateOrganization(orgId, organization);
    return organization;
}

/**
 * Claims a node for an organization on-chain.
 * Creates a validator node virtual blockchain and associates it with the organization.
 */
export async function claimNode(ctx: OnChainContext, params: ClaimNodeParams) {
    const { orgId, nodeId } = params;
    const { organizationVbId } = await getPublishedOrganization(
        orgId,
        'Organization must be published before claiming nodes',
    );
    const { node, nodeEndpoint, rpcEndpoint } = await getNodeWithEndpoints(nodeId);

    const nodeStatus = await ctx.provider.getNodeStatus(nodeEndpoint);
    const { type: cometPublicKeyType, value: cometPublicKey } = nodeStatus.result.validator_info.pub_key;

    const vnCreationSection: ValidatorNodeCreationSection = {
        type: SectionType.VN_CREATION,
        organizationId: Hash.from(organizationVbId).toBytes(),
    };
    const vnRpcEndpointDeclarationSection: ValidatorNodeRpcEndpointSection = {
        type: SectionType.VN_RPC_ENDPOINT,
        rpcEndpoint,
    };
    const vnCometBFTPublicKeyDeclarationSection: ValidatorNodeCometbftPublicKeyDeclarationSection = {
        type: SectionType.VN_COMETBFT_PUBLIC_KEY_DECLARATION,
        cometPublicKeyType,
        cometPublicKey,
    };

    const mb = Microblock.createGenesisValidatorNodeMicroblock();
    mb.addSections([vnCreationSection, vnRpcEndpointDeclarationSection, vnCometBFTPublicKeyDeclarationSection]);
    const microblockHash = await sealAndPublish(ctx, mb);

    node.nodeVbId = microblockHash.encode();
    await DeskDatabase.updateNode(nodeId, node);
    return { node, microblockHash };
}

async function findNodeAddress(ctx: OnChainContext, rpcEndpoint: string) {
    const nodeStatus = await ctx.provider.getNodeStatus(rpcEndpoint);
    const cometbftPublicKey = nodeStatus.result.validator_info.pub_key.value;
    const nodeResult = await ctx.indexer.getValidatorNodes({ public_key: cometbftPublicKey });
    if (nodeResult.items.length === 0) {
        throw new Error(`The node must be declared before staking: No node found with public key ${cometbftPublicKey}`);
    }
    return Hash.from(nodeResult.items[0].virtualBlockchainId).toBytes();
}

/**
 * Stakes tokens on a node.
 * Creates a microblock with an ACCOUNT_STAKE section to lock tokens for the node.
 */
export async function stakeOnNode(ctx: OnChainContext, params: StakeOnNodeParams) {
    const { orgId, nodeId, amount } = params;
    await getPublishedOrganization(orgId, 'Organization must be published before staking on nodes');
    const { node, rpcEndpoint } = await getNodeWithEndpoints(nodeId);
    const nodeAddress = await findNodeAddress(ctx, rpcEndpoint);

    const accountVb = await ctx.provider.loadAccountVirtualBlockchain(Hash.from(ctx.accountId));
    const mb = await accountVb.createMicroblock();
    mb.addSection({
        type: SectionType.ACCOUNT_STAKE,
        amount: amount.getAmountAsAtomic(),
        objectType: VirtualBlockchainType.NODE_VIRTUAL_BLOCKCHAIN,
        objectIdentifier: nodeAddress,
    });
    const microblockHash = await sealAndPublish(ctx, mb);
    return { node, microblockHash };
}

/**
 * Unstakes tokens from a node.
 * Creates a microblock with an ACCOUNT_UNSTAKE section to unlock tokens from the node.
 */
export async function unstakeFromNode(ctx: OnChainContext, params: UnstakeFromNodeParams) {
    const { orgId, nodeId, amount } = params;
    await getPublishedOrganization(orgId, 'Organization must be published before unstaking from nodes');
    const { node, rpcEndpoint } = await getNodeWithEndpoints(nodeId);
    const nodeAddress = await findNodeAddress(ctx, rpcEndpoint);

    const accountVb = await ctx.provider.loadAccountVirtualBlockchain(Hash.from(ctx.accountId));
    const mb = await accountVb.createMicroblock();
    mb.addSection({
        type: SectionType.ACCOUNT_UNSTAKE,
        amount: amount.getAmountAsAtomic(),
        objectType: VirtualBlockchainType.NODE_VIRTUAL_BLOCKCHAIN,
        objectIdentifier: nodeAddress,
    });
    const microblockHash = await sealAndPublish(ctx, mb);
    return { node, microblockHash };
}

/**
 * Publishes an application on-chain.
 * Creates a new application virtual blockchain or updates an existing one.
 */
export async function publishApplication(ctx: OnChainContext, params: PublishApplicationParams) {
    const { orgId, appId, name, description, website } = params;
    const { organizationVbId } = await getPublishedOrganization(
        orgId,
        'Organization must be published before publishing applications',
    );
    const application = await DeskDatabase.getApplicationById(appId);
    if (!application) throw new Error(`Application with id ${appId} not found in organization ${orgId}`);

    const appDescSection: ApplicationDescriptionSection = {
        type: SectionType.APP_DESCRIPTION,
        name,
        homepageUrl: website || '',
        description,
        logoUrl: '',
    };

    let applicationVbId: string;
    if (application.applicationVbId) {
        const appVb = await ctx.provider.loadApplicationVirtualBlockchain(Hash.from(application.applicationVbId));
        const mb = await appVb.createMicroblock();
        mb.addSections([appDescSection]);
        await sealAndPublish(ctx, mb);
        applicationVbId = application.applicationVbId;
    } else {
        const mb = Microblock.createGenesisApplicationMicroblock();
        mb.setHeight(1);
        mb.addSections([
            {
                type: SectionType.APP_CREATION,
                organizationId: Hash.from(organizationVbId).toBytes(),
            },
            appDescSection,
        ]);
        await sealAndPublish(ctx, mb);
        applicationVbId = mb.getHash().encode();
    }

    application.applicationVbId = applicationVbId;
    application.name = name;
    await DeskDatabase.updateApplication(appId, application);
}

/**
 * Transfers tokens to a recipient's account, creating the account when it does not exist yet.
 * @returns whether a new account has been created for the recipient
 */
export async function transferTokens(ctx: OnChainContext, params: TransferTokensParams): Promise<{ createdAccount: boolean }> {
    const { recipientPublicKey, amount } = params;

    const transferredAmount = amount.getAmountAsAtomic();
    const isNegativeOrZero = transferredAmount <= 0;
    const isAboveAllowedMax = MAXIMAL_ALLOWED_TOKEN_TRANSFER < amount.getAmount();
    if (isNegativeOrZero || isAboveAllowedMax) {
        throw new Error(
            `Invalid amount of token transfer: Should be between zero (excluded) and ${MAXIMAL_ALLOWED_TOKEN_TRANSFER}`,
        );
    }

    const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    const recipientPk = await encoder.decodePublicKey(recipientPublicKey);

    let recipientAccountHash: Hash | undefined;
    try {
        recipientAccountHash = Hash.from(await ctx.provider.getAccountIdByPublicKey(recipientPk));
    } catch {
        // the recipient does not have an account yet
    }

    if (recipientAccountHash) {
        await creditExistingAccount(ctx, recipientAccountHash, amount);
        return { createdAccount: false };
    }
    await createAndCreditNewAccount(ctx, recipientPk, amount);
    return { createdAccount: true };
}

async function createAndCreditNewAccount(ctx: OnChainContext, recipientPublicKey: PublicSignatureKey, tokenAmount: CMTSToken) {
    const mb = await AccountVb.createAccountCreationMicroblock(
        recipientPublicKey,
        tokenAmount,
        ctx.accountId,
    );
    await sealAndPublish(ctx, mb);
    return mb.getHash();
}

async function creditExistingAccount(ctx: OnChainContext, receiverAccountHash: Hash, tokenAmount: CMTSToken) {
    const senderAccount = await ctx.provider.loadAccountVirtualBlockchain(Hash.from(ctx.accountId));
    const mb = await senderAccount.createMicroblock();
    mb.addSection({
        type: SectionType.ACCOUNT_TRANSFER,
        amount: tokenAmount.getAmountAsAtomic(),
        publicReference: '',
        privateReference: '',
        account: receiverAccountHash.toBytes(),
    });
    await sealAndPublish(ctx, mb);
    return mb.getHash();
}

/**
 * Publishes a custom JSON section on the organization's virtual blockchain.
 */
export async function publishCustomJson(ctx: OnChainContext, params: PublishCustomJsonParams) {
    const { orgId, json } = params;
    const { organizationVbId } = await getPublishedOrganization(orgId, 'Organization is not published on-chain');

    const orgVB = await ctx.provider.loadOrganizationVirtualBlockchain(Hash.from(organizationVbId));
    const mb = await orgVB.createMicroblock();
    mb.addSection({ type: SectionType.CUSTOM, ...json });
    await sealAndPublish(ctx, mb);
}
