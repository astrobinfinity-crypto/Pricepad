import type { AIProvider } from "../../core/ports/ai";
import { buildMappingPrompt, parseMappingReply } from "./shared";

export function openAICompatibleAI(opts: { apiKey: string; model: string; baseUrl: string }): AIProvider {
  return {
    async mapColumns(targets, headers, sampleRows) {
      const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${opts.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: opts.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: buildMappingPrompt(targets, headers, sampleRows) }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`AI request failed (${res.status})`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? "";
      return parseMappingReply(text, targets.length, headers.length);
    },
  };
}