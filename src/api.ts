import { demoScores } from "./demo-data";
import type { ScoresResponse } from "./types";

export async function fetchScores(): Promise<ScoresResponse> {
  const url = import.meta.env.VITE_SCORES_API_URL;

  if (!url) {
    return { scores: demoScores, updatedAt: new Date().toISOString() };
  }

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Score feed returned HTTP ${response.status}`);

  return response.json() as Promise<ScoresResponse>;
}
