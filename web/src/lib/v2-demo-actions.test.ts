import { describe, expect, it } from "vitest";
import { canSeedV2Demo } from "./v2-demo-actions";

describe("V2 demo seed environment guard", () => {
  it("allows QA/dev but blocks production", () => {
    expect(canSeedV2Demo("test")).toBe(true);
    expect(canSeedV2Demo("development")).toBe(true);
    expect(canSeedV2Demo("production")).toBe(false);
  });
});
