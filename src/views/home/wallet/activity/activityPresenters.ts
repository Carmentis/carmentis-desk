import type {RouteLocationRaw} from 'vue-router';
import type {ActivityEvent, ActivityKind} from '../../../../types/activity.ts';
import type {StatusTone} from '../../../../components/ui/types.ts';

/** A labelled value of the details of an event. */
export interface ActivityDetail {
    label: string;
    value: string;
    /** Long technical values (keys) are truncated and copyable instead of printed in full. */
    copyable?: boolean;
    /** `value` is pretty-printed JSON, shown in a collapsible block with a copy action. */
    json?: boolean;
}

/**
 * How an event kind is shown. The text (title, description) comes from the event itself:
 * a presenter only supplies what is not text. `satisfies` below makes a missing kind a compile error.
 */
export interface ActivityPresenter<K extends ActivityKind = ActivityKind> {
    /** primeicons class. */
    icon: string;
    tone: StatusTone;
    /** Short name of the kind, shown as a label next to the time (the tone is never the only cue). */
    label: string;
    /** Kind-specific data shown in the details of the event, in reading order. Empty values are skipped. */
    details?: (event: Extract<ActivityEvent, {kind: K}>) => (ActivityDetail | undefined)[];
    /** Where the event points to, offered as an action in its details. */
    route?: (event: Extract<ActivityEvent, {kind: K}>, walletId: number) => RouteLocationRaw;
    /** Label of the action leading to {@link route}. */
    routeLabel?: string;
}

const nodeRoute = (e: {organizationId: number; nodeId: number}, walletId: number): RouteLocationRaw => ({
    name: 'node-detail',
    params: {walletId, orgId: e.organizationId, nodeId: e.nodeId},
});

export const activityPresenters = {
    'organization-published': {
        icon: 'pi-building', tone: 'success', label: 'Organization',
        details: (e) => [{label: 'Organization', value: e.organizationName}],
        route: (e, walletId) => ({name: 'organization-detail', params: {walletId, orgId: e.organizationId}}),
        routeLabel: 'Open organization',
    },
    'application-published': {
        icon: 'pi-th-large', tone: 'success', label: 'Application',
        details: (e) => [{label: 'Application', value: e.applicationName}],
        route: (e, walletId) => ({
            name: 'application-detail',
            params: {walletId, orgId: e.organizationId, appId: e.applicationId},
        }),
        routeLabel: 'Open application',
    },
    'node-claimed': {
        icon: 'pi-server', tone: 'success', label: 'Node',
        details: (e) => [{label: 'Node', value: e.nodeName}],
        route: nodeRoute, routeLabel: 'Open node',
    },
    'node-staked': {
        icon: 'pi-lock', tone: 'info', label: 'Staking',
        details: (e) => [{label: 'Node', value: e.nodeName}, {label: 'Amount', value: e.amount}],
        route: nodeRoute, routeLabel: 'Open node',
    },
    'node-unstaked': {
        icon: 'pi-lock-open', tone: 'info', label: 'Staking',
        details: (e) => [{label: 'Node', value: e.nodeName}, {label: 'Amount', value: e.amount}],
        route: nodeRoute, routeLabel: 'Open node',
    },
    'token-transferred': {
        icon: 'pi-send', tone: 'info', label: 'Transfer',
        details: (e) => [
            {label: 'Amount', value: e.amount},
            {label: 'Recipient public key', value: e.recipientPublicKey, copyable: true},
        ],
    },
    'credential-presented': {
        icon: 'pi-id-card', tone: 'warning', label: 'Presentation',
        details: (e) => [
            {label: 'Credential', value: e.credentialName},
            e.verifier ? {label: 'Shared with', value: e.verifier} : undefined,
        ],
    },
    'json-signed': {
        icon: 'pi-pencil', tone: 'warning', label: 'Signature',
        details: (e) => [
            e.requester ? {label: 'Requested by', value: e.requester} : undefined,
            e.purpose ? {label: 'Purpose', value: e.purpose} : undefined,
            e.signature ? {label: 'Signature', value: JSON.stringify(e.signature, null, 2), json: true} : undefined,
        ],
    },
    'authenticated': {
        icon: 'pi-sign-in', tone: 'neutral', label: 'Sign-in',
        details: (e) => [e.requester ? {label: 'Signed in to', value: e.requester} : undefined],
    },
} satisfies {[K in ActivityKind]: ActivityPresenter<K>};

/** Shown for activities recorded by a newer version of Desk, or with a payload that cannot be read. */
export const unknownActivityPresenter: ActivityPresenter = {
    icon: 'pi-question-circle', tone: 'neutral', label: 'Activity',
};

export function presenterOf(event: ActivityEvent): ActivityPresenter {
    return activityPresenters[event.kind] as ActivityPresenter;
}

export function detailsOf(event: ActivityEvent): ActivityDetail[] {
    return (presenterOf(event).details?.(event as never) ?? []).filter((d): d is ActivityDetail => !!d?.value);
}

/** Everything a user may type to find an event: its text, its kind and its details. */
export function searchTextOf(event: ActivityEvent): string {
    return [event.title, event.description, presenterOf(event).label, ...detailsOf(event).map((d) => d.value)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}
