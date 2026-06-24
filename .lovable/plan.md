## Export schema SQL + table CSVs to /mnt/documents

### 1. Schema SQL (`/mnt/documents/exports/schema.sql`)
Assemble from live database introspection via `supabase--read_query`:
- All `public` tables with columns, types, defaults, NOT NULL, PKs, FKs, unique constraints, check constraints
- All indexes (`pg_indexes`)
- All custom types/enums (e.g. `app_role`)
- All functions (already known: `has_role`, `admin_*`, `handle_new_user`, triggers helpers, etc.) via `pg_get_functiondef`
- All triggers via `pg_get_triggerdef`
- All RLS policies via `pg_policies` (rendered as `CREATE POLICY ...`)
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for each RLS-enabled table
- All grants on public tables to `anon` / `authenticated` / `service_role` from `information_schema.role_table_grants`

Output is a single re-runnable `schema.sql` ordered: extensions → enums → functions → tables → indexes → triggers → RLS enable → policies → grants.

### 2. CSV exports (`/mnt/documents/exports/<table>.csv`)
One file per table, full contents, UTF-8 with BOM (for Hebrew in Excel):
- `profiles.csv`
- `clues.csv`
- `game_progress.csv`
- `user_roles.csv`
- `clue_ratings.csv`
- `challenges.csv`
- `feedback.csv`
- `puzzle_submissions.csv`
- `hint_usage.csv`
- `app_settings.csv`

Generated via `psql COPY ... TO STDOUT WITH CSV HEADER` (managed PG env is available).

### Deliverables
Each file emitted as a `<presentation-artifact>` for download. No app code changes — read-only export.

### Notes
- `auth.*` and `storage.*` schemas are managed by the platform and excluded.
- Service-role key / DB password are not exposed; this is the most complete export available on Lovable Cloud.