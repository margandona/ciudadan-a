<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { SlideDeck, VoteResult } from "@pclab/shared";
import { useRoute } from "vue-router";
import { getPresentation, getVotes, recordManualVotes, submitVote } from "@/services/importApi";
import DeckPlayer from "./DeckPlayer.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";

const props = defineProps<{ classId: string }>();

const route = useRoute();
const deck = ref<SlideDeck | null>(null);
const isProjection = ref(true);
const results = ref<Record<string, VoteResult>>({});
const loading = ref(true);
const error = ref("");
let poll: ReturnType<typeof setInterval> | null = null;

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const tokenId = typeof route.query.token === "string" ? route.query.token : undefined;
    const result = await getPresentation(props.classId, tokenId);
    deck.value = result.deck;
    isProjection.value = result.isProjection;
  } catch (e) {
    error.value = (e as Error).message ?? "No autorizado.";
  } finally {
    loading.value = false;
  }
}

async function refreshResults(questionIds: string[]): Promise<void> {
  for (const questionId of questionIds) {
    const result = await getVotes(props.classId, questionId);
    if (result) results.value[questionId] = result;
  }
}

async function onVote(payload: { questionId: string; option: number }): Promise<void> {
  const result = await submitVote(props.classId, payload.questionId, payload.option);
  results.value[payload.questionId] = result;
}

async function onManual(payload: { questionId: string; counts: Record<string, number> }): Promise<void> {
  const result = await recordManualVotes(props.classId, payload.questionId, payload.counts);
  results.value[payload.questionId] = result;
}

onMounted(async () => {
  await load();
  if (deck.value && isProjection.value) {
    const questionIds = deck.value.slides
      .flatMap((s) => s.blocks)
      .filter((b) => b.type === "question")
      .map((b) => b.id);
    await refreshResults(questionIds);
    poll = setInterval(() => refreshResults(questionIds), 3000);
  }
});

onBeforeUnmount(() => {
  if (poll) clearInterval(poll);
});
</script>

<template>
  <div>
    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <DeckPlayer
      v-else-if="deck"
      :deck="deck"
      :is-projection="isProjection"
      :results="results"
      @vote="onVote"
      @manual="onManual"
      @request="(qid: string) => refreshResults([qid])"
    />
  </div>
</template>
