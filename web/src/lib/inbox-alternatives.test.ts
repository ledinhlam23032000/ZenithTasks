import { describe, expect, it } from "vitest";
import { inboxAlternatives } from "./inbox-alternatives";

describe("inbox alternatives", () => {
  it("returns no alternatives for an active channel inside the response window", () => {
    expect(inboxAlternatives({ withinWindow: true, hasCustomer: true, channelActive: true })).toEqual([]);
  });

  it("offers callback, Customer 360 and reassignment outside the window", () => {
    expect(inboxAlternatives({ withinWindow: false, hasCustomer: true, channelActive: true }).map((item) => item.key)).toEqual(["callback", "customer", "assign"]);
  });
});
