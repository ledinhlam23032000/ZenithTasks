/**
 * Raw HTML document routes bypass React's event system. Keep their print
 * action compatible with the response CSP instead of falling back to an
 * unsafe inline onclick handler.
 */
export function renderCspSafePrintAction(
  buttonId: string,
  containerClass: string,
  nonce: string | null | undefined,
): string {
  const safeNonce = (nonce ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!safeNonce) return "";

  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(buttonId) || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(containerClass)) {
    throw new Error("Invalid print action identifier");
  }

  return `<div class="${containerClass}"><button id="${buttonId}" type="button">In / Lưu PDF</button></div><script nonce="${safeNonce}">document.getElementById("${buttonId}")?.addEventListener("click", () => window.print());</script>`;
}
