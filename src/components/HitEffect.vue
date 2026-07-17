<template>
  <div
    class="hit-effect"
    :style="{
      color: props.color,
      left: props.x + 'px',
      top: props.y + 'px',
      transform: 'translateX(-50%)',
    }"
  >
    {{ props.text }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  text: string;
  color: string;
  x: number;
  y: number;
}>();
</script>
