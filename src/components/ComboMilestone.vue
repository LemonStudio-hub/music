<template>
  <div class="combo-milestone" aria-hidden="true">
    <span class="combo-milestone-value">{{ value }}</span>
    <span class="combo-milestone-label">COMBO</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ value: number }>();
</script>
