CREATE OR REPLACE FUNCTION public.mobile_sessions_revoke_prior_per_device()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.mobile_sessions
  SET revoked_at = now()
  WHERE mobile_device_id = NEW.mobile_device_id
    AND revoked_at IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mobile_sessions_revoke_prior_per_device
BEFORE INSERT ON public.mobile_sessions
FOR EACH ROW
EXECUTE FUNCTION public.mobile_sessions_revoke_prior_per_device();