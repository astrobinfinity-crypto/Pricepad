import type { AIProvider } from "../../core/ports/ai";
import { buildMappingPrompt, parseMappingReply } from "./shared";

// Temporary Google-side problems worth one more try.
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export function geminiAI(opts: { apiKey: string; model: string }): AIProvider {
  return {
    async mapColumns(targets, headers, sampleRows) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`;
      const body = JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildMappingPrompt(targets, headers, sampleRows) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      });

      let lastStatus = 0;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "x-goog-api-key": opts.apiKey, "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          return parseMappingReply(text, targets.length, headers.length);
        }

        lastStatus = res.status;
        if (!RETRY_STATUSES.has(res.status)) break; // a real error, don't retry
        await new Promise((r) => setTimeout(r, 800));
      }
      throw new Error(`Gemini request failed (${lastStatus})`);
    },
  };
}