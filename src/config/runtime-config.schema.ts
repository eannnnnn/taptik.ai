import { z } from 'zod';

import { AGENT_CLIENTS, DEFAULT_RUNTIME_LANGUAGE } from './runtime-config.constants';

export const agentClientSchema = z.enum(AGENT_CLIENTS);

export const rawBotConfigSchema = z.object({
  client: agentClientSchema,
  token: z.string().trim().min(1),
  workspace: z.string().trim().min(1),
  agent: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      return value;
    }),
  ultrawork: z.boolean().optional().default(false),
});

export const rawRuntimeConfigSchema = z.object({
  LANG: z.string().trim().min(1).default(DEFAULT_RUNTIME_LANGUAGE),
  bot: z.record(z.string(), rawBotConfigSchema).optional(),
});

export type RawRuntimeConfig = z.infer<typeof rawRuntimeConfigSchema>;
