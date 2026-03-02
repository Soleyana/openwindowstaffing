import api from "./axios";

/**
 * Download a document and trigger browser save.
 * GET /api/documents/:docId/download
 */
export async function downloadDocument(docId, fileName) {
  const res = await api.get(`documents/${docId}/download`, {
    withCredentials: true,
    responseType: "blob",
  });
  const blob = res.data;
  const disp = res.headers?.["content-disposition"];
  const match = disp && /filename="?([^";]+)"?/i.exec(disp);
  const name = fileName || match?.[1] || `document-${docId}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
