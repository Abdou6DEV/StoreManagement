-- Mobile-only pairing records. customer_id remains the licensing UUID tenant key;
-- the mobile project intentionally has no foreign key into the licensing project.
CREATE TABLE public.mobile_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  device_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  platform text NOT NULL,
  credential_hash text NOT NULL UNIQUE,
  paired_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz
);

CREATE INDEX mobile_devices_customer_active_idx
  ON public.mobile_devices (customer_id, active);

CREATE TABLE public.mobile_pairing_tokens (
  token_hash text PRIMARY KEY,
  customer_id uuid NOT NULL,
  requesting_desktop_device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX mobile_pairing_tokens_expiry_idx
  ON public.mobile_pairing_tokens (expires_at)
  WHERE used_at IS NULL;

-- All access is server-side through mobile Edge Functions using service_role.
ALTER TABLE public.mobile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_pairing_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mobile_devices FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mobile_pairing_tokens FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mobile_devices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mobile_pairing_tokens TO service_role;
