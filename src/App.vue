<template>
  <StartScreen v-if="store.screen === 'start'" />
  <GameScreen v-else />
</template>

<script setup lang="ts">
import { useGameStore } from './stores/game';
import StartScreen from './components/StartScreen.vue';
import GameScreen from './components/GameScreen.vue';

const store = useGameStore();
</script>
