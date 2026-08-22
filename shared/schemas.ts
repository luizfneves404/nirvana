import { z } from "zod";

/**
 * Shared between the Worker and the SPA. Compiled by both tsconfig.app.json
 * and tsconfig.worker.json, so keep this file runtime-agnostic — no Node,
 * DOM, or Workers globals.
 */

export const ItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  done: z.boolean(),
  createdAt: z.number().int(),
});

export const CreateItemSchema = ItemSchema.pick({ title: true });

export const UpdateItemSchema = ItemSchema.pick({ done: true });

export type Item = z.infer<typeof ItemSchema>;
export type CreateItem = z.infer<typeof CreateItemSchema>;
export type UpdateItem = z.infer<typeof UpdateItemSchema>;
