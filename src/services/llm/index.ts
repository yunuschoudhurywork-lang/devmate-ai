import type { AiProvider, AiProviderName } from "./provider";
import { OpenAiProvider } from "./openaiProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { GeminiProvider } from "./geminiProvider";

const DEFAULT_MODELS: Record<AiProviderName, string> = {
  openai: "gpt-4o-mini",
  "azure-openai": "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  gemini: "gemini-2.0-flash"
};

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function buildProvider(name: AiProviderName): AiProvider | null {
  const explicitModel = read("AI_MODEL");

  switch (name) {
    case "openai": {
      const apiKey = read("OPENAI_API_KEY");
      if (!apiKey) return null;
      return new OpenAiProvider({
        apiKey,
        model: explicitModel || read("OPENAI_MODEL") || DEFAULT_MODELS.openai,
        baseUrl: read("OPENAI_BASE_URL")
      });
    }

    case "azure-openai": {
      const apiKey = read("AZURE_OPENAI_API_KEY");
      const endpoint = read("AZURE_OPENAI_ENDPOINT");
      const deployment = read("AZURE_OPENAI_DEPLOYMENT");
      if (!apiKey || !endpoint || !deployment) return null;
      return new OpenAiProvider({
        apiKey,
        model: explicitModel || deployment,
        azure: {
          endpoint,
          deployment,
          apiVersion: read("AZURE_OPENAI_API_VERSION") || "2024-10-21"
        }
      });
    }

    case "anthropic": {
      const apiKey = read("ANTHROPIC_API_KEY");
      if (!apiKey) return null;
      return new AnthropicProvider(
        apiKey,
        explicitModel || read("ANTHROPIC_MODEL") || DEFAULT_MODELS.anthropic
      );
    }

    case "gemini": {
      const apiKey = read("GEMINI_API_KEY");
      if (!apiKey) return null;
      return new GeminiProvider(apiKey, explicitModel || read("GEMINI_MODEL") || DEFAULT_MODELS.gemini);
    }

    default:
      return null;
  }
}

const PROVIDER_ORDER: AiProviderName[] = ["openai", "azure-openai", "anthropic", "gemini"];

/** Resolve the configured AI provider. AI_PROVIDER wins; otherwise the first configured key is used. */
export function resolveAiProvider(): AiProvider | null {
  const requested = read("AI_PROVIDER")?.toLowerCase() as AiProviderName | undefined;

  if (requested) {
    return PROVIDER_ORDER.includes(requested) ? buildProvider(requested) : null;
  }

  for (const candidate of PROVIDER_ORDER) {
    const provider = buildProvider(candidate);
    if (provider) return provider;
  }

  return null;
}

export function describeAiConfiguration(): { provider: AiProviderName | null; model: string | null; configured: boolean } {
  const provider = resolveAiProvider();
  return {
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
    configured: Boolean(provider)
  };
}

export type { AiProvider } from "./provider";
