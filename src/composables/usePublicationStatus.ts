import { computed, type Ref } from 'vue';
import type { StatusTone } from '../components/ui/types.ts';

export interface PublicationStatus {
    tone: StatusTone;
    label: string;
    icon: string;
    hint: string;
}

/**
 * Publication status of an on-chain entity (organization, application…), always shown as an icon
 * and a text. `noun` is only used in the explanatory sentence.
 */
export function usePublicationStatus(
    noun: string,
    state: { hasVbId: Ref<boolean>; isChecking: Ref<boolean>; isFound: Ref<boolean> },
) {
    return computed<PublicationStatus>(() => {
        if (!state.hasVbId.value) {
            return { tone: 'warning', label: 'Draft', icon: 'pi-file-edit', hint: `This ${noun} is not published on the blockchain yet.` };
        }
        if (state.isChecking.value) {
            return { tone: 'neutral', label: 'Loading', icon: 'pi-spin pi-spinner', hint: 'Searching the blockchain…' };
        }
        if (state.isFound.value) {
            return { tone: 'success', label: 'Published', icon: 'pi-check-circle', hint: `This ${noun} is published on the blockchain.` };
        }
        return {
            tone: 'warning',
            label: 'Not found on-chain',
            icon: 'pi-exclamation-triangle',
            hint: `This ${noun} was not found on the blockchain. This may be due to network transaction processing delays.`,
        };
    });
}
