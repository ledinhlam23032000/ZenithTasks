import { describe, expect, it } from "vitest";
import { summarizeCollaboratorQuality } from "./collaborator-data-quality";

describe("collaborator data quality", () => {
  it("separates missing IDs, unregistered profiles and healthy rows", () => {
    expect(summarizeCollaboratorQuality([
      { id: null, name: "Legacy", registered: false },
      { id: "c1", name: "Chưa đăng ký", registered: false },
      { id: "c2", name: "Đã chuẩn hóa", registered: true },
    ])).toEqual({ total: 3, missingId: 1, unregistered: 1, healthy: 1 });
  });
});
