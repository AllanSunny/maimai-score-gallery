import archivedScores from "./data/generated-scores.json";
import { parseScoresResponse } from "./data-validation";

export async function fetchScores() {
  return parseScoresResponse(archivedScores);
}
