import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const scenes = ["wood", "gold", "diamond", "crypto", "galaxy", "forest", "fish", "lava", "ocean", "candy", "neon", "ice", "dragon", "ghost", "milk"] as const;
const families = ["cosmic", "crystal", "forge", "playful", "nature"] as const;

const AiOutputSchema = z.object({
  name: z.string(),
  slug_hint: z.string(),
  concept: z.string(),
  visual_direction: z.string(),
  gameplay_idea: z.string(),
  token_name: z.string(),
  token_symbol: z.string(),
  action_verb: z.string(),
  mascot_emoji: z.string(),
  welcome_text: z.string(),
  welcome_cta_text: z.string(),
  theme: z.object({
    primary: z.string(),
    background: z.string(),
    accent: z.string(),
    layout_family: z.enum(families),
    surface_style: z.string(),
    motion_style: z.string(),
  }),
  scene: z.enum(scenes),
  tasks: z.array(z.object({ title: z.string(), reward: z.coerce.number(), url: z.string().nullable().default(null) })),
  miners: z.array(z.object({
    name: z.string(), emoji: z.string(), price_tokens: z.coerce.number(), rate_boost_per_hour: z.coerce.number(),
    duration_hours: z.coerce.number(),
    rarity: z.preprocess((value) => String(value).toLowerCase(), z.enum(["common", "rare", "epic", "legendary"])),
    is_free: z.coerce.boolean(),
  })),
});

const FinalSchema = AiOutputSchema.extend({
  slug_hint: z.string().regex(/^[a-z0-9-]+$/),
  token_symbol: z.string().min(2).max(6).regex(/^[A-Z0-9]+$/),
  theme: AiOutputSchema.shape.theme.extend({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  tasks: AiOutputSchema.shape.tasks.min(3).max(5),
  miners: AiOutputSchema.shape.miners.length(5),
});

const systemPrompt = `You are an award-winning game director and Telegram Mini App product designer.
Create a complete, original mine-to-earn bot concept from the user's request. Do not copy generic crypto dashboards or reuse obvious names.

The bot name, token name, token symbol, action verb, mascot, miner upgrades, tasks, interface geometry, and animation language must all belong to one coherent world. Invent a memorable gameplay metaphor instead of always using a round mining button. Examples of interaction metaphors include squeezing fruit, steering a spaceship, tending a greenhouse, assembling a machine, or catching spirits—but invent the best one for the request.

Requirements:
- concept: 1 concise sentence describing the fantasy.
- visual_direction: 2 concise sentences describing layout, shapes, surfaces, typography mood, and distinctive UI elements.
- gameplay_idea: 2 concise sentences describing the central earning interaction and progression.
- theme colors are exact six-digit hex values; background is dark and readable.
- layout_family is the closest of cosmic, crystal, forge, playful, nature.
- surface_style and motion_style are concrete visual instructions, not generic adjectives.
- scene is one of: ${scenes.join(", ")}.
- Generate 3-5 relevant tasks and exactly 5 themed miners/upgrades with unique names.
- First miner is free, permanent, and earns 400/hour. Paid miners scale from common through legendary.
- Task rewards are 50-500. Token symbol is 2-6 uppercase letters or digits.
- Avoid repeating names from popular crypto projects. Every generation should feel bespoke.

Return ONLY JSON using this exact contract and exact snake_case property names:
{
  "name": "string",
  "slug_hint": "lowercase-dashed-string",
  "concept": "string",
  "visual_direction": "string",
  "gameplay_idea": "string",
  "token_name": "string",
  "token_symbol": "ABC",
  "action_verb": "string",
  "mascot_emoji": "single emoji",
  "welcome_text": "string",
  "welcome_cta_text": "string",
  "theme": {
    "primary": "#rrggbb",
    "background": "#rrggbb",
    "accent": "#rrggbb",
    "layout_family": "cosmic|crystal|forge|playful|nature",
    "surface_style": "string",
    "motion_style": "string"
  },
  "scene": "one allowed scene",
  "tasks": [{ "title": "string", "reward": 100, "url": null }],
  "miners": [{
    "name": "string",
    "emoji": "single emoji",
    "price_tokens": 0,
    "rate_boost_per_hour": 400,
    "duration_hours": 0,
    "rarity": "common",
    "is_free": true
  }]
}`;

function generationPrompt(description: string) {
  return `Design an original bot for this request: ${description}\n\nReturn a complete JSON configuration. Prioritize a unique name, token identity, visual system, interaction idea, and themed upgrade collection.`;
}

function normalize(value: z.infer<typeof AiOutputSchema>) {
  const cleaned = {
    ...value,
    slug_hint: value.slug_hint.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "new-bot",
    token_symbol: value.token_symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(2, "X"),
    tasks: value.tasks.slice(0, 5).map((task) => ({ ...task, reward: Math.max(50, Math.min(500, Math.round(task.reward))) })),
    miners: value.miners.slice(0, 5).map((miner, index) => ({
      ...miner,
      price_tokens: index === 0 ? 0 : Math.max(1, Math.round(miner.price_tokens)),
      rate_boost_per_hour: index === 0 ? 400 : Math.max(1, Math.round(miner.rate_boost_per_hour)),
      duration_hours: index === 0 ? 0 : Math.max(0, Math.round(miner.duration_hours)),
      is_free: index === 0,
    })),
  };
  return FinalSchema.parse(cleaned);
}

async function generateWithLovable(description: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Lovable AI is not configured.");
  const gateway = createLovableAiGatewayProvider(key);
  const result = await generateText({
    model: gateway("google/gemini-3.6-flash"),
    system: `${systemPrompt}\nReturn only one valid JSON object with exactly the requested fields. Do not use markdown fences.`,
    prompt: generationPrompt(description),
    temperature: 0.95,
    maxRetries: 1,
  });
  const cleaned = result.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { miners?: Array<Record<string, unknown>> };
    return normalize(AiOutputSchema.parse(parsed));
  } catch (error) {
    let minerKeys: string[][] = [];
    try {
      const parsed = JSON.parse(cleaned) as { miners?: Array<Record<string, unknown>> };
      minerKeys = parsed.miners?.map((miner) => Object.keys(miner)) ?? [];
    } catch { /* invalid JSON */ }
    console.error("AI bot design validation failed", { error, minerKeys });
    throw new Error("AI could not finish this design. Please generate it again.");
  }
}

async function generateWithGemini(description: string) {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("Gemini is not configured.");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: generationPrompt(description) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.95 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty design.");
  return normalize(AiOutputSchema.parse(JSON.parse(text)));
}

export async function createBotDesign(description: string, provider: "gemini" | "lovable") {
  if (provider === "gemini") {
    try {
      return await generateWithGemini(description);
    } catch (error) {
      console.error("Gemini bot design failed; using Lovable AI fallback", error);
    }
  }
  try {
    return await generateWithLovable(description);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed.";
    if (message.includes("429")) throw new Error("AI is busy right now. Please retry in a minute.");
    if (message.includes("402")) throw new Error("AI credits are exhausted. Add workspace credits and retry.");
    throw new Error(message);
  }
}