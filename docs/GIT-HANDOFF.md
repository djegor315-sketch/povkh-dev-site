# September source handoff

This branch imports the editable 2026-09-05 source snapshot into the existing repository history. The archive SHA-256 is bc51729c61d4fd161a5594f4f446f093ac88636609f96269392d7de3cd9a94b3. All 183 archived files matched SOURCE-MANIFEST.json byte for byte before import. Existing license files and the older tracked visual baseline are preserved. Internal Studio records and approvals are excluded from this branch and its added history.

## Validation on Windows

Node 24.13.1; npm ci --ignore-scripts completed. npm run test:content (16 tests), npm run test:server (11), npm run test:tooling (1), npm run check (0 errors/warnings), npm run build and npm run verify:build (22 localized preview routes) passed.

No new browser, visual, macOS or Linux verification is claimed. Historical screenshot baselines are source fixtures, not newly approved visual references. npm ci reported 35 dependency vulnerabilities (2 low, 4 moderate, 27 high, 2 critical); dependency upgrades are outside this import.

## Run locally

Use Node >=22.12 and npm. Run npm ci, then npm run dev -- --host 127.0.0.1 --port 4322. Open http://127.0.0.1:4322/ru/ (Russian) or http://127.0.0.1:4322/ (English).

This remains a preview: noindex, demo-only form behavior, draft legal documents, incomplete language synchronization. Merge and deployment are separate decisions. See release-readiness.md.
