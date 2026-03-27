# API Performance Baseline Report

Generated: 2026-03-26
Environment: local backend (http://localhost:5000)
Script: npm run profile:api

## Configuration

- Iterations per endpoint: 15
- Warmup requests per endpoint: 3

## Results

- /api/home/critical?limit=10
  - p50: 2.59 ms
  - p95: 3.11 ms
  - avg: 2.54 ms
  - payload (avg/max): 11507 / 11507 bytes
  - success: 15/15

- /api/home/sections?limit=10
  - p50: 2.04 ms
  - p95: 2.78 ms
  - avg: 2.11 ms
  - payload (avg/max): 7492 / 7492 bytes
  - success: 15/15

- /api/home?page=1&limit=10
  - p50: 2.45 ms
  - p95: 3.69 ms
  - avg: 2.55 ms
  - payload (avg/max): 13320 / 13320 bytes
  - success: 15/15

- /api/products?limit=20&offset=0
  - p50: 3.38 ms
  - p95: 4.14 ms
  - avg: 3.44 ms
  - payload (avg/max): 5470 / 5470 bytes
  - success: 15/15

## Notes

- These are local measurements and are expected to be lower than production p95 values.
- Use the same script with production-like data and network conditions for release validation.
- Raw machine-readable output is stored in performance-baseline-report.json.
