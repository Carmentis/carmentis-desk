<script setup lang="ts">
import { computed } from 'vue';

/**
 * The front of a credential, drawn like a card (ISO 85.6 × 54 mm, the ratio of a credit card or an ID card):
 * the name and type of the credential, a few of its main claims, who issued it and until when it is valid.
 *
 * It wears the brand green of the application. The gradient stops are dark enough for white text to keep
 * a WCAG AA contrast in both themes.
 */
const props = withDefaults(defineProps<{
    name: string;
    /** Short label of the format, e.g. "SD-JWT VC". */
    kind: string;
    /** Technical type of the credential, e.g. its `vct`. */
    subtitle?: string;
    /** The few claims worth showing on the card. */
    claims?: { label: string; value: string }[];
    issuer?: string;
    /** Expiration, in milliseconds since the epoch. */
    expiresAt?: number | null;
    expired?: boolean;
    /** `neutral` is a grey card, for credentials of an unknown format. */
    palette?: 'auto' | 'neutral';
}>(), {
    claims: () => [],
    expiresAt: null,
    expired: false,
    palette: 'auto',
});

// Full class names so that Tailwind can detect them.
const BRAND = 'from-brand-900 to-brand-700';
const NEUTRAL = 'from-zinc-800 to-zinc-600';

const gradient = computed(() => (props.palette === 'neutral' ? NEUTRAL : BRAND));

// "12/26", like the expiry date of a bank card
const validThrough = computed(() =>
    props.expiresAt
        ? new Date(props.expiresAt).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' })
        : null,
);
</script>

<template>
    <div
        class="relative aspect-[1.586/1] min-h-[12.5rem] w-full overflow-hidden rounded-2xl bg-linear-to-br p-4 text-white shadow-card sm:p-5"
        :class="[gradient, props.expired ? 'saturate-50' : '']"
    >
        <!-- texture -->
        <span aria-hidden="true" class="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-white/10" />
        <span aria-hidden="true" class="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full bg-white/5" />

        <div class="relative flex h-full flex-col justify-between gap-2">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h3 class="line-clamp-2 break-words text-lg font-semibold leading-tight">{{ props.name }}</h3>
                    <p v-if="props.subtitle" class="mt-0.5 truncate font-mono text-xs text-white/85" :title="props.subtitle">
                        {{ props.subtitle }}
                    </p>
                </div>
                <span class="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider">
                    {{ props.kind }}
                </span>
            </div>

            <dl v-if="props.claims.length > 0" class="grid gap-x-4 gap-y-0.5 text-xs [grid-template-columns:auto_minmax(0,1fr)]">
                <template v-for="claim in props.claims" :key="claim.label">
                    <dt class="text-white/80">{{ claim.label }}</dt>
                    <dd class="truncate font-medium" :title="claim.value">{{ claim.value }}</dd>
                </template>
            </dl>

            <div class="flex items-end justify-between gap-3 text-[0.7rem] text-white/85">
                <p v-if="props.issuer" class="min-w-0 truncate">
                    Issued by <span class="font-mono">{{ props.issuer }}</span>
                </p>
                <span v-else />
                <p v-if="validThrough" class="shrink-0 text-right" :class="props.expired ? 'font-bold uppercase' : ''">
                    {{ props.expired ? 'Expired' : 'Valid thru' }} {{ validThrough }}
                </p>
            </div>
        </div>
    </div>
</template>
