export function resolveLiveScoreReference(loggedRecord, liveScoresByFingerprint) {
  if (!loggedRecord?.scoreFingerprint) return null;
  const live = liveScoresByFingerprint.get(loggedRecord.scoreFingerprint);
  return live ? { ...loggedRecord, ...live } : null;
}
