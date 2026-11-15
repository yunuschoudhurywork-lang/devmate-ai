export type AiProviderName = "openai" | "azure-openai" | "anthropic" | "gemini";

export interface AiCompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
  json?: boolean;
}

export interface AiProvider {
  readonly name: AiProviderName;
  readonly model: string;
  complete(request: AiCompletionRequest): Promise<string>;
}

/** Raised when no provider credentials are present. */
export class AiNotConfiguredError extends Error {}
/** Raised when the provider rejects the request, times out, or is unreachable. */
export class AiProviderError extends Error {}
/** Raised when the provider returns something that is not the expected JSON. */
export class AiInvalidResponseError extends Error {}

export const AI_TIMEOUT_MS = 25_000;

export async function withTimeout<T>(operation: Promise<T>, timeoutMs = AI_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new AiProviderError("The AI provider request timed out.")), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Extract the first JSON object from a model response, tolerating code fences. */
export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced;

  try {
    return JSON.parse(candidate);
  } catch {
    throw new AiInvalidResponseError("The AI provider returned an invalid JSON response.");
  }
}

/** Truncate provider error bodies so they are safe to log/return. */
export async function describeResponseFailure(provider: string, response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  const detail = body.slice(0, 300).replace(/\s+/g, " ").trim();
  return `${provider} request failed (${response.status})${detail ? `: ${detail}` : ""}`;
}
