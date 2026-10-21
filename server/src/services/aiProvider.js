// The ONLY file that knows about Groq. Swapping providers means editing this file.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export class ProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderError";
  }
}

// Returns the model's reply text. Throws ProviderError on any failure.
// Error messages are generic on purpose: raw provider responses never leave this file.
export async function callProvider({ system, user }) {
  const { AI_PROVIDER, AI_MODEL, AI_API_KEY } = process.env;
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 8000;

  if (AI_PROVIDER !== "groq" || !AI_MODEL || !AI_API_KEY) {
    throw new ProviderError("AI provider is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new ProviderError(`Provider returned HTTP ${res.status}`);

    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim() === "") {
      throw new ProviderError("Provider returned an empty reply");
    }
    return text;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error.name === "AbortError") throw new ProviderError("Provider timed out");
    throw new ProviderError("Provider unreachable or returned unreadable data");
  } finally {
    clearTimeout(timer);
  }
}