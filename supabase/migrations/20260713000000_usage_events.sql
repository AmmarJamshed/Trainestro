-- Anonymized search/click analytics for Trainestro (no PII)
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('search', 'filter', 'click', 'enroll')),
  country_code text NULL,
  query_text text NULL,
  category text NULL,
  delivery_mode text NULL,
  training_id uuid NULL,
  training_slug text NULL,
  device_class text NULL CHECK (device_class IS NULL OR device_class IN ('mobile', 'tablet', 'desktop', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON public.usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_event_type_idx ON public.usage_events (event_type);
CREATE INDEX IF NOT EXISTS usage_events_country_idx ON public.usage_events (country_code);
CREATE INDEX IF NOT EXISTS usage_events_category_idx ON public.usage_events (category);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_usage_events" ON public.usage_events;
CREATE POLICY "anon_insert_usage_events"
  ON public.usage_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('search', 'filter', 'click', 'enroll')
    AND (query_text IS NULL OR char_length(query_text) <= 120)
    AND (training_slug IS NULL OR char_length(training_slug) <= 200)
    AND (category IS NULL OR char_length(category) <= 80)
    AND (country_code IS NULL OR char_length(country_code) <= 8)
    AND (delivery_mode IS NULL OR char_length(delivery_mode) <= 32)
    AND (device_class IS NULL OR device_class IN ('mobile', 'tablet', 'desktop', 'unknown'))
  );

DROP POLICY IF EXISTS "deny_select_usage_events" ON public.usage_events;
CREATE POLICY "deny_select_usage_events"
  ON public.usage_events
  FOR SELECT
  TO anon, authenticated
  USING (false);

GRANT INSERT ON public.usage_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_events TO service_role;
