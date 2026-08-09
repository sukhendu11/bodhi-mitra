/**
 * Reader download / print helpers.
 *
 * The server (`downloadBookPdf`) returns the PDF bytes base64-encoded inside a
 * JSON envelope — so no `%PDF` magic bytes ever cross the network as a
 * response body (this is what keeps aggressive download managers from hijacking
 * the request). We decode to a Blob here and either:
 *   - download: create an object URL + anchor with the `download` attribute
 *     (a pure client-side action — download managers never see it), or
 *   - print: load the Blob URL into a hidden iframe and call `print()`,
 *     which opens the browser's native print dialog for the full PDF.
 */

export function base64ToBytes(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function pdfBlobUrl(base64: string): string {
  const bytes = base64ToBytes(base64);
  const blob = new Blob([bytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

/** Trigger a native browser download from a base64 PDF payload. */
export function triggerPdfDownload(payload: { filename: string; base64: string }) {
  const url = pdfBlobUrl(payload.base64);
  const a = document.createElement("a");
  a.href = url;
  a.download = payload.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Open the system print dialog with the full PDF via a hidden iframe.
 * Works in Chromium/Firefox/Edge; Safari may fall back to opening the PDF.
 */
export function printPdfBlob(payload: { filename: string; base64: string }) {
  const url = pdfBlobUrl(payload.base64);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Popup/print blocked — fall back to opening the PDF in a new tab
      window.open(url, "_blank");
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  };
  iframe.src = url;
}
