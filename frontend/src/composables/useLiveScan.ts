import { getCurrentInstance, onBeforeUnmount, ref } from "vue";
import { runStaticHeuristics } from "@/utils/staticHeuristics";
import type { AnalysisLanguage, AnalysisResult } from "@/types/analysis";

export type LiveScanStatus = "idle" | "debouncing" | "scanning" | "ready";

const STORAGE_KEY = "devmate_live_scan";

function getStoredLiveScanSetting(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== "false";
  } catch {
    return true;
  }
}

export function useLiveScan(debounceMs = 400) {
  const isLiveScanEnabled = ref<boolean>(getStoredLiveScanSetting());

  const scanStatus = ref<LiveScanStatus>("idle");
  const scanDurationMs = ref<number>(0);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let worker: Worker | null = null;
  let currentRequestId = 0;
  let pendingCallback: ((result: AnalysisResult) => void) | null = null;
  let scanStartTime = 0;

  function initWorker(): void {
    if (typeof Worker === "undefined" || worker !== null) return;
    try {
      worker = new Worker(new URL("../workers/liveScan.worker.ts", import.meta.url), {
        type: "module"
      });

      worker.onmessage = (event: MessageEvent<{ id: number; analysis: AnalysisResult }>) => {
        if (event.data.id === currentRequestId) {
          scanDurationMs.value = Math.max(1, Math.round(performance.now() - scanStartTime));
          scanStatus.value = "ready";
          if (pendingCallback) {
            pendingCallback(event.data.analysis);
            pendingCallback = null;
          }
        }
      };

      worker.onerror = () => {
        // In case of worker failure, fallback gracefully to synchronous engine
        worker = null;
      };
    } catch {
      worker = null;
    }
  }

  function toggleLiveScan(): boolean {
    isLiveScanEnabled.value = !isLiveScanEnabled.value;
    try {
      localStorage.setItem(STORAGE_KEY, String(isLiveScanEnabled.value));
    } catch {
      // Ignore storage restrictions
    }
    if (!isLiveScanEnabled.value) {
      if (debounceTimer) clearTimeout(debounceTimer);
      scanStatus.value = "idle";
    }
    return isLiveScanEnabled.value;
  }

  function scheduleScan(
    code: string,
    language: AnalysisLanguage,
    filename: string | undefined,
    onResult: (result: AnalysisResult) => void
  ): void {
    if (!isLiveScanEnabled.value) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    scanStatus.value = "debouncing";

    debounceTimer = setTimeout(() => {
      runImmediateScan(code, language, filename, onResult);
    }, debounceMs);
  }

  function runImmediateScan(
    code: string,
    language: AnalysisLanguage,
    filename: string | undefined,
    onResult: (result: AnalysisResult) => void
  ): void {
    if (debounceTimer) clearTimeout(debounceTimer);

    scanStatus.value = "scanning";
    scanStartTime = performance.now();
    currentRequestId++;
    const requestId = currentRequestId;
    pendingCallback = onResult;

    initWorker();

    if (worker) {
      worker.postMessage({
        id: requestId,
        code,
        language,
        filename
      });
    } else {
      // Worker unavailable fallback (e.g. test environment, jsdom)
      setTimeout(() => {
        if (requestId === currentRequestId) {
          const result = runStaticHeuristics({ code, language, filename });
          scanDurationMs.value = Math.max(1, Math.round(performance.now() - scanStartTime));
          scanStatus.value = "ready";
          if (pendingCallback) {
            pendingCallback(result);
            pendingCallback = null;
          }
        }
      }, 0);
    }
  }

  function cancelScan(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    scanStatus.value = "idle";
    pendingCallback = null;
  }

  function dispose(): void {
    cancelScan();
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      dispose();
    });
  }

  return {
    isLiveScanEnabled,
    scanStatus,
    scanDurationMs,
    toggleLiveScan,
    scheduleScan,
    runImmediateScan,
    cancelScan,
    dispose
  };
}
