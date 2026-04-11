-- Parse revenue_potential string into a numeric upper bound in USD/month,
-- exposed as a generated column for sort and filter.
--
-- The revenue_potential field is free-form text from the LLM scraper:
--   "$500-2k/mo", "$10k-50k/mo", "$1k-5k/mo", "$10k-100k/mo", "unknown", NULL
--
-- We parse the UPPER bound (the number after the dash) and coerce k/m
-- suffixes to dollars per month. NULL for "unknown" or unparseable values,
-- which sort and filter clients must handle as NULLS LAST.
--
-- Why a generated column:
--   - Centralizes the parse logic in one place (not scattered across queries).
--   - STORED means the regex runs once per insert/update, not per query.
--   - Lets us build a partial index for fast sort and filter on active ideas.
--
-- Why an immutable SQL function:
--   - Generated columns require immutable expressions only.
--   - SQL functions can be inlined by the planner (unlike PLPGSQL).
--   - Reusable if we ever need the parse logic elsewhere (e.g., admin views).

-- ---------- Parser function ----------

CREATE OR REPLACE FUNCTION parse_revenue_upper_usd(revenue text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN revenue IS NULL OR revenue = 'unknown' THEN NULL
    WHEN (regexp_match(revenue, '-\$?([0-9]+\.?[0-9]*)([km]?)/'))[1] IS NULL THEN NULL
    ELSE (
      (regexp_match(revenue, '-\$?([0-9]+\.?[0-9]*)([km]?)/'))[1]::numeric
      * CASE lower((regexp_match(revenue, '-\$?([0-9]+\.?[0-9]*)([km]?)/'))[2])
          WHEN 'k' THEN 1000
          WHEN 'm' THEN 1000000
          ELSE 1
        END
    )::integer
  END;
$$;

COMMENT ON FUNCTION parse_revenue_upper_usd(text) IS
  'Parses the upper bound of a free-form revenue range like "$10k-50k/mo" into USD/month. Returns NULL for "unknown" or unparseable input. Used by the revenue_upper_usd generated column on ideas and by any future revenue-tier queries.';

-- ---------- Generated column ----------

ALTER TABLE ideas
ADD COLUMN revenue_upper_usd integer
GENERATED ALWAYS AS (parse_revenue_upper_usd(revenue_potential)) STORED;

COMMENT ON COLUMN ideas.revenue_upper_usd IS
  'Parsed upper bound of revenue_potential in USD/month. Generated from the free-form range string at insert/update time. NULL for "unknown" or unparseable values. Sort and filter should treat NULLs as least-preferred (NULLS LAST).';

-- ---------- Partial index for sort and filter performance ----------
-- Only active ideas are queried from the public browse, so the index is
-- scoped accordingly. NULLS LAST matches the query plan's ORDER BY clause
-- so the index is fully usable for the "Highest revenue" sort.

CREATE INDEX idx_ideas_revenue_upper_usd_active
  ON ideas (revenue_upper_usd DESC NULLS LAST, id DESC)
  WHERE status = 'active';
