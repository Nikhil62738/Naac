import { api } from "./http";

export async function downloadFile(url, filename) {
  const response = await api.get(url, { responseType: "blob" });
  const objectUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function previewFile(url) {
  const response = await api.get(url, { responseType: "blob" });
  const objectUrl = URL.createObjectURL(response.data);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
