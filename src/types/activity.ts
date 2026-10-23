import * as v from 'valibot';

/**
 * Fields shared by every event. They are written when the event is recorded and persisted,
 * so the history keeps reading the same even if an entity is renamed afterwards.
 */
const eventBase = {
    /** Main line shown in the activity list, in plain language. */
    title: v.string(),
    /** Optional second line giving context (who asked, which amount...). */
    description: v.optional(v.string()),
};

/**
 * What happened. This is a variant discriminated by `kind`: to support a new event, add a variant here,
 * a factory in {@link activityEvents} and a presenter in `views/home/wallet/activity/activityPresenters.ts`.
 *
 * Payloads must never carry secrets (keys, JWTs, credential claims): only names, ids and amounts.
 */
export const ActivityEventSchema = v.variant('kind', [
    v.object({ ...eventBase, kind: v.literal('organization-published'), organizationId: v.number(), organizationName: v.string() }),
    v.object({ ...eventBase, kind: v.literal('application-published'), organizationId: v.number(), applicationId: v.number(), applicationName: v.string() }),
    v.object({ ...eventBase, kind: v.literal('node-claimed'), organizationId: v.number(), nodeId: v.number(), nodeName: v.string() }),
    v.object({ ...eventBase, kind: v.literal('node-staked'), organizationId: v.number(), nodeId: v.number(), nodeName: v.string(), amount: v.string() }),
    v.object({ ...eventBase, kind: v.literal('node-unstaked'), organizationId: v.number(), nodeId: v.number(), nodeName: v.string(), amount: v.string() }),
    v.object({ ...eventBase, kind: v.literal('token-transferred'), amount: v.string(), recipientPublicKey: v.string() }),
    v.object({ ...eventBase, kind: v.literal('credential-presented'), credentialName: v.string(), verifier: v.optional(v.string()) }),
    v.object({ ...eventBase, kind: v.literal('credential-received'), credentialName: v.string(), issuer: v.optional(v.string()) }),
    v.object({ ...eventBase, kind: v.literal('json-signed'), requester: v.optional(v.string()), purpose: v.optional(v.string()), signature: v.optional(v.record(v.string(), v.unknown())) }),
    v.object({ ...eventBase, kind: v.literal('authenticated'), requester: v.optional(v.string()) }),
]);
export type ActivityEvent = v.InferOutput<typeof ActivityEventSchema>;
export type ActivityKind = ActivityEvent['kind'];

/**
 * A recorded activity. `walletId` is optional: an activity with a wallet belongs to that wallet's history,
 * one without is scoped to the whole Desk.
 */
export interface Activity {
    id: number;
    walletId?: number;
    date: Date;
    /** Stored as is; may not match the current schema (older/newer version), so validate on read. */
    event: unknown;
}

/** An activity whose payload is valid, or `null` event when it is not understood by this version. */
export interface ReadActivity {
    id: number;
    walletId?: number;
    date: Date;
    event: ActivityEvent | null;
}

export function readActivity(activity: Activity): ReadActivity {
    const parsed = v.safeParse(ActivityEventSchema, activity.event);
    return { ...activity, event: parsed.success ? parsed.output : null };
}

/** Typed builders: titles and descriptions are written once per kind, not at every call site. */
export const activityEvents = {
    organizationPublished: (p: { organizationId: number; organizationName: string }): ActivityEvent => ({
        kind: 'organization-published',
        title: `Published organization "${p.organizationName}"`,
        ...p,
    }),
    applicationPublished: (p: { organizationId: number; applicationId: number; applicationName: string }): ActivityEvent => ({
        kind: 'application-published',
        title: `Published application "${p.applicationName}"`,
        ...p,
    }),
    nodeClaimed: (p: { organizationId: number; nodeId: number; nodeName: string }): ActivityEvent => ({
        kind: 'node-claimed',
        title: `Claimed node "${p.nodeName}"`,
        ...p,
    }),
    nodeStaked: (p: { organizationId: number; nodeId: number; nodeName: string; amount: string }): ActivityEvent => ({
        kind: 'node-staked',
        title: `Staked on node "${p.nodeName}"`,
        description: p.amount,
        ...p,
    }),
    nodeUnstaked: (p: { organizationId: number; nodeId: number; nodeName: string; amount: string }): ActivityEvent => ({
        kind: 'node-unstaked',
        title: `Unstaked from node "${p.nodeName}"`,
        description: p.amount,
        ...p,
    }),
    tokenTransferred: (p: { amount: string; recipientPublicKey: string }): ActivityEvent => ({
        kind: 'token-transferred',
        title: 'Sent tokens',
        description: p.amount,
        ...p,
    }),
    credentialPresented: (p: { credentialName: string; verifier?: string }): ActivityEvent => ({
        kind: 'credential-presented',
        title: `Presented "${p.credentialName}"`,
        description: p.verifier ? `Requested by ${p.verifier}` : undefined,
        ...p,
    }),
    credentialReceived: (p: { credentialName: string; issuer?: string }): ActivityEvent => ({
        kind: 'credential-received',
        title: `Received "${p.credentialName}"`,
        description: p.issuer ? `Issued by ${p.issuer}` : undefined,
        ...p,
    }),
    jsonSigned: (p: { requester?: string; purpose?: string; signature?: Record<string, unknown> }): ActivityEvent => ({
        kind: 'json-signed',
        title: 'Signed data',
        description: p.purpose ?? (p.requester ? `Requested by ${p.requester}` : undefined),
        requester: p.requester,
        purpose: p.purpose,
        signature: p.signature,
    }),
    authenticated: (p: { requester?: string }): ActivityEvent => ({
        kind: 'authenticated',
        title: p.requester ? `Signed in to ${p.requester}` : 'Signed in',
        requester: p.requester,
    }),
};
