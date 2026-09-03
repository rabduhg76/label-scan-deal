import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GEMINI_MODEL = "gemini-2.5-flash";

const schema = z.object({
  image: z.string().min(32).max(12_000_000),
});

async function callGemini(apiKey: string, data: { image: string }) {
  const cleanBase64 = data.image.replace(/^data:image\/\w+;base64,/, "");
  const mimeMatch = data.image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Transcribe the ingredient list and any allergen statement from this food label photo. Reply with the raw label text only, no commentary. If no ingredient text is visible, reply exactly: NO_LABEL",
              },
              {
                inlineData: { mimeType, data: cleanBase64 },
              },
            ],
          },
        ],
      }),
    }
  );
}

async function callLovableGateway(apiKey: string, data: { image: string }) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe the ingredient list and any allergen statement from this food label photo. Reply with the raw label text only, no commentary. If no ingredient text is visible, reply exactly: NO_LABEL",
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
    }),
  });
}

async function callOpenAI(apiKey: string, data: { image: string }) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe the ingredient list and any allergen statement from this food label photo. Reply with the raw label text only, no commentary. If no ingredient text is visible, reply exactly: NO_LABEL",
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
    }),
  });
}

export const readLabel = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const geminiKey = process.env["GEMINI_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];

    const providers: { name: string; has: boolean; run: () => Promise<Response> }[] = [];
    if (geminiKey) providers.push({ name: "gemini", has: true, run: () => callGemini(geminiKey!, data) });
    if (lovableKey) providers.push({ name: "lovable", has: true, run: () => callLovableGateway(lovableKey!, data) });
    if (openaiKey) providers.push({ name: "openai", has: true, run: () => callOpenAI(openaiKey!, data) });

    if (providers.length === 0) {
      return {
        ok: false as const,
        error: "AI is not configured on the server. Please check the server environment variables.",
      };
    }

    let lastUserMessage = "Failed to read the label photo. Try again in a moment.";

    for (const provider of providers) {
      try {
        const res = await provider.run();

        if (res.status === 429) {
          lastUserMessage =
            "Our scanner is busy right now — please wait a few seconds and try again.";
          console.warn(`[readLabel] ${provider.name} rate-limited, trying next provider`);
          continue;
        }

        if (!res.ok) {
          const body = await res.text();
          console.error(`[readLabel] ${provider.name} error`, res.status, body);
          try {
            const errJson = JSON.parse(body);
            if (
              provider.name === "openai" &&
              (errJson.error?.code === "credit_balance_exhausted" ||
                errJson.error?.code === "insufficient_quota")
            ) {
              lastUserMessage =
                "OpenAI quota/credits exhausted. Please add billing credits at platform.openai.com or switch to Google Gemini in settings.";
              continue;
            }
            if (errJson.error?.message) {
              lastUserMessage = `${provider.name} error: ${errJson.error.message}`;
              continue;
            }
          } catch {}
          lastUserMessage = `${provider.name} request failed (${res.status}).`;
          continue;
        }

        if (provider.name === "gemini") {
          const json = (await res.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
          if (!text || text.includes("NO_LABEL")) {
            return { ok: false as const, error: "No ingredient text found in that photo." };
          }
          return { ok: true as const, text };
        }

        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = json.choices?.[0]?.message?.content?.trim() ?? "";
        if (!text || text.includes("NO_LABEL")) {
          return { ok: false as const, error: "No ingredient text found in that photo." };
        }
        return { ok: true as const, text };
      } catch (e: any) {
        console.error(`[readLabel] ${provider.name} threw`, e);
        lastUserMessage = e?.message || lastUserMessage;
      }
    }

    return { ok: false as const, error: lastUserMessage };
  });
