#!/usr/bin/env npx tsx
/**
 * Canon integrity validation. Run before build (canon-tools will invoke this).
 * Exits 0 on success, 1 on failure.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function main(): number {
  let failed = false;

  // 1. Schema exists and is valid JSON
  const schemaPath = join(ROOT, 'schema', 'schema.json');
  if (!existsSync(schemaPath)) {
    console.error('FAIL: schema/schema.json not found');
    return 1;
  }
  let schema: { version?: number; identityContract?: unknown };
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  } catch (e) {
    console.error('FAIL: schema/schema.json is not valid JSON:', e);
    return 1;
  }
  if (typeof schema.version !== 'number') {
    console.error('FAIL: schema/schema.json must have numeric version');
    failed = true;
  }
  if (!schema.identityContract || typeof schema.identityContract !== 'object') {
    console.error('FAIL: schema/schema.json must have identityContract');
    failed = true;
  }

  // 2. Optional: verify identity-contract version matches if available
  try {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, 'node_modules', 'majestic-identity-contract', 'package.json'), 'utf-8')
    );
    const expected = (schema.identityContract as { source?: string })?.source;
    if (expected && !expected.includes(pkg.version)) {
      console.warn(
        `WARN: schema references ${expected} but installed majestic-identity-contract@${pkg.version}`
      );
    }
  } catch {
    // identity-contract not installed; skip
  }

  if (failed) return 1;
  console.log('OK: canon validation passed');
  return 0;
}

process.exit(main());
