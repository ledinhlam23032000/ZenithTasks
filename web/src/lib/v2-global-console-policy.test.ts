import { describe, expect, it } from "vitest";
import { GLOBAL_PROJECT_PAGE_SIZE, canOpenGlobalProjectConsole, projectConsoleWhere } from "./v2-global-console-policy";

describe("global project console scope", () => {
  it("opens the global project console only for Admin", () => {
    expect(canOpenGlobalProjectConsole("ADMIN")).toBe(true);
    expect(canOpenGlobalProjectConsole("MANAGER")).toBe(false);
    expect(canOpenGlobalProjectConsole("DOCTOR")).toBe(false);
  });

  it("scopes Manager queries to active memberships and bounds search input", () => {
    expect(projectConsoleWhere("MANAGER", "user-1", "  Clinic  ")).toEqual({
      members: { some: { userId: "user-1", active: true } },
      OR: [
        { code: { contains: "Clinic", mode: "insensitive" } },
        { name: { contains: "Clinic", mode: "insensitive" } },
      ],
    });
    expect(projectConsoleWhere("ADMIN", "owner-1", "")).toEqual({});
    expect(GLOBAL_PROJECT_PAGE_SIZE).toBe(50);
  });
});
