import { describe, expect, it } from "vitest";
import { paymentRequestPdfImagePlacements } from "../payment-request-pdf";

describe("payment request PDF layout", () => {
  it("keeps a standard A4 payment paper on one page despite fractional canvas overflow", () => {
    const placements = paymentRequestPdfImagePlacements(794, 1123, 210, 297);

    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({ y: 0, height: 297 });
    expect(placements[0].width).toBeLessThanOrEqual(210);
  });
});
