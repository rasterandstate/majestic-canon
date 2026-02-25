# Canon Migrations

Schema migration scripts. Run by canon-tools before pack generation.

## Naming

`NNN_description/` — e.g. `001_add_publisher_tier/`

## Execution Order

Migrations run in lexicographic order. Each migration must be idempotent.

## Current

- No migrations yet. Schema v1 is initial.
