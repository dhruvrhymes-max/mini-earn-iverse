import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BotConfigSchema = z.object({
  name: z.string(),
  slug_hint: z.string(),
  token_name: z.string(),
  token_symbol: z.string(),
  action_verb: z.string(),
  mascot_emoji: z.string(),
  welcome_text: z.string(),
  welcome_cta_text: z.string(),
  theme: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  scene: z.enum(["wood","gold","diamond","crypto","galaxy","forest","fish","lava","ocean","candy","neon","ice","dragon","ghost","milk"]),
  tasks: z.array(z.object({
    title: z.string(), reward: z.number().min(0), url: z.string().url().optional().nullable(),
  })).max(8),
  miners: z.array(z.object({
    name: z.string(), emoji: z.string(),
    price_tokens: z.number().min(0), rate_boost_per_hour: z.number().min(0),
    duration_hours: z.number().int().min(0), rarity: z.enum(["common","rare","epic","legendary"]),
    is_free: z.boolean().default(false),
  })).max(6),
});

const SYSTEM_PROMPT = `You are a Telegram mini-app bot designer. Generate a complete tap-to-earn bot config as JSON.
Rules:
- Colors MUST be dark, saturated, high-contrast hex (background always dark, e.g. #0a0512).
- Pick the closest matching scene from the allowed enum.
- Give the first miner is_free:true (400/h boost, permanent, 0 price), then 4 paid tiers scaling in price and rate (common → legendary).
- Tasks: 3-5 mix of social + partner tasks with realistic rewards (50-500 tokens).
- Welcome text: 3-4 lines with emojis, ending with earning tips.
- Return ONLY valid JSON matching the schema. No markdown, no commentary.`;

async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

async function callLovable(prompt: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
    }),
  });
  if (!res.ok) throw new Error(`Lovable AI ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

export const generateBotConfig = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    description: z.string().min(3).max(500),
    provider: z.enum(["gemini", "lovable"]).default("gemini"),
  }).parse(i))
  .handler(async ({ data }) => {
    const prompt = `User request: "${data.description}"\n\nGenerate the JSON config for this Telegram mini-app bot.`;
    const text = data.provider === "gemini" ? await callGemini(prompt) : await callLovable(prompt);
    let parsed: unknown;
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON. Try again with a clearer description.");
    }
    const result = BotConfigSchema.safeParse(parsed);
    if (!result.success) throw new Error(`Config validation failed: ${result.error.errors.slice(0, 2).map(e => e.message).join("; ")}`);
    return result.data;
  });
