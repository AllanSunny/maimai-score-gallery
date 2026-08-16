function normalizedIdentityPart(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function archivedPlayIdentity(score) {
  const playedAt = new Date(score.playedAt);
  if (Number.isNaN(playedAt.getTime())) {
    throw new Error(`Invalid score timestamp: ${JSON.stringify(score.playedAt)}.`);
  }
  return [
    playedAt.toISOString(),
    normalizedIdentityPart(score.songTitle),
    String(score.chartType ?? "").trim().toUpperCase(),
    String(score.difficulty ?? "").trim().toUpperCase(),
    Number(score.achievement).toFixed(4),
  ].join("|");
}

export function reconcileScoreArchive(archivedScores, sheetScores, prepareScore) {
  const scores = [];
  const indexByIdentity = new Map();
  let duplicatesRemoved = 0;
  archivedScores.forEach((score) => {
    const identity = archivedPlayIdentity(score);
    if (indexByIdentity.has(identity)) {
      duplicatesRemoved += 1;
      return;
    }
    indexByIdentity.set(identity, scores.length);
    scores.push(score);
  });

  let added = 0;
  let updated = 0;
  sheetScores.forEach((score) => {
    if (!score.id) return;
    const identity = archivedPlayIdentity(score);
    const next = prepareScore(score);
    const existingIndex = indexByIdentity.get(identity);
    if (existingIndex === undefined) {
      indexByIdentity.set(identity, scores.length);
      scores.push(next);
      added += 1;
    } else if (JSON.stringify(scores[existingIndex]) !== JSON.stringify(next)) {
      scores[existingIndex] = next;
      updated += 1;
    }
  });

  return {
    scores: scores.sort((a, b) => a.playedAt.localeCompare(b.playedAt)),
    added,
    updated,
    duplicatesRemoved,
    changed: added > 0 || updated > 0 || duplicatesRemoved > 0,
  };
}
