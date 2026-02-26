# Majestic GS1 Registry

Authoritative signal cache for UPC company prefix → publisher mapping.

**Never overwrite entries.** Use `valid_from` / `valid_to` for historical changes.

**Resolve using longest known prefix match** — prefixes are variable length (6–12 digits).

## Three-layer identity

- `company_name` = GS1 legal truth (registrant)
- `brand_name` = collector-visible truth (e.g. Criterion when prefix owned by Voyager)
- `publisher_id` = Majestic canonical identity

## File format

Each file: `{company_prefix}.json`

```json
{
  "company_prefix": "0715515",
  "company_name": "The Voyager Company",
  "brand_name": "The Criterion Collection",
  "publisher_id": "criterion",
  "verified": true,
  "gs1_status": "active",
  "source": "gs1",
  "first_seen": "2026-02-26T00:00:00Z",
  "valid_from": "1990",
  "valid_to": null
}
```

- `valid_to: null` = current (prefix not reassigned)
- `valid_to: "2030"` = retired (prefix reassigned) — **resolver MUST skip** these entries (historical cutoff)
- `gs1_status` optional = `"active"` | `"inactive"` — GS1 maintenance status. **Inactive does NOT mean retired.** Inactive = registrant no longer maintains the record; barcodes are still legitimate. Both active and inactive are `verified: true`. Only unknown prefixes are `verified: false`. `gs1_status` is informational and should be returned + displayed in UI.
- `publisher_id` optional = prefix known but not yet mapped (confidence: known_prefix)
