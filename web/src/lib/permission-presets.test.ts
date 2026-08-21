import { describe, expect, it } from "vitest";
import { permissionDiff, permissionPresetKeys } from "./permission-presets";

describe("permission presets", () => {
  it("derives a receptionist preset from the central permission defaults", () => {
    const keys = permissionPresetKeys("RECEPTION");
    expect(keys).toContain("mod:tiep-nhan");
    expect(keys).toContain("payment.add");
    expect(keys).not.toContain("phone.full");
  });

  it("calculates added and removed keys without mutating inputs", () => {
    const current = ["mod:khach-hang", "payment.add"];
    const desired = ["mod:khach-hang", "case.clinical"];
    expect(permissionDiff(current, desired)).toEqual({ added: ["case.clinical"], removed: ["payment.add"] });
    expect(current).toEqual(["mod:khach-hang", "payment.add"]);
  });
});
