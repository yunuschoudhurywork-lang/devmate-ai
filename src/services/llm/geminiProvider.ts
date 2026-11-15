import {
  AiInvalidResponseError,
  AiProviderError,
  withTimeout,
  type AiCompletionRequest,
  type AiProvider
} from "./provider";

/** Google Gemini provider built on the existing @google/genai SDK. */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini" as const;

  constructor(
    private readonly apiKey: string,
    readonly model: string
  ) {}

  async complete(request: AiCompletionRequest): Promise<string> {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: this.apiKey });

      const response = await withTimeout(
        client.models.generateContent({
          model: this.model,
          contents: request.prompt,
          config: {
            systemInstruction: request.system,
            ...(request.json ? { responseMimeType: "application/json" } : {}),
            maxOutputTokens: request.maxTokens ?? 1_200,
            temperature: 0.2
          }
        })
      );

      const text = response.text;
      if (!text || text.trim().length === 0) {
        throw new AiInvalidResponseError("gemini returned no content.");
      }
      return text;
    } catch (error) {
      if (error instanceof AiInvalidResponseError || error instanceof AiProviderError) throw error;
      throw new AiProviderError("The Gemini request failed.");
    }
  }
}
