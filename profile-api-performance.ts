/// <reference types="node" />

import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface EndpointResult {
  endpoint: string;
  iterations: number;
  successCount: number;
  failureCount: number;
  sampleError: string | null;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  avgPayloadBytes: number;
  maxPayloadBytes: number;
}

interface BenchmarkReport {
  generatedAt: string;
  baseUrl: string;
  iterations: number;
  warmupRequests: number;
  results: EndpointResult[];
}

const BASE_URL = process.env.BENCH_BASE_URL || 'http://localhost:5000';
const ITERATIONS = Math.max(1, Number(process.env.BENCH_ITERATIONS || 15));
const WARMUP_REQUESTS = Math.max(0, Number(process.env.BENCH_WARMUP_REQUESTS || 3));

const ENDPOINTS = [
  '/api/home/critical?limit=10',
  '/api/home/sections?limit=10',
  '/api/home?page=1&limit=10',
  '/api/products?limit=20&offset=0',
];

const percentile = (sortedValues: number[], p: number): number => {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const round = (value: number): number => Math.round(value * 100) / 100;

const runEndpointBenchmark = async (endpoint: string): Promise<EndpointResult> => {
  const durations: number[] = [];
  const payloadSizes: number[] = [];
  let successCount = 0;
  let failureCount = 0;
  let sampleError: string | null = null;

  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    try {
      await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 15000,
        validateStatus: () => true,
      });
    } catch {
      // Warmup failures are ignored for stability.
    }
  }

  for (let i = 0; i < ITERATIONS; i++) {
    const startedAt = process.hrtime.bigint();
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 15000,
        validateStatus: () => true,
      });
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      if (response.status >= 200 && response.status < 400) {
        successCount += 1;
        durations.push(elapsedMs);

        const payloadBytes = Buffer.byteLength(JSON.stringify(response.data ?? {}), 'utf8');
        payloadSizes.push(payloadBytes);
      } else {
        failureCount += 1;
        if (!sampleError) {
          sampleError = `HTTP ${response.status}`;
        }
      }
    } catch (error: any) {
      failureCount += 1;
      if (!sampleError) {
        sampleError = error?.message || 'Request failed';
      }
    }
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const avgPayloadBytes = average(payloadSizes);

  return {
    endpoint,
    iterations: ITERATIONS,
    successCount,
    failureCount,
    sampleError,
    minMs: round(sorted[0] ?? 0),
    maxMs: round(sorted[sorted.length - 1] ?? 0),
    avgMs: round(average(sorted)),
    p50Ms: round(percentile(sorted, 50)),
    p95Ms: round(percentile(sorted, 95)),
    avgPayloadBytes: Math.round(avgPayloadBytes),
    maxPayloadBytes: Math.max(0, ...payloadSizes),
  };
};

const main = async () => {
  console.log(`Running API benchmark against ${BASE_URL}`);
  console.log(`Iterations per endpoint: ${ITERATIONS} (warmup: ${WARMUP_REQUESTS})`);

  const results: EndpointResult[] = [];
  for (const endpoint of ENDPOINTS) {
    console.log(`Benchmarking ${endpoint} ...`);
    const result = await runEndpointBenchmark(endpoint);
    results.push(result);
  }

  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    iterations: ITERATIONS,
    warmupRequests: WARMUP_REQUESTS,
    results,
  };

  const reportPath = path.join(process.cwd(), 'performance-baseline-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\nBenchmark summary:');
  for (const result of results) {
    console.log(
      `${result.endpoint} | p50=${result.p50Ms}ms p95=${result.p95Ms}ms avg=${result.avgMs}ms ` +
      `payload(avg/max)=${result.avgPayloadBytes}/${result.maxPayloadBytes} bytes ` +
      `success=${result.successCount}/${result.iterations}`
    );
    if (result.sampleError && result.successCount === 0) {
      console.log(`  sample error: ${result.sampleError}`);
    }
  }

  console.log(`\nSaved report to ${reportPath}`);

  const hasUnreachableEndpoint = results.some((result) => result.successCount === 0);
  if (hasUnreachableEndpoint) {
    console.error('One or more endpoints had zero successful responses. Baseline is invalid.');
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
