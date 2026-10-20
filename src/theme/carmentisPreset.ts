import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Aura with the Carmentis brand green.
 * The light primary is emerald-700 so that white button labels reach WCAG AA (5.5:1);
 * the dark primary is emerald-400 with dark labels.
 */
export const CarmentisPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{emerald.50}',
            100: '{emerald.100}',
            200: '{emerald.200}',
            300: '{emerald.300}',
            400: '{emerald.400}',
            500: '{emerald.500}',
            600: '{emerald.600}',
            700: '{emerald.700}',
            800: '{emerald.800}',
            900: '{emerald.900}',
            950: '{emerald.950}',
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{emerald.700}',
                    contrastColor: '#ffffff',
                    hoverColor: '{emerald.800}',
                    activeColor: '{emerald.900}',
                },
            },
            dark: {
                primary: {
                    color: '{emerald.400}',
                    contrastColor: '{surface.900}',
                    hoverColor: '{emerald.300}',
                    activeColor: '{emerald.200}',
                },
            },
        },
    },
});
