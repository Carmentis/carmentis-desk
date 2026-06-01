import { ref, watch } from 'vue';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'carmentis_theme';
const currentTheme = ref<Theme>('light');

export function useTheme() {
    const initTheme = () => {
        const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
        if (savedTheme === 'light' || savedTheme === 'dark') {
            currentTheme.value = savedTheme;
            applyTheme(savedTheme);
        }
    };

    const applyTheme = (theme: Theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const toggleTheme = () => {
        const newTheme: Theme = currentTheme.value === 'light' ? 'dark' : 'light';
        currentTheme.value = newTheme;
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    };

    watch(currentTheme, (newTheme) => {
        applyTheme(newTheme);
    });

    return {
        currentTheme,
        toggleTheme,
        initTheme,
    };
}
