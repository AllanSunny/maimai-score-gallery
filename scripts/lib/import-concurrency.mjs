export function createSerialQueue() {
  let tail = Promise.resolve();
  let lastRateLimitedStart = 0;

  return function serial(task, { minimumDelayMs = 0 } = {}) {
    async function run() {
      if (minimumDelayMs > 0) {
        const waitMs = Math.max(0, lastRateLimitedStart + minimumDelayMs - Date.now());
        if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
        lastRateLimitedStart = Date.now();
      }
      return task();
    }
    const result = tail.then(run, run);
    tail = result.catch(() => {});
    return result;
  };
}

export async function mapConcurrent(values, concurrency, callback) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer.");
  }
  let nextIndex = 0;
  const results = Array(values.length);
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}
