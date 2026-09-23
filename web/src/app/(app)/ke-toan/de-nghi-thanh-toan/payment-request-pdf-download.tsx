"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { paymentRequestPdfFilename } from "@/lib/payment-request";
import { paymentRequestPdfCanvasHeightForExport, paymentRequestPdfImagePlacements } from "@/lib/payment-request-pdf";

function hasVisibleContentBelow(canvas: HTMLCanvasElement, startY: number): boolean {
  if (startY >= canvas.height) return false;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return true;

  const width = canvas.width;
  const pixels = context.getImageData(0, startY, width, canvas.height - startY).data;
  for (let y = 0; y < canvas.height - startY; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const index = (y * width + x) * 4;
      if (pixels[index + 3] > 32 && (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245)) return true;
    }
  }
  return false;
}

function cropBlankPdfOverflow(canvas: HTMLCanvasElement, pageWidthMm: number, pageHeightMm: number): HTMLCanvasElement {
  const a4HeightPx = Math.round((canvas.width * pageHeightMm) / pageWidthMm);
  const exportHeight = paymentRequestPdfCanvasHeightForExport(
    canvas.width,
    canvas.height,
    pageWidthMm,
    pageHeightMm,
    hasVisibleContentBelow(canvas, a4HeightPx),
  );
  if (exportHeight === canvas.height) return canvas;

  const cropped = document.createElement("canvas");
  cropped.width = canvas.width;
  cropped.height = exportHeight;
  const croppedContext = cropped.getContext("2d");
  if (!croppedContext) throw new Error("Không thể tạo ảnh PDF");
  croppedContext.drawImage(canvas, 0, 0, canvas.width, exportHeight, 0, 0, canvas.width, exportHeight);
  return cropped;
}

export function PaymentRequestPdfDownload({ requestNo }: { requestNo: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    const paper = document.querySelector<HTMLElement>(".payment-paper");
    if (!paper) {
      setError("Không tìm thấy nội dung bản đề nghị để tạo PDF.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    try {
      if ("fonts" in document) await document.fonts.ready;

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(paper, {
        backgroundColor: "#ffffff",
        logging: false,
        scale: 2,
        useCORS: true,
        windowHeight: paper.scrollHeight,
        windowWidth: paper.scrollWidth,
      });
      const pdf = new jsPDF({ compress: true, format: "a4", orientation: "portrait", unit: "mm" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfCanvas = cropBlankPdfOverflow(canvas, pageWidth, pageHeight);
      const image = pdfCanvas.toDataURL("image/png");
      const placements = paymentRequestPdfImagePlacements(pdfCanvas.width, pdfCanvas.height, pageWidth, pageHeight);
      placements.forEach((placement, index) => {
        if (index > 0) pdf.addPage();
        pdf.addImage(image, "PNG", placement.x, placement.y, placement.width, placement.height, undefined, "FAST");
      });
      pdf.save(paymentRequestPdfFilename(requestNo));
    } catch (cause) {
      console.error("Unable to create payment request PDF", cause);
      setError("Không thể tạo PDF. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={downloadPdf}
        disabled={isGenerating}
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {isGenerating ? "Đang tạo PDF" : "Tải PDF"}
      </button>
      {error && <span role="alert" className="max-w-48 text-right text-xs text-rose-700">{error}</span>}
    </div>
  );
}
