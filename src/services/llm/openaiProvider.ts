import {
  AiInvalidResponseError,
  AiProviderError,
  describeResponseFailure,
  withTimeout,
  type AiCompletionRequest,
  type AiProvider,
  type AiProviderName
} from "./provider";

export interface OpenAiProviderOptions {
  apiKey: string;
  model: string;
  /** OpenAI-compatible base URL (defaults to https://api.openai.com/v1). */
  baseUrl?: string;
  azure?: {
    endpoint: string;
    deployment: string;
    apiVersion: string;
  };
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/** OpenAI chat completions, also used for Azure OpenAI deployments. */
export class OpenAiProvider implements AiProvider {
  readonly name: AiProviderName;
  readonly model: string;

  constructor(private readonly options: OpenAiProviderOptions) {
    this.name = options.azure ? "azure-openai" : "openai";
    this.model = options.model;
  }

  async complete(request: AiCompletionRequest): Promise<string> {
    const url = this.buildUrl();
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (this.options.azure) {
      headers["api-key"] = this.options.apiKey;
    } else {
      headers.Authorization = `Bearer ${this.options.apiKey}`;
    }

    const body: Record<string, unknown> = {
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt }
      ],
      temperature: 0.2,
      max_tokens: request.maxTokens ?? 1_200
    };

    if (!this.options.azure) body.model = this.options.model;
    if (request.json) body.response_format = { type: "json_object" };

    let response: Response;
    try {
      response = await withTimeout(
        fetch(url, { method: "POST", headers, body: JSON.stringify(body) })
      );
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(`${this.name} is unreachable.`);
    }

    if (!response.ok) {
      throw new AiProviderError(await describeResponseFailure(this.name, response));
    }

    const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || content.trim().length === 0) {
      throw new AiInvalidResponseError(`${this.name} returned no content.`);
    }

    return content;
  }

  private buildUrl(): string {
    if (this.options.azure) {
      const endpoint = this.options.azure.endpoint.replace(/\/+$/, "");
      const version = encodeURIComponent(this.options.azure.apiVersion);
      return `${endpoint}/openai/deployments/${encodeURIComponent(this.options.azure.deployment)}/chat/completions?api-version=${version}`;
    }

    const baseUrl = (this.options.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    return `${baseUrl}/chat/completions`;
  }
}
