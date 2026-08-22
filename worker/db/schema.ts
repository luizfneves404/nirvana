import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * D1 constraints that shape this file:
 *  - No native BOOLEAN  -> integer({ mode: "boolean" })
 *  - No native DATETIME -> integer({ mode: "timestamp" }) (unix seconds)
 *  - Foreign keys are always enforced and cannot be disabled
 *  - Max 100 bound parameters per query, which caps how wide a batch insert
 *    can be (rows x columns <= 100)
 */
export const items = sqliteTable(
  "items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("items_created_at_idx").on(table.createdAt)],
);

export type ItemRow = typeof items.$inferSelect;
export type NewItemRow = typeof items.$inferInsert;
