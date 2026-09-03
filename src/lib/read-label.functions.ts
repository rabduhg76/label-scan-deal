import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  image: z.string().min(32).max(12_000_000),
});

export const readLabel = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured for this app." };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
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

    if (!res.ok) {
      const body = await res.text();
      let message = "Could not read that photo. Try again.";
      if (res.status === 429) message = "Too many scans right now — wait a moment and retry.";
      else if (res.status === 402)
        message = "AI credits are exhausted. Add credits to keep scanning photos.";
      else if (res.status === 403) message = "AI access is blocked for this workspace.";
      console.error("readLabel gateway error", res.status, body);
      return { ok: false as const, error: message };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";

    if (!text || text.includes("NO_LABEL")) {
      return { ok: false as const, error: "No ingredient text found in that photo." };
    }
    return { ok: true as const, text };
  });
