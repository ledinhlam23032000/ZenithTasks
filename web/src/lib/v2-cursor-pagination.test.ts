import { describe, expect, it } from "vitest";
import { paginateCursorRows } from "./v2-cursor-pagination";

describe("cursor pagination", () => {
  it("walks 1001 synthetic project rows in bounded pages without duplicates", () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({ id: `project-${String(index).padStart(4, "0")}` }));
    const seen: string[] = [];
    let offset = 0;
    while (offset < rows.length) {
      const page = paginateCursorRows(rows.slice(offset), 50);
      expect(page.items.length).toBeLessThanOrEqual(50);
      seen.push(...page.items.map((item) => item.id));
      if (!page.hasNext) break;
      expect(page.nextCursor).toBe(page.items.at(-1)?.id);
      offset += page.items.length;
    }
    expect(seen).toHaveLength(1001);
    expect(new Set(seen).size).toBe(1001);
    expect(seen[0]).toBe("project-0000");
    expect(seen.at(-1)).toBe("project-1000");
  });
});
