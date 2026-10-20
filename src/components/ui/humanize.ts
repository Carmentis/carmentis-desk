/** Words that read better in capitals than as "Id" or "Url". */
const ACRONYMS = new Set(['id', 'url', 'uri', 'api', 'jwt', 'did', 'vc', 'ip', 'json', 'uuid', 'jwk', 'html', 'http', 'https']);

/**
 * Turns a technical key into a label: `firstName` → "First name", `user_id` → "User ID",
 * `Content-Type` → "Content type".
 */
export function humanizeKey(key: string): string {
    const words = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/[_\-.\s]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) => word.toLowerCase());
    if (words.length === 0) return key;

    const formatted = words.map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : word));
    const first = formatted[0];
    formatted[0] = ACRONYMS.has(words[0]) ? first : first.charAt(0).toUpperCase() + first.slice(1);
    return formatted.join(' ');
}

export interface ScalarView {
    text: string;
    /** Rendered in a muted style (nothing, or an empty value). */
    muted: boolean;
    /** The original value, when the displayed text is a reformatting of it. */
    raw?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

/** How a non-container value is displayed. */
export function describeScalar(value: unknown): ScalarView {
    if (value === null || value === undefined) return { text: '—', muted: true };
    if (typeof value === 'boolean') return { text: value ? 'Yes' : 'No', muted: false };
    if (typeof value === 'number' || typeof value === 'bigint') return { text: String(value), muted: false };
    if (typeof value === 'string') {
        if (value === '') return { text: '(empty)', muted: true };
        const isDate = DATE_ONLY.test(value);
        if (isDate || DATE_TIME.test(value)) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return {
                    text: isDate ? date.toLocaleDateString() : date.toLocaleString(),
                    muted: false,
                    raw: value,
                };
            }
        }
        return { text: value, muted: false };
    }
    return { text: String(value), muted: false };
}

export const isContainer = (value: unknown): value is Record<string, unknown> | unknown[] =>
    typeof value === 'object' && value !== null;

/** A value shown on the same line as its label: not a container, or an empty one. */
export const isInline = (value: unknown): boolean =>
    !isContainer(value) || (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0);

/** Shortens a long identifier in the middle: `did:jwk:eyJhbGciOi…Y3Jlc3M`. */
export function truncateMiddle(value: string, head = 14, tail = 6): string {
    return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}
