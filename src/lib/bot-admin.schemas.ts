import { z } from "zod";

export const Auth = {
  tenantId: z.string().uuid(),
  initData: z.string().nullable().optional(),
  previewTgId: z.number().int().positive().nullable().optional(),
};

export const ChannelSchema = z.object({
  title: z.string().max(80),
  url: z.string().max(300),
  chat_id: z.string().max(80).optional().nullable(),
});
