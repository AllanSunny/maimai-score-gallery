import { createHash } from "node:crypto";

export function sourceFingerprint(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function scoreFingerprint(score) {
  const playedAt = new Date(score.playedAt);
  if (Number.isNaN(playedAt.getTime())) {
    throw new Error(`Invalid score timestamp: ${JSON.stringify(score.playedAt)}.`);
  }
  const identity = [
    playedAt.toISOString(),
    String(score.songTitle ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase(),
    String(score.chartType ?? "").trim().toUpperCase(),
    String(score.difficulty ?? "").trim().toUpperCase(),
    Number(score.achievement).toFixed(4),
  ].join("|");
  return createHash("sha256").update(identity).digest("hex");
}
