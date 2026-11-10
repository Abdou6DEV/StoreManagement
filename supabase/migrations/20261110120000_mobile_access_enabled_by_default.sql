ALTER TABLE public.customer_mobile_settings
  ALTER COLUMN mobile_enabled SET DEFAULT true,
  ALTER COLUMN mobile_device_limit SET DEFAULT 1;

UPDATE public.customer_mobile_settings
SET mobile_enabled = true,
    mobile_device_limit = 1,
    updated_at = now()
WHERE mobile_enabled IS FALSE
  AND mobile_device_limit = 0;