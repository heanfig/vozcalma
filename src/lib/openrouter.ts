const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type CompleteChatOptions = {
  /** Limite de tokens de salida; por defecto OPENROUTER_MAX_TOKENS o 4096. */
  maxTokens?: number;
};

export async function completeChat(
  messages: ChatMessage[],
  options?: CompleteChatOptions,
): Promise<string> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurada");

  const model =
    import.meta.env.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku";

  const envMax = import.meta.env.OPENROUTER_MAX_TOKENS || process.env.OPENROUTER_MAX_TOKENS;
  const parsedEnv =
    envMax != null && String(envMax).trim() !== ""
      ? parseInt(String(envMax), 10)
      : NaN;
  const defaultMax = Number.isFinite(parsedEnv) ? parsedEnv : 4096;
  const max_tokens = options?.maxTokens ?? defaultMax;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vozcalma.app",
      "X-Title": "VozCalma",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respuesta vacía del modelo");
  return text;
}
