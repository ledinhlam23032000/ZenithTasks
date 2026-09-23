export type PaymentRequestPdfImagePlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const ONE_PAGE_OVERFLOW_TOLERANCE_MM = 5;
const PAGE_BREAK_TOLERANCE_MM = 0.5;

/**
 * Places a rendered payment paper in A4 PDF pages without a rounding-only
 * second page. A few millimetres of browser/canvas overflow are scaled into
 * the first page so the complete one-page administrative form remains intact.
 */
export function paymentRequestPdfImagePlacements(
  imageWidthPx: number,
  imageHeightPx: number,
  pageWidthMm: number,
  pageHeightMm: number,
): PaymentRequestPdfImagePlacement[] {
  if (imageWidthPx <= 0 || imageHeightPx <= 0 || pageWidthMm <= 0 || pageHeightMm <= 0) {
    throw new Error("Invalid PDF dimensions");
  }

  const naturalHeightMm = (imageHeightPx * pageWidthMm) / imageWidthPx;
  if (naturalHeightMm <= pageHeightMm + ONE_PAGE_OVERFLOW_TOLERANCE_MM) {
    const scale = Math.min(1, pageHeightMm / naturalHeightMm);
    return [{
      x: (pageWidthMm - pageWidthMm * scale) / 2,
      y: 0,
      width: pageWidthMm * scale,
      height: naturalHeightMm > pageHeightMm ? pageHeightMm : naturalHeightMm,
    }];
  }

  const placements: PaymentRequestPdfImagePlacement[] = [];
  let remainingHeightMm = naturalHeightMm;
  let y = 0;
  while (remainingHeightMm > PAGE_BREAK_TOLERANCE_MM) {
    placements.push({ x: 0, y, width: pageWidthMm, height: naturalHeightMm });
    remainingHeightMm -= pageHeightMm;
    y -= pageHeightMm;
  }
  return placements;
}
