import { ref, watch } from 'vue';
import { useStorageStore } from '../stores/storage';

export type Theme = 'light' | 'dark';

const currentTheme = ref<Theme>('light');

export function useTheme() {
    const storageStore = useStorageStore();

    // Initialize theme from localStorage
    const initTheme = async () => {
        const storage = await storageStore.getStorage();
        const savedTheme = await storage.get<Theme>('theme');
        if (savedTheme) {
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

    const toggleTheme = async () => {
        const newTheme: Theme =
            currentTheme.value === 'light' ? 'dark' : 'light';
        currentTheme.value = newTheme;
        applyTheme(newTheme);

        const storage = await storageStore.getStorage();
        await storage.set('theme', newTheme);
    };

    // Watch for theme changes
    watch(currentTheme, (newTheme) => {
        applyTheme(newTheme);
    });

    return {
        currentTheme,
        toggleTheme,
        initTheme,
    };
}
