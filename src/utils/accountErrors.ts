/**
 * Whether an error only means that the wallet has no account on the blockchain yet
 * (e.g. "[0] Remote error: unknown account key hash"), as opposed to a real failure
 * such as an unreachable node or indexer.
 */
export function isUnknownAccountError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    return /unknown account|account not found|account does not exist/i.test(message);
}
