🟢 STANDARDS VUE.JS 3 (PRIMEVUE + VUEUSE + PINIA)
Ce document sert de référence pour maintenir la cohérence du code dans l'application.

🏗️ 1. ARCHITECTURE ET SCRIPT SETUP
Composition API : Utiliser exclusivement <script setup lang="ts">.

Typage des Props : Utiliser les types TypeScript avec defineProps<{ ... }>().

Emits : Déclarer les événements avec defineEmits<{ (e: 'update', value: string): void }>().

Composables : Extraire toute logique dépassant 20 lignes dans src/composables/.

🎨 2. UI & DESIGN SYSTEM (PRIMEVUE)
Composants : Utiliser systématiquement les composants p- (ex: <p-button>, <p-datatable>).

Layout : Privilégier PrimeFlex ou les utilitaires CSS de PrimeVue pour le positionnement (flex, grid, m-4).

Customisation : Utiliser l'attribut pt (Pass-Through) au lieu de ::v-deep pour modifier les styles internes de PrimeVue.

Iconographie : Utiliser exclusivement la bibliothèque primeicons.

🍍 3. STATE MANAGEMENT (PINIA)
Setup Stores : Préférer la syntaxe fonctionnelle (Setup Store).

Réactivité : Utiliser storeToRefs(store) lors de la déstructuration dans les composants pour ne pas briser le lien réactif.

Actions : Garder les actions asynchrones (appels API) à l'intérieur des stores pour centraliser la logique de données.

🛠️ 4. UTILITAIRES (VUEUSE)
Réflexe VueUse : Avant de créer un onMounted ou un addEventListener, vérifier si une fonction existe sur VueUse.

Indispensables :

useVModel : Pour synchroniser les props v-model.

useStorage : Pour la persistance automatique (LocalStorage).

useAsyncState : Pour gérer les états de chargement des API.

⚡ 5. PERFORMANCE ET CONVENTIONS
v-for : Toujours utiliser une :key unique (ID).

ShallowRef : Utiliser shallowRef pour les listes massives de données (ex: DataTable) afin d'alléger le moteur de réactivité.

Nommage :

Composants : PascalCase.vue

Composables : useCamelCase.ts

Stores : useUserStore.ts


📑 EXEMPLE DE STRUCTURE (TEMPLATE)
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { useTitle } from '@vueuse/core'

const userStore = useUserStore()
const { name } = storeToRefs(userStore)

useTitle('Profil Utilisateur')

const isLoading = ref(false)

const handleSave = () => {
  isLoading.value = true
  // Logique...
}
</script>

<template>
  <div class="card flex justify-content-center">
    <p-panel header="Profil">
      <p>Bienvenue {{ name }}</p>
      <p-button 
        label="Sauvegarder" 
        icon="pi pi-check" 
        :loading="isLoading" 
        @click="handleSave" 
      />
    </p-panel>
  </div>
</template>
```