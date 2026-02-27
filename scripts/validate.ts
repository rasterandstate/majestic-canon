#!/usr/bin/env npx tsx
/**
 * Canon integrity validation. Run before build (canon-tools will invoke this).
 * Exits 0 on success, 1 on failure.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const VALID_ROLES = new Set(['feature', 'feature_sd_copy', 'bonus', 'soundtrack', 'unknown']);
const HEX64 = /^[a-fA-F0-9]{64}$/;

function validateEdition(file: string, edition: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const discs = edition.discs as Array<Record<string, unknown>> | undefined;
  const discStructures = edition.disc_structures as Record<string, { slot?: number; role?: string }> | undefined;

  if (Array.isArray(discs)) {
    const slots = new Set<number>();
    for (let i = 0; i < discs.length; i++) {
      const d = discs[i];
      const slot = typeof d?.slot === 'number' ? d.slot : i + 1;
      if (slots.has(slot)) {
        errors.push(`${file}: duplicate slot ${slot} in discs`);
      }
      slots.add(slot);
      const role = (d?.role ?? 'unknown').toString().trim().toLowerCase();
      if (!VALID_ROLES.has(role)) {
        errors.push(`${file}: disc ${i + 1} has invalid role "${d?.role}"`);
      }
      const variant = d?.variant as { duplicate_of_disc?: number | null } | undefined;
      if (variant != null && typeof variant === 'object' && variant.duplicate_of_disc != null) {
        const dup = variant.duplicate_of_disc;
        if (typeof dup !== 'number' || dup < 1) {
          errors.push(`${file}: disc ${i + 1} variant.duplicate_of_disc must be positive integer`);
        } else if (dup === slot) {
          errors.push(`${file}: disc ${i + 1} variant.duplicate_of_disc cannot reference self`);
        } else if (dup > discs.length) {
          errors.push(`${file}: disc ${i + 1} variant.duplicate_of_disc ${dup} exceeds edition disc count ${discs.length}`);
        }
      }
      const surfaces = d?.surfaces as Array<{ side?: string }> | undefined;
      if (Array.isArray(surfaces) && surfaces.length > 0) {
        const fmt = (d?.format ?? '').toString().toUpperCase();
        if (fmt !== 'DVD') {
          errors.push(`${file}: disc ${i + 1} surfaces only allowed when format=DVD, got ${fmt}`);
        }
        const sides = new Set<string>();
        for (const s of surfaces) {
          const side = (s?.side ?? '').toString().trim().toUpperCase();
          if (side !== 'A' && side !== 'B') {
            errors.push(`${file}: disc ${i + 1} surface side must be A or B, got "${s?.side}"`);
          } else if (sides.has(side)) {
            errors.push(`${file}: disc ${i + 1} duplicate surface side ${side}`);
          } else {
            sides.add(side);
          }
        }
        if (surfaces.length > 2) {
          errors.push(`${file}: disc ${i + 1} surfaces max 2, got ${surfaces.length}`);
        }
        // Invariant: when surfaces exist, disc-level disc_identity must be null (identity lives at surface level)
        if (d?.disc_identity != null && typeof (d.disc_identity as object) === 'object') {
          const di = d.disc_identity as Record<string, unknown>;
          if (di.structural_hash != null || di.cas_hash != null || (di as { casie_hash?: unknown }).casie_hash != null) {
            errors.push(`${file}: disc ${i + 1} has surfaces but also disc-level disc_identity; identity must live at surface level only`);
          }
        }
      }
    }
  }

  if (discStructures != null && typeof discStructures === 'object') {
    const slotToHash = new Map<number, string>();
    const discCount = Array.isArray(discs) ? discs.length : 0;
    for (const [hash, mapping] of Object.entries(discStructures)) {
      if (!HEX64.test(hash)) {
        errors.push(`${file}: disc_structures key must be 64-char sha256 hex, got "${hash.slice(0, 16)}..."`);
      }
      if (mapping == null || typeof mapping !== 'object') continue;
      const slot = mapping.slot;
      if (typeof slot !== 'number' || slot < 1) {
        errors.push(`${file}: disc_structures["${hash.slice(0, 12)}..."] has invalid slot`);
      } else if (slot > discCount) {
        errors.push(`${file}: disc_structures maps to slot ${slot} but edition has only ${discCount} disc(s)`);
      } else {
        const existing = slotToHash.get(slot);
        if (existing) {
          errors.push(`${file}: two structural hashes map to same slot ${slot}`);
        } else {
          slotToHash.set(slot, hash);
        }
      }
      const role = (mapping.role ?? 'unknown').toString().trim().toLowerCase();
      if (!VALID_ROLES.has(role)) {
        errors.push(`${file}: disc_structures["${hash.slice(0, 12)}..."] has invalid role "${mapping.role}"`);
      }
    }
  }

  return errors;
}

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

  // 3. Validate editions: no duplicate slots, valid roles, disc_structures rules
  const editionsDir = join(ROOT, 'editions');
  if (existsSync(editionsDir)) {
    const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = readFileSync(join(editionsDir, file), 'utf-8');
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const errs = validateEdition(file, item as Record<string, unknown>);
          for (const e of errs) {
            console.error('FAIL:', e);
            failed = true;
          }
        }
      } catch (e) {
        console.error('FAIL:', file, ':', e);
        failed = true;
      }
    }
  }

  if (failed) return 1;
  console.log('OK: canon validation passed');
  return 0;
}

process.exit(main());
