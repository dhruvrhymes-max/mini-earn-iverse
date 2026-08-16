import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const generateBotConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    description: z.string().min(3).max(500),
    provider: z.enum(["gemini", "lovable"]).default("lovable"),
  }).parse(i))
  .handler(async ({ data }) => {
    const { createBotDesign } = await import("./ai-bot-creator.server");
    return createBotDesign(data.description, data.provider);
  });
