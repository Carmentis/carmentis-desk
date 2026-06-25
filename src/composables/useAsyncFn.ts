import { ref } from 'vue'

export function useAsyncFn<T = any>(asyncFn: (...args: any[]) => Promise<T>) {
    const isLoading = ref(false)
    const error = ref<Error | null>(null)
    const data = ref<T | null>(null)

    const execute = async (...args: any[]) => {
        isLoading.value = true
        error.value = null

        try {
            const result: T = await asyncFn(...args)
            data.value = result
            return result
        } catch (err) {
            if (err instanceof Error) {
                error.value = err
            }
        } finally {
            isLoading.value = false
        }
    }

    return {
        execute,
        isLoading,
        error,
        data
    }
}