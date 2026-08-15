import { createHash } from "node:crypto";

export function sourceFingerprint(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function scoreFingerprint(score) {
  const identity = [
    score.playedAt,
    score.songTitle,
    score.chartType,
    score.difficulty,
    score.achievement,
  ].join("|");
  return createHash("sha256").update(identity).digest("hex");
}
