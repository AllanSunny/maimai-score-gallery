import archivedScores from "../data/generated-scores.json";
import { parseScoresResponse } from "./data-validation";

const scoreArchive = parseScoresResponse(archivedScores);
export const scores = scoreArchive.scores;
