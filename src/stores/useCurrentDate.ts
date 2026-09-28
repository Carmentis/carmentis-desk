import {onMounted, onUnmounted, ref} from "vue";

export const useCurrentDate = () => {
    const now = ref(new Date())
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
        interval = setInterval(() => {
            now.value = new Date()
        }, 1000)
    })

    onUnmounted(() => {
        clearInterval(interval)
    })

    return now
}