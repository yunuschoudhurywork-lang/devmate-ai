import {
  AiInvalidResponseError,
  AiNotConfiguredError,
  AiProviderError,
  parseJsonObject,
  type AiProvider
} from "../llm/provider";
import { resolveAiProvider } from "../llm";
import { AI_TASKS, type AiTaskContext, type AiTaskKind } from "./tasks";

export interface AiTaskResult {
  kind: AiTaskKind;
  provider: string;
  model: string;
  data: unknown;
}

/** Runs the AI review tasks against the configured provider and validates the response shape. */
export class AiReviewEngine {
  constructor(private readonly providerFactory: () => AiProvider | null = resolveAiProvider) {}

  async run(kind: AiTaskKind, context: AiTaskContext): Promise<AiTaskResult> {
    const provider = this.providerFactory();
    if (!provider) {
      throw new AiNotConfiguredError("No AI provider is configured.");
    }

    const task = AI_TASKS[kind];

    let text: string;
    try {
      text = await provider.complete({
        system: task.system,
        prompt: task.buildPrompt(context),
        maxTokens: task.maxTokens,
        json: true
      });
    } catch (error) {
      if (
        error instanceof AiProviderError ||
        error instanceof AiNotConfiguredError ||
        error instanceof AiInvalidResponseError
      ) {
        throw error;
      }
      throw new AiProviderError("The AI provider is unavailable.");
    }

    const parsed = parseJsonObject(text);
    if (!task.validate(parsed)) {
      throw new AiInvalidResponseError("The AI provider returned an incomplete response.");
    }

    return { kind, provider: provider.name, model: provider.model, data: parsed };
  }
}
