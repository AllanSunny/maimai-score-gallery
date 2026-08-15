import path from "node:path";
import { createGoogleClients, GOOGLE_SCOPES, requiredEnvironment } from "./google-auth.mjs";
import { isHeicImage } from "./ocr-image.mjs";

const COMMON_IMAGE_EXTENSIONS = /\.(?:avif|heic|heif|jpe?g|png|webp)$/i;

function escapedDriveQueryValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function isSupportedScoreImage({ mimeType = "", name = "" }) {
  return mimeType.toLocaleLowerCase().startsWith("image/")
    || isHeicImage({ mimeType, fileName: name })
    || COMMON_IMAGE_EXTENSIONS.test(name);
}

function safeFilenamePart(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[ .]+$/g, "")
    .trim();
}

export function processedImageName({ canonicalTitle, capturedAt, originalName }) {
  const title = safeFilenamePart(canonicalTitle) || "Unknown Song";
  const date = new Date(capturedAt);
  if (Number.isNaN(date.getTime())) throw new Error("A valid capture time is required for the processed filename.");
  const timestamp = date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
  const extension = path.extname(originalName).toLocaleLowerCase();
  const safeExtension = COMMON_IMAGE_EXTENSIONS.test(extension) ? extension : "";
  const suffix = ` - ${timestamp}${safeExtension}`;
  return `${title.slice(0, Math.max(1, 180 - suffix.length)).trim()}${suffix}`;
}

export async function createDriveImageStore({ readOnly = false } = {}) {
  const incomingFolderId = requiredEnvironment("GOOGLE_DRIVE_FOLDER_ID");
  const processedFolderId = requiredEnvironment("GOOGLE_PROCESSED_FOLDER_ID");
  const { drive } = await createGoogleClients(
    readOnly ? GOOGLE_SCOPES.imageReader : GOOGLE_SCOPES.importer,
  );

  return {
    async listIncoming() {
      const files = [];
      let pageToken;
      do {
        const response = await drive.files.list({
          q: `'${escapedDriveQueryValue(incomingFolderId)}' in parents and trashed = false`,
          fields: "nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,size,parents,imageMediaMetadata(time))",
          orderBy: "createdTime,name",
          pageSize: 1000,
          pageToken,
        });
        files.push(...(response.data.files ?? []).filter(isSupportedScoreImage));
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);
      return files;
    },

    async download(fileId) {
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      return Buffer.from(response.data);
    },

    async moveToProcessed(file, { canonicalTitle, capturedAt }) {
      const removeParents = (file.parents ?? []).join(",") || incomingFolderId;
      const name = processedImageName({
        canonicalTitle,
        capturedAt,
        originalName: file.name ?? "score.heic",
      });
      const response = await drive.files.update({
        fileId: file.id,
        addParents: processedFolderId,
        removeParents,
        fields: "id,name,parents",
        requestBody: { name },
      });
      return response.data;
    },
  };
}
