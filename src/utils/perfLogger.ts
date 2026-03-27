const PERF_LOGGING_ENABLED = process.env.ENABLE_QUERY_DEBUG_LOGS === 'true';

export const isPerfLoggingEnabled = (): boolean => PERF_LOGGING_ENABLED;

export const logPerf = (label: string, startedAt: number): void => {
  if (!PERF_LOGGING_ENABLED) return;
  const elapsedMs = Date.now() - startedAt;
  console.log(`[perf] ${label}: ${elapsedMs}ms`);
};
