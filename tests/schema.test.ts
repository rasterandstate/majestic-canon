import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

describe('canon schema', () => {
  it('schema.json exists and is valid', () => {
    const path = join(ROOT, 'schema', 'schema.json');
    expect(existsSync(path)).toBe(true);
    const raw = readFileSync(path, 'utf-8');
    const schema = JSON.parse(raw);
    expect(schema).toHaveProperty('version');
    expect(typeof schema.version).toBe('number');
    expect(schema).toHaveProperty('identityContract');
    expect(schema.identityContract).toHaveProperty('editionHashVersion');
    expect(schema.identityContract).toHaveProperty('editionHashAlgorithm');
  });

  it('override precedence is defined', () => {
    const path = join(ROOT, 'schema', 'schema.json');
    const schema = JSON.parse(readFileSync(path, 'utf-8'));
    expect(schema.overridePrecedence).toBeInstanceOf(Array);
    expect(schema.overridePrecedence.length).toBeGreaterThan(0);
  });

  it('editions directory exists', () => {
    expect(existsSync(join(ROOT, 'editions'))).toBe(true);
  });

  it('migrations directory exists', () => {
    expect(existsSync(join(ROOT, 'migrations'))).toBe(true);
  });
});
