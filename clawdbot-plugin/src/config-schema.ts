/**
 * Moltboard Channel Config Schema
 */

import { z } from "zod";

const moltboardAccountSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  apiUrl: z.string().optional(),
  apiKey: z.string().optional(),
  pollIntervalMs: z.number().int().positive().optional(),
  defaultBoardId: z.string().optional(),
});

export const MoltboardConfigSchema = moltboardAccountSchema.extend({
  accounts: z.object({}).catchall(moltboardAccountSchema).optional(),
});
