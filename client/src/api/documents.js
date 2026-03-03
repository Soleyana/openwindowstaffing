import api from "./axios";

/**
 * DELETE /api/documents/:docId - Applicant deletes own document.
 */
export async function deleteDocument(docId) {
  const res = await api.delete(`documents/${docId}`, { withCredentials: true });
  return res.data;
}

/**
 * Detect iOS WebKit (Safari, in-app browsers) where anchor download is unreliable.
 */
function isIOSWebKit() {
  if (typeof navigator === "undefined" || !navigator.userAgent) return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua) && !/CriOS|FxiOS/.test(ua);
  return isIOS && isWebKit;
}

/**
 * Sanitize filename for download (remove path chars, quotes).
 */
function sanitizeFilename(name) {
  if (typeof name !== "string") return "document";
  return name.replace(/["/\\:*?<>|]/g, "_").replace(/\s+/g, "_").slice(0, 200) || "document";
}

/**
 * Trigger file download using Blob URL. Works on Chrome, Edge, Firefox, most desktop browsers.
 */
function triggerBlobUrlDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Fallback for iOS WebKit: convert blob to data URL and open to trigger Save/Share sheet.
 */
function triggerDataUrlDownload(blob, filename, onError) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    try {
      const w = window.open(dataUrl, "_blank");
      if (!w && typeof navigator !== "undefined" && navigator.share) {
        const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
        navigator.share({ files: [file], title: filename }).catch(() => {
          window.location.href = dataUrl;
        });
      } else if (!w) {
        window.location.href = dataUrl;
      }
    } catch {
      window.location.href = dataUrl;
    }
  };
  reader.onerror = () => {
    if (typeof onError === "function") onError("Download failed");
  };
  reader.readAsDataURL(blob);
}

/**
 * Trigger browser download. Primary: Blob URL + anchor. Fallback: data URL for iOS WebKit.
 */
function triggerBrowserDownload(blob, filename, onError) {
  const safeName = sanitizeFilename(filename);
  if (isIOSWebKit()) {
    triggerDataUrlDownload(blob, safeName, onError);
  } else {
    triggerBlobUrlDownload(blob, safeName);
  }
}

/**
 * Download a document and trigger browser save.
 * GET /api/documents/:docId/download
 * Uses withCredentials for cookie auth. Handles JSON error responses. Cross-browser compatible.
 */
export async function downloadDocument(docId, fileName, onError) {
  try {
    const res = await api.get(`documents/${docId}/download`, {
      withCredentials: true,
      responseType: "blob",
    });

    const contentType = (res.headers && res.headers["content-type"]) || "";
    const blob = res.data;
    const isJsonError =
      contentType.includes("application/json") ||
      (blob && typeof blob.text === "function" &&
        (await blob.slice(0, 1).text()) === "{");

    if (isJsonError) {
      const text = typeof blob.text === "function" ? await blob.text() : String(blob);
      let errData;
      try {
        errData = JSON.parse(text);
      } catch {
        errData = { message: "Download failed" };
      }
      const msg = errData && errData.message ? errData.message : "Download failed";
      const requestId = errData && errData.requestId;
      if (typeof onError === "function") onError(msg, requestId);
      return;
    }

    const disp = res.headers && res.headers["content-disposition"];
    const match = disp && /filename=["']?([^"'; \n]+)["']?/i.exec(disp);
    const name = (match && match[1]) || fileName || `document-${docId}`;
    triggerBrowserDownload(blob, name, onError);
  } catch (err) {
    if (err && err.response && err.response.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const errData = JSON.parse(text);
        const msg = (errData && errData.message) || "Download failed";
        const requestId = errData && errData.requestId;
        if (typeof onError === "function") onError(msg, requestId);
      } catch {
        if (typeof onError === "function") onError("Download failed");
      }
    } else if (typeof onError === "function") {
      const msg = (err && err.response && err.response.data && err.response.data.message) || "Download failed";
      const requestId = err && err.response && err.response.data && err.response.data.requestId;
      onError(msg, requestId);
    }
  }
}
