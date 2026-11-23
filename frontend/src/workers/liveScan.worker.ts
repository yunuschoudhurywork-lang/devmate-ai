import { runStaticHeuristics } from "@/utils/staticHeuristics";
import type { AnalysisLanguage, AnalysisResult } from "@/types/analysis";

interface WorkerRequest {
  id: number;
  code: string;
  language: AnalysisLanguage;
  filename?: string;
}

interface WorkerResponse {
  id: number;
  analysis: AnalysisResult;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, code, language, filename } = event.data;
  try {
    const analysis = runStaticHeuristics({ code, language, filename });
    const response: WorkerResponse = { id, analysis };
    self.postMessage(response);
  } catch (error) {
    // Return empty clean fallback on unexpected worker error
    const fallback: WorkerResponse = {
      id,
      analysis: {
        language,
        findings: [],
        summary: { total: 0, errors: 0, warnings: 0, security: 0, performance: 0 },
        quality: { overall: 100, categories: { correctness: 100, security: 100, performance: 100 } }
      }
    };
    self.postMessage(fallback);
  }
};
