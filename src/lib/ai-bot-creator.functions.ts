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
    title: z.string(), reward: z.coerce.number().min(0), url: z.string().optional().nullable(),
  })).max(8),
  miners: z.array(z.object({
    name: z.string(), emoji: z.string(),
    price_tokens: z.coerce.number().min(0), rate_boost_per_hour: z.coerce.number().min(0),
    duration_hours: z.coerce.number().int().min(0), rarity: z.enum(["common","rare","epic","legendary"]),
    is_free: z.boolean().default(false),
  })).max(6),
});

const SYSTEM_PROMPT = `You are a Telegram mini-app bot designer. Generate a tap-to-earn bot config as JSON.

Return ONLY a JSON object with EXACTLY these keys (no extra keys, no markdown, no commentary):
{
  "name": string,
  "slug_hint": string (lowercase a-z0-9 and dashes only),
  "token_name": string,
  "token_symbol": string (2-6 uppercase chars),
  "action_verb": string (e.g. "Mine", "Squeeze", "Haunt"),
  "mascot_emoji": string (single emoji),
  "welcome_text": string (3-4 lines with emojis, ends with an earning tip),
  "welcome_cta_text": string,
  "theme": { "primary": "#rrggbb", "background": "#rrggbb", "accent": "#rrggbb" },
  "scene": one of "wood","gold","diamond","crypto","galaxy","forest","fish","lava","ocean","candy","neon","ice","dragon","ghost","milk",
  "tasks": [ { "title": string, "reward": number, "url": string|null } ]  (3-5 items),
  "miners": [ { "name": string, "emoji": string, "price_tokens": number, "rate_boost_per_hour": number, "duration_hours": integer, "rarity": "common"|"rare"|"epic"|"legendary", "is_free": boolean } ]  (5 items)
}

Rules:
- Hex colors must be exactly 6 digits; background must be very dark (e.g. #0a0512), primary/accent saturated and high-contrast.
- "scene" MUST be one of the listed values — pick the closest match to the user's theme.
- First miner: is_free true, price_tokens 0, duration_hours 0 (permanent), rate_boost_per_hour 400. Then 4 paid tiers scaling common → legendary.
- Task rewards between 50 and 500.`;


async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
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
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit reached. Try again in a minute.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to your workspace.");
  if (!res.ok) throw new Error(`Lovable AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

export const generateBotConfig = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    description: z.string().min(3).max(500),
    provider: z.enum(["gemini", "lovable"]).default("lovable"),
  }).parse(i))
  .handler(async ({ data }) => {
    const prompt = `User request: "${data.description}"\n\nGenerate the JSON config for this Telegram mini-app bot.`;
    let text = "";
    if (data.provider === "gemini") {
      try {
        text = await callGemini(prompt);
      } catch (e) {
        // Gemini key quota/errors shouldn't dead-end the creator — fall back.
        console.error("gemini failed, falling back to Lovable AI:", e);
        text = await callLovable(prompt);
      }
    } else {
      text = await callLovable(prompt);
    }
    let parsed: unknown;
    try {
      const cleaned = String(text).trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON. Try again with a clearer description.");
    }
    const result = BotConfigSchema.safeParse(parsed);
    if (!result.success) throw new Error(`Config validation failed: ${result.error.errors.slice(0, 2).map(e => `${e.path.join(".")}: ${e.message}`).join("; ")}`);
    return result.data;
  });
