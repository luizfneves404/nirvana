import { describe, expect, it } from "vite-plus/test";

import { CreateItemSchema, ItemSchema, UpdateItemSchema } from "./schemas.ts";

describe("CreateItemSchema", () => {
  it("accepts a normal title", () => {
    expect(CreateItemSchema.safeParse({ title: "Write the report" }).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(CreateItemSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    expect(CreateItemSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
  });

  it("strips unknown keys rather than failing", () => {
    const result = CreateItemSchema.safeParse({ title: "ok", done: true });
    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ title: "ok" });
  });
});

describe("UpdateItemSchema", () => {
  it("requires done to be a boolean", () => {
    expect(UpdateItemSchema.safeParse({ done: "yes" }).success).toBe(false);
    expect(UpdateItemSchema.safeParse({ done: true }).success).toBe(true);
  });
});

describe("ItemSchema", () => {
  it("requires a uuid id and a numeric createdAt", () => {
    const valid = {
      id: "3f1a7c2e-5d4b-4a91-8f2c-1b6e9d0a7c34",
      title: "task",
      done: false,
      createdAt: 1_700_000_000_000,
    };
    expect(ItemSchema.safeParse(valid).success).toBe(true);
    expect(ItemSchema.safeParse({ ...valid, id: "not-a-uuid" }).success).toBe(false);
  });
});
