<script setup lang="ts">
import * as monaco from "monaco-editor";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { AnalysisLanguage } from "@/types/analysis";

const props = defineProps<{ modelValue: string; language: AnalysisLanguage }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const container = ref<HTMLElement>();
let editor: monaco.editor.IStandaloneCodeEditor | undefined;

onMounted(() => {
  if (!container.value) return;

  editor = monaco.editor.create(container.value, {
    value: props.modelValue,
    language: props.language,
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    padding: { top: 14 },
    scrollBeyondLastLine: false
  });
  editor.onDidChangeModelContent(() => emit("update:modelValue", editor?.getValue() ?? ""));
});

watch(() => props.language, (language) => {
  const model = editor?.getModel();
  if (model) monaco.editor.setModelLanguage(model, language);
});

watch(() => props.modelValue, (value) => {
  if (editor && editor.getValue() !== value) editor.setValue(value);
});

onBeforeUnmount(() => editor?.dispose());
</script>

<template>
  <div ref="container" class="editor" aria-label="Source code editor" />
</template>

<style scoped>
.editor { height: 440px; border: 1px solid #334155; border-radius: 10px; overflow: hidden; }
</style>
