import exifr from "exifr";
import decodeHeic from "heic-decode";
import sharp from "sharp";

export const DEFAULT_OCR_IMAGE_OPTIONS = Object.freeze({
  maxEdge: 4096,
  jpegQuality: 95,
});

const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

function integerSetting(name, value, { minimum, maximum }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
  }
  return parsed;
}

export function ocrImageOptions() {
  return { ...DEFAULT_OCR_IMAGE_OPTIONS };
}

export function isHeicImage({ mimeType = "", fileName = "" }) {
  const normalizedMimeType = mimeType.toLocaleLowerCase().split(";", 1)[0].trim();
  const normalizedFileName = fileName.toLocaleLowerCase();
  return HEIC_MIME_TYPES.has(normalizedMimeType) || /\.(?:heic|heif)$/.test(normalizedFileName);
}

async function sharpInput(image) {
  if (!isHeicImage(image)) return sharp(image.buffer).rotate();

  const decoded = await decodeHeic({ buffer: image.buffer });
  return sharp(
    Buffer.from(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength),
    {
      raw: {
        width: decoded.width,
        height: decoded.height,
        channels: 4,
      },
    },
  );
}

export async function prepareOcrImage(image, options = ocrImageOptions()) {
  if (!Buffer.isBuffer(image.buffer) || image.buffer.length === 0) {
    throw new Error("OCR image input must be a non-empty Buffer.");
  }

  const maxEdge = integerSetting("maxEdge", options.maxEdge, { minimum: 512, maximum: 8192 });
  const jpegQuality = integerSetting(
    "jpegQuality",
    options.jpegQuality,
    { minimum: 1, maximum: 100 },
  );
  const source = await sharpInput(image);
  const { data, info } = await source
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    // 4:4:4 preserves colored edges and small UI text better than JPEG's usual 4:2:0.
    .jpeg({ quality: jpegQuality, chromaSubsampling: "4:4:4" })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    mimeType: "image/jpeg",
    width: info.width,
    height: info.height,
    bytes: info.size,
  };
}

export async function imageCaptureMetadata(buffer) {
  const metadata = await exifr.parse(buffer, {
    pick: [
      "DateTimeOriginal",
      "CreateDate",
      "ModifyDate",
      "OffsetTimeOriginal",
      "OffsetTimeDigitized",
      "OffsetTime",
      "Orientation",
      "Make",
      "Model",
    ],
    reviveValues: false,
  }).catch(() => null);

  const dateTimeOriginal = metadata?.DateTimeOriginal ?? null;
  const createDate = metadata?.CreateDate ?? null;
  const modifyDate = metadata?.ModifyDate ?? null;

  return {
    capturedAt: dateTimeOriginal ?? createDate ?? modifyDate,
    dateTimeOriginal,
    createDate,
    modifyDate,
    offset: metadata?.OffsetTimeOriginal ?? metadata?.OffsetTimeDigitized ?? metadata?.OffsetTime ?? null,
    orientation: metadata?.Orientation ?? null,
    make: metadata?.Make ?? null,
    model: metadata?.Model ?? null,
  };
}
