<script setup lang="ts">
import * as monaco from "monaco-editor";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTheme } from "@/composables/useTheme";
import type { AnalysisLanguage, Finding } from "@/types/analysis";

const props = defineProps<{
  modelValue: string;
  language: AnalysisLanguage;
  findings?: Finding[];
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { isDark } = useTheme();
const container = ref<HTMLElement>();
let editor: monaco.editor.IStandaloneCodeEditor | undefined;

function updateMarkers(): void {
  if (!editor) return;
  const model = editor.getModel();
  if (!model) return;

  const findings = props.findings ?? [];
  const markers: monaco.editor.IMarkerData[] = findings.map((finding) => {
    const totalLines = model.getLineCount();
    const line = Math.max(1, Math.min(finding.line, totalLines));
    const lineContent = model.getLineContent(line);

    // Find non-whitespace boundary
    const nonSpaceIdx = lineContent.search(/\S/);
    const startCol = nonSpaceIdx >= 0 ? nonSpaceIdx + 1 : 1;
    const endCol = Math.max(startCol + 1, lineContent.length + 1);

    const severity =
      finding.type === "error" || finding.severity === "high" || finding.severity === "critical"
        ? monaco.MarkerSeverity.Error
        : finding.severity === "medium"
        ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Info;

    return {
      severity,
      startLineNumber: line,
      startColumn: startCol,
      endLineNumber: line,
      endColumn: endCol,
      message: `${finding.message}${finding.suggestion ? `\n💡 Suggestion: ${finding.suggestion}` : ""}`,
      source: `DevMate [${finding.ruleId}]`
    };
  });

  monaco.editor.setModelMarkers(model, "devmate", markers);
}

function goToLine(line: number): void {
  if (!editor) return;
  editor.revealLineInCenter(line);
  editor.setPosition({ lineNumber: line, column: 1 });
  editor.focus();
}

defineExpose({
  goToLine
});

onMounted(() => {
  if (!container.value) return;

  editor = monaco.editor.create(container.value, {
    value: props.modelValue,
    language: props.language,
    theme: isDark.value ? "vs-dark" : "vs",
    automaticLayout: true,
    minimap: { enabled: true, maxColumn: 40 },
    fontSize: 14,
    padding: { top: 14, bottom: 14 },
    scrollBeyondLastLine: false,
    lineNumbers: "on",
    renderLineHighlight: "all",
    glyphMargin: true
  });

  editor.onDidChangeModelContent(() => {
    emit("update:modelValue", editor?.getValue() ?? "");
  });

  updateMarkers();
});

watch(
  isDark,
  (dark) => {
    monaco.editor.setTheme(dark ? "vs-dark" : "vs");
  }
);

watch(
  () => props.language,
  (language) => {
    const model = editor?.getModel();
    if (model) monaco.editor.setModelLanguage(model, language);
  }
);

watch(
  () => props.modelValue,
  (value) => {
    if (editor && editor.getValue() !== value) {
      editor.setValue(value);
      updateMarkers();
    }
  }
);

watch(
  () => props.findings,
  () => {
    updateMarkers();
  },
  { deep: true }
);

onBeforeUnmount(() => editor?.dispose());
</script>

<template>
  <div class="editor-wrapper">
    <div ref="container" class="editor" aria-label="Source code editor" />
  </div>
</template>

<style scoped>
.editor-wrapper {
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.35);
  background: #1e1e1e;
  transition: border-color 0.2s ease;
}

.editor-wrapper:focus-within {
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.25);
}

.editor {
  height: 480px;
  width: 100%;
}
</style>
