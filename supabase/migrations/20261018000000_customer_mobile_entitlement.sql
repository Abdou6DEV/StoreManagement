-- Add mobile entitlements to the licensing source of truth.
-- Existing customers remain opted out until explicitly enabled by an admin.
CREATE TABLE public.customer_mobile_settings (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id),
  mobile_enabled boolean NOT NULL DEFAULT false,
  mobile_device_limit integer NOT NULL DEFAULT 0
    CHECK (mobile_device_limit >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- This table is server-only. Licensing Edge Functions use the service role.
ALTER TABLE public.customer_mobile_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_mobile_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.customer_mobile_settings TO service_role;