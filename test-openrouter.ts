import "dotenv/config";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

async function main() {
  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  let model = process.env.OPEN_ROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free";

  if (!apiKey) {
    throw new Error(
      "Missing OpenRouter API key. Set OPENROUTER_API_KEY (or OPEN_ROUTER_API_KEY) in .env.",
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Try configured model first, then additional free models discovered from OpenRouter.
  const fallbackModels = [model, "meta-llama/llama-3.1-8b-instruct:free"];

  try {
    const modelsRes = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (modelsRes.ok) {
      const modelsPayload = (await modelsRes.json()) as {
        data?: Array<{ id?: string }>;
      };

      const discoveredFreeModels = (modelsPayload.data || [])
        .map((m) => m.id)
        .filter((id): id is string => Boolean(id && id.includes(":free")))
        .slice(0, 5);

      for (const discoveredModel of discoveredFreeModels) {
        if (!fallbackModels.includes(discoveredModel)) {
          fallbackModels.push(discoveredModel);
        }
      }
    }
  } catch {
    // Ignore model discovery failures and continue with static fallbacks.
  }

  let lastError = "Unknown error";

  for (const candidate of fallbackModels) {
    model = candidate;

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: "Reply with one short line: OpenRouter test successful.",
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (response.ok) {
      const text = data.choices?.[0]?.message?.content;
      console.log("Model:", model);
      console.log("Response:", text ?? "No text returned");
      return;
    }

    lastError = data.error?.message || `HTTP ${response.status}`;
  }

  throw new Error(`OpenRouter request failed: ${lastError}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("OpenRouter test failed:", message);
  process.exit(1);
});
