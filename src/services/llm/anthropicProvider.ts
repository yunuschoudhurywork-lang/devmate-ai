import {
  AiInvalidResponseError,
  AiProviderError,
  describeResponseFailure,
  withTimeout,
  type AiCompletionRequest,
  type AiProvider
} from "./provider";

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
}

/** Anthropic Messages API provider (Claude). */
export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic" as const;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly baseUrl = "https://api.anthropic.com/v1"
  ) {}

  async complete(request: AiCompletionRequest): Promise<string> {
    let response: Response;

    try {
      response = await withTimeout(
        fetch(`${this.baseUrl.replace(/\/+$/, "")}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: request.maxTokens ?? 1_200,
            temperature: 0.2,
            system: request.system,
            messages: [{ role: "user", content: request.prompt }]
          })
        })
      );
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError("anthropic is unreachable.");
    }

    if (!response.ok) {
      throw new AiProviderError(await describeResponseFailure("anthropic", response));
    }

    const payload = (await response.json().catch(() => null)) as AnthropicResponse | null;
    const text = payload?.content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("");

    if (!text || text.trim().length === 0) {
      throw new AiInvalidResponseError("anthropic returned no content.");
    }

    return text;
  }
}
