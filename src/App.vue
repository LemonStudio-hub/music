<template>
  <StartScreen v-if="store.screen === 'start'" />
  <GameScreen v-else />
  <CountdownScreen v-if="store.screen === 'countdown'" />
  <ResultsScreen v-if="store.screen === 'results'" />
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/game';
import StartScreen from '@/components/StartScreen.vue';
import CountdownScreen from '@/components/CountdownScreen.vue';
import GameScreen from '@/components/GameScreen.vue';
import ResultsScreen from '@/components/ResultsScreen.vue';

const store = useGameStore();
</script>
