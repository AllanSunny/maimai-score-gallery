import { zonedDateTimeIso } from "./sheet-scores.mjs";

function exifWallClock(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  return match
    ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`
    : text;
}

function exifIso(value, offset, timeZone) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  const wallClock = exifWallClock(value);
  if (!wallClock) return null;
  const normalizedOffset = String(offset ?? "").trim();
  if (normalizedOffset && !/^[+-]\d{2}:?\d{2}$/.test(normalizedOffset)) {
    throw new Error(`Unsupported EXIF timezone offset: ${JSON.stringify(normalizedOffset)}.`);
  }
  if (normalizedOffset) {
    const isoOffset = normalizedOffset.includes(":")
      ? normalizedOffset
      : `${normalizedOffset.slice(0, 3)}:${normalizedOffset.slice(3)}`;
    const parsed = new Date(`${wallClock.replace(" ", "T")}${isoOffset}`);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Unsupported EXIF capture time: ${JSON.stringify(value)}.`);
    return parsed.toISOString();
  }
  return zonedDateTimeIso(wallClock, timeZone);
}

function metadataIso(value, timeZone) {
  if (!value) return null;
  const wallClock = exifWallClock(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(wallClock)) {
    return zonedDateTimeIso(wallClock, timeZone);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function selectCaptureTime({ embedded = {}, driveFile = {}, timeZone }) {
  if (!timeZone) throw new Error("A capture-time timezone is required.");
  if (embedded.capturedAt) {
    return {
      capturedAt: exifIso(embedded.capturedAt, embedded.offset, timeZone),
      source: "exif",
      candidates: {
        exif: embedded.capturedAt,
        exifOffset: embedded.offset ?? null,
        driveImageMetadata: driveFile.imageMediaMetadata?.time ?? null,
        driveCreatedTime: driveFile.createdTime ?? null,
      },
    };
  }

  const driveImageTime = metadataIso(driveFile.imageMediaMetadata?.time, timeZone);
  if (driveImageTime) {
    return {
      capturedAt: driveImageTime,
      source: "drive-image-metadata",
      candidates: {
        exif: null,
        exifOffset: null,
        driveImageMetadata: driveFile.imageMediaMetadata.time,
        driveCreatedTime: driveFile.createdTime ?? null,
      },
    };
  }

  const driveCreatedTime = metadataIso(driveFile.createdTime, timeZone);
  if (driveCreatedTime) {
    return {
      capturedAt: driveCreatedTime,
      source: "drive-created-time",
      candidates: {
        exif: null,
        exifOffset: null,
        driveImageMetadata: driveFile.imageMediaMetadata?.time ?? null,
        driveCreatedTime: driveFile.createdTime,
      },
    };
  }

  throw new Error("Capture time is unavailable from EXIF and Drive metadata.");
}
