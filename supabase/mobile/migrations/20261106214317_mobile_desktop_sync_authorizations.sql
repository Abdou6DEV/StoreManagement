CREATE TABLE public.mobile_desktop_sync_authorizations (
	desktop_device_id text PRIMARY KEY
		CHECK (char_length(btrim(desktop_device_id)) BETWEEN 1 AND 256),
	customer_id uuid NOT NULL,
	is_active boolean NOT NULL DEFAULT true,
	updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mobile_desktop_sync_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_desktop_sync_authorizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mobile_desktop_sync_authorizations TO service_role;

INSERT INTO public.mobile_desktop_sync_authorizations (
	desktop_device_id,
	customer_id,
	is_active
)
SELECT
	btrim(paired_by_desktop_device_id),
	(array_agg(DISTINCT customer_id))[1],
	true
FROM public.mobile_devices
WHERE NULLIF(btrim(paired_by_desktop_device_id), '') IS NOT NULL
	AND active = true
	AND revoked_at IS NULL
GROUP BY btrim(paired_by_desktop_device_id)
HAVING count(DISTINCT customer_id) = 1
ON CONFLICT (desktop_device_id) DO NOTHING;
