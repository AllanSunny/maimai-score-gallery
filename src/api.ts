import archivedScores from "./data/generated-scores.json";
import type { ScoresResponse } from "./types";

export async function fetchScores(): Promise<ScoresResponse> {
  return archivedScores as ScoresResponse;
}
