ALTER TABLE public.mobile_pairing_tokens
  ADD COLUMN device_name text NOT NULL DEFAULT 'Mobile phone';

CREATE OR REPLACE FUNCTION public.consume_mobile_pairing_token(
  p_token_hash text,
  p_customer_id uuid,
  p_device_name text,
  p_platform text,
  p_credential_hash text,
  p_device_id uuid,
  p_desktop_device_id text,
  p_device_limit integer
)
RETURNS TABLE (created_device_id uuid, error_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_token public.mobile_pairing_tokens%ROWTYPE;
  v_count integer;
BEGIN
  IF p_device_limit < 1 THEN
    RETURN QUERY SELECT NULL::uuid, 'mobile_disabled'::text;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text, 0));

  SELECT * INTO v_token
  FROM public.mobile_pairing_tokens t
  WHERE t.token_hash = p_token_hash
    AND t.customer_id = p_customer_id
    AND t.requesting_desktop_device_id = p_desktop_device_id
    AND t.used_at IS NULL
    AND t.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'invalid_or_expired_token'::text;
    RETURN;
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.mobile_devices d
  WHERE d.customer_id = p_customer_id
    AND d.active = true
    AND d.revoked_at IS NULL;

  IF v_count >= p_device_limit THEN
    RETURN QUERY SELECT NULL::uuid, 'device_limit_reached'::text;
    RETURN;
  END IF;

  UPDATE public.mobile_pairing_tokens
  SET used_at = now()
  WHERE token_hash = p_token_hash;

  INSERT INTO public.mobile_devices (
    customer_id,
    device_id,
    device_name,
    platform,
    credential_hash,
    paired_by_desktop_device_id
  ) VALUES (
    p_customer_id,
    p_device_id,
    v_token.device_name,
    p_platform,
    p_credential_hash,
    p_desktop_device_id
  );

  RETURN QUERY SELECT p_device_id, NULL::text;
END;
$function$;
