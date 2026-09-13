<script setup lang="ts">
import { loaderStyle } from "@/composables/useLoader";
import LoaderArt from "./LoaderArt.vue";
</script>

<template>
  <div class="skeleton-wrap">
    <LoaderArt :style="loaderStyle" :size="54" message="Cargando…" />
  </div>
</template>

<style scoped>
.skeleton-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}
</style>
