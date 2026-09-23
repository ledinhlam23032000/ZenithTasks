import { describe, expect, it } from "vitest";
import { paymentRequestPdfCanvasHeightForExport, paymentRequestPdfImagePlacements } from "../payment-request-pdf";

describe("payment request PDF layout", () => {
  it("keeps a standard A4 payment paper on one page despite fractional canvas overflow", () => {
    const placements = paymentRequestPdfImagePlacements(794, 1123, 210, 297);

    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({ y: 0, height: 297 });
    expect(placements[0].width).toBeLessThanOrEqual(210);
  });

  it("crops only blank canvas overflow before creating the PDF", () => {
    expect(paymentRequestPdfCanvasHeightForExport(1588, 4492, 210, 297, false)).toBe(2246);
    expect(paymentRequestPdfCanvasHeightForExport(1588, 4492, 210, 297, true)).toBe(4492);
  });
});
